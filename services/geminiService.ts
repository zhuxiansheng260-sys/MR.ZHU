import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Chapter, Scene, STORY_PROMPT_CONTEXT } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error("Gemini API Key is missing. Please set API_KEY in your Vercel Project Settings or local .env file.");
}

const ai = new GoogleGenAI({ apiKey });

// Define schema for outline generation
const outlineSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      chapterNumber: { type: Type.INTEGER },
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
    },
    required: ["chapterNumber", "title", "summary"],
  },
};

// Define schema for comic script generation
const scriptSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER },
      description: { type: Type.STRING, description: "A detailed visual prompt for an AI image generator describing the scene." },
      text: { type: Type.STRING, description: "The narration or dialogue line." },
      speaker: { type: Type.STRING, description: "Name of the speaker or 'Narrator'." },
    },
    required: ["id", "description", "text", "speaker"],
  },
};

// Helper: Exponential Backoff Retry
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (e: any) {
      const isQuota = e.toString().includes('429') || e.toString().toLowerCase().includes('quota');
      const isServer = e.toString().includes('503') || e.toString().includes('500');
      
      if (attempt < retries && (isQuota || isServer)) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`API Error (Attempt ${attempt + 1}/${retries + 1}): ${e.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw e;
      }
    }
  }
  throw new Error("Max retries reached");
}

export const generateOutline = async (): Promise<Chapter[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${STORY_PROMPT_CONTEXT} \n\n 請列出一個包含 8 個章節的詳細目錄。輸出必須是JSON格式。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: outlineSchema,
        systemInstruction: "You are a best-selling web novel author.",
        temperature: 0.8,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Chapter[];
    }
    throw new Error("No text returned from Gemini");
  });
};

export const generateComicScript = async (chapter: Chapter): Promise<Scene[]> => {
  return withRetry(async () => {
    const prompt = `
      ${STORY_PROMPT_CONTEXT}
      
      當前章節：第${chapter.chapterNumber}章 - ${chapter.title}
      大綱摘要：${chapter.summary}

      任務：請將本章節改編爲“動態漫”的分鏡腳本。
      要求：
      1. 生成 6-8 個關鍵場景（Scene）。
      2. 每個場景包含：
         - description: 用於生成圖片的英文提示詞 (Visual Prompt)，描述畫面細節、光影、人物動作。風格爲：Modern Anime Style, Cinematic Lighting, High Quality。
         - text: 該場景對應的中文對白或旁白（不超過50字）。
         - speaker: 說話的人（如：葉凡、平平、旁白、反派）。
      3. 輸出爲 JSON 格式。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: scriptSchema,
        temperature: 0.7,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as any[];
      return parsed.map(item => ({
        ...item,
        isLoading: true, // Helper for UI state
      }));
    }
    throw new Error("Failed to generate script");
  });
};

export const generateSceneImage = async (prompt: string): Promise<string> => {
  // Using a slightly longer delay for image generation retries as it is resource intensive
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        // No strict schema/mime for image model content generation
      }
    });
    
    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    throw new Error("No image data returned");
  }, 3, 3000);
};

export const generateSceneSpeech = async (text: string, speaker: string): Promise<string> => {
  return withRetry(async () => {
    // Map speakers to voices
    let voiceName = 'Kore'; // Default narrator
    if (speaker.includes('葉凡')) voiceName = 'Fenrir';
    if (speaker.includes('平平') || speaker.includes('安安')) voiceName = 'Puck'; 

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }],
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      return audioData;
    }
    throw new Error("No audio data returned");
  });
};