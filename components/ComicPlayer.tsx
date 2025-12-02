import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scene, Chapter } from '../types';
import { generateSceneImage, generateSceneSpeech } from '../services/geminiService';

interface ComicPlayerProps {
  chapter: Chapter;
  initialScenes: Scene[];
  onBack: () => void;
  onNextChapter?: () => void;
}

// Audio Helper: Decode Raw PCM and Play
const playAudio = async (base64Data: string, audioContext: AudioContext): Promise<void> => {
  if (!base64Data) return;
  
  try {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Data = new Int16Array(bytes.buffer);
    const sampleRate = 24000;
    const numChannels = 1;
    const frameCount = int16Data.length;

    const audioBuffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      channelData[i] = int16Data[i] / 32768.0;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (e) {
    console.error("Error playing audio", e);
  }
};

export const ComicPlayer: React.FC<ComicPlayerProps> = ({ chapter, initialScenes, onBack, onNextChapter }) => {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentScene = scenes[currentIndex];

  // Initialize Audio Context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  // Effect: Load CURRENT scene immediately
  useEffect(() => {
    let isMounted = true;

    const fetchCurrent = async () => {
      const scene = scenes[currentIndex];
      if ((!scene.imageUrl || !scene.audioData) && scene.isLoading) {
        try {
            const [imgResult, audioResult] = await Promise.allSettled([
                !scene.imageUrl ? generateSceneImage(scene.description) : Promise.resolve(scene.imageUrl),
                !scene.audioData ? generateSceneSpeech(scene.text, scene.speaker) : Promise.resolve(scene.audioData)
            ]);

            if (!isMounted) return;

            const img = imgResult.status === 'fulfilled' ? imgResult.value : undefined;
            const audio = audioResult.status === 'fulfilled' ? audioResult.value : undefined;

            setScenes(prev => {
                const newScenes = [...prev];
                newScenes[currentIndex] = { 
                    ...newScenes[currentIndex], 
                    imageUrl: img || newScenes[currentIndex].imageUrl, 
                    audioData: audio || newScenes[currentIndex].audioData,
                    isLoading: false 
                };
                return newScenes;
            });
        } catch (e) {
            console.error("Failed to load current scene assets", e);
            if (isMounted) {
                setScenes(prev => {
                    const copy = [...prev];
                    copy[currentIndex].isLoading = false; 
                    return copy;
                });
            }
        }
      }
    };

    fetchCurrent();
    return () => { isMounted = false; };
  }, [currentIndex]);

  // Effect: Pre-load NEXT scene
  useEffect(() => {
    let isMounted = true;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= scenes.length) return;

    const timer = setTimeout(async () => {
        if (!isMounted) return;
        const scene = scenes[nextIndex];
        if (scene.imageUrl && scene.audioData) return;
        
        try {
             let img = scene.imageUrl;
             if (!img) img = await generateSceneImage(scene.description);
             if (!isMounted) return;

             let audio = scene.audioData;
             if (!audio) audio = await generateSceneSpeech(scene.text, scene.speaker);
             if (!isMounted) return;

             setScenes(prev => {
                const newScenes = [...prev];
                newScenes[nextIndex] = { ...newScenes[nextIndex], imageUrl: img, audioData: audio, isLoading: false };
                return newScenes;
            });
        } catch (e) { console.warn("Pre-fetch failed", e); }
    }, 2500);

    return () => { isMounted = false; clearTimeout(timer); };
  }, [currentIndex, scenes.length]);

  // Play audio
  useEffect(() => {
    if (currentScene.audioData && !currentScene.isLoading && audioContextRef.current) {
       playAudio(currentScene.audioData, audioContextRef.current);
    }
  }, [currentIndex, currentScene.audioData, currentScene.isLoading]);

  const handleNext = () => {
    if (currentIndex < scenes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (onNextChapter) {
        onNextChapter();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Touch Handlers
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Bar - Mobile Safe Area */}
      <div className="absolute top-0 left-0 w-full z-20 pt-safe-top p-4 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto text-white/90 hover:text-white flex items-center gap-1 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="font-serif-sc text-sm">目錄</span>
        </button>
        <div className="text-amber-500 font-serif-sc text-xs font-bold tracking-widest bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-amber-900/30">
           第{chapter.chapterNumber}章 • {currentIndex + 1}/{scenes.length}
        </div>
      </div>

      {/* Main Visual Stage */}
      <div className="flex-1 relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
        
        {/* Blurred Background for Vertical Screens */}
        {currentScene.imageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 scale-110"
            style={{ backgroundImage: `url(data:image/png;base64,${currentScene.imageUrl})` }}
          />
        )}

        {currentScene.imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
             {/* Main Image */}
             <img 
              key={currentScene.id} 
              src={`data:image/png;base64,${currentScene.imageUrl}`} 
              alt={currentScene.description}
              className="relative max-h-full w-full object-contain md:object-cover shadow-2xl animate-ken-burns z-10"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 animate-pulse p-8 z-10">
             <div className="w-12 h-12 mb-4 rounded-full border-2 border-slate-600 border-t-amber-500 animate-spin"></div>
             <p className="font-serif-sc tracking-widest text-amber-500/80 text-sm">
                {currentScene.isLoading ? "場景生成中..." : "載入失敗"}
             </p>
          </div>
        )}
        
        {/* Gradient Overlay for Text */}
        <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-20"></div>
      </div>

      {/* Subtitle / Script Area */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-safe-bottom z-30 flex flex-col items-center text-center mb-24 md:mb-12">
        {currentScene.speaker !== 'Narrator' && (
          <div className="mb-3 text-amber-400 font-bold uppercase tracking-wider text-xs bg-black/80 px-4 py-1 rounded-full border border-amber-500/30 shadow-lg transform -translate-y-2">
            {currentScene.speaker}
          </div>
        )}
        <h2 className="text-lg md:text-2xl font-serif-sc font-medium text-slate-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed max-w-lg animate-fade-in-up">
           {currentScene.text}
        </h2>
        <div className="mt-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-light">
           &larr; 滑動翻頁 &rarr;
        </div>
      </div>

      {/* Hidden Mobile Swipe hints or minimal controls if needed, but swipe is main. 
          We keep buttons for desktop/accessibility but style them minimally. */}
      <div className="absolute top-1/2 left-4 z-40 hidden md:block">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 bg-black/20 hover:bg-black/50 rounded-full text-white/50 hover:text-white transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      <div className="absolute top-1/2 right-4 z-40 hidden md:block">
         <button onClick={handleNext} className="p-3 bg-black/20 hover:bg-black/50 rounded-full text-white/50 hover:text-white transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <style>{`
        @keyframes ken-burns {
          0% { transform: scale(1.0); }
          100% { transform: scale(1.05); } 
        }
        .animate-ken-burns {
          animation: ken-burns 15s ease-out forwards;
        }
        .pt-safe-top {
            padding-top: env(safe-area-inset-top, 20px);
        }
        .pb-safe-bottom {
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
};