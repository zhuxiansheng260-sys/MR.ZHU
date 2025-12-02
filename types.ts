export interface Chapter {
  chapterNumber: number;
  title: string;
  summary: string;
}

export interface Scene {
  id: number;
  description: string; // Visual description for image gen
  text: string;        // Subtitle text
  speaker: string;     // 'Narrator' or Character Name
  imageUrl?: string;   // Base64 image
  audioData?: string;  // Base64 audio PCM
  isLoading: boolean;
}

export interface GeneratedContent {
  text: string;
  isStreaming: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING_OUTLINE = 'GENERATING_OUTLINE',
  OUTLINE_READY = 'OUTLINE_READY',
  PLAYING = 'PLAYING', // Changed from READING
  ERROR = 'ERROR'
}

export const STORY_PROMPT_CONTEXT = `
現在，假設你是頂級網絡爽文作家，請寫一篇現代都市修仙文。
文字的風格參考：“明明他是位面至尊強者 卻讓女兒流落街頭賣花賺錢補貼家用 當他得知這一切時恨不得抽死自己。直到兩個女兒站在面前哭著說爸爸 你終於回來了的時候 3,000年來 不管多苦多難都沒流過淚的先尊再也止不住的淚流滿面”。
設定是男主（葉凡）爲了修煉離開地球很久（3000年，但在地球只過了5年），回來卻發現自己多了兩個雙胞胎女兒（平平和安安），而且淪落街頭，妻子失蹤/被迫害。
男主是“北冥仙尊”，擁有無上法力。
故事主調：復仇、護娃、扮豬吃老虎、打臉豪門反派。
`;