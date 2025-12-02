import React, { useState, useCallback } from 'react';
import { generateOutline, generateComicScript } from './services/geminiService';
import { Chapter, AppState, Scene } from './types';
import { ChapterList } from './components/ChapterList';
import { ComicPlayer } from './components/ComicPlayer';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentScenes, setCurrentScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string | null>(null);

  const novelTitle = "都市修仙：女兒賣花，仙尊歸來";
  const novelSubtitle = "動態漫劇 • AI 實時演繹";

  const handleStart = async () => {
    setAppState(AppState.GENERATING_OUTLINE);
    setError(null);
    try {
      const outline = await generateOutline();
      setChapters(outline);
      setAppState(AppState.OUTLINE_READY);
    } catch (e) {
      console.error(e);
      setError("生成目錄失敗，請檢查API Key設置或稍後再試。");
      setAppState(AppState.IDLE);
    }
  };

  const handleSelectChapter = useCallback(async (chapter: Chapter) => {
    setCurrentChapter(chapter);
    setAppState(AppState.PLAYING);
    setCurrentScenes([]);
    setError(null);
    
    try {
      const script = await generateComicScript(chapter);
      setCurrentScenes(script);
    } catch (e) {
      console.error(e);
      setError("劇本生成失敗");
      setAppState(AppState.OUTLINE_READY);
    }
  }, []);

  const handleNextChapter = useCallback(() => {
    if (!currentChapter) return;
    const nextIdx = chapters.findIndex(c => c.chapterNumber === currentChapter.chapterNumber) + 1;
    if (nextIdx < chapters.length) {
      handleSelectChapter(chapters[nextIdx]);
    }
  }, [currentChapter, chapters, handleSelectChapter]);

  const handleBackToOutline = () => {
    setAppState(AppState.OUTLINE_READY);
    setCurrentChapter(null);
    setCurrentScenes([]);
  };

  // --- Views ---

  // 1. Landing View
  if (appState === AppState.IDLE || appState === AppState.GENERATING_OUTLINE) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-900">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[80px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-900/20 blur-[80px]"></div>
        </div>

        <div className="relative z-10 text-center w-full max-w-md md:max-w-2xl space-y-8 flex flex-col items-center animate-fade-in">
          {/* Cover Art - Responsive Size */}
          <div className="w-40 h-60 md:w-56 md:h-80 bg-gradient-to-br from-slate-800 to-slate-700 shadow-2xl rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden relative group transform transition-all hover:scale-105">
             <img 
               src="https://picsum.photos/300/450?grayscale" 
               alt="Book Cover" 
               className="object-cover w-full h-full opacity-60" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
             <div className="absolute bottom-4 left-0 right-0 text-amber-500 font-serif-sc font-bold text-xl md:text-2xl tracking-widest px-2">
               動態漫
             </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-6xl font-serif-sc font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 drop-shadow-sm leading-tight">
              {novelTitle}
            </h1>
            <p className="text-slate-400 text-sm md:text-xl font-light tracking-wide">
              {novelSubtitle}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 text-red-400 text-sm p-4 rounded-lg border border-red-800 w-full">
              {error}
            </div>
          )}

          <div className="w-full flex justify-center pt-4">
            <Button 
              onClick={handleStart} 
              isLoading={appState === AppState.GENERATING_OUTLINE}
              className="text-lg px-12 py-4 w-full md:w-auto shadow-amber-900/40"
            >
              {appState === AppState.GENERATING_OUTLINE ? '正在構建世界觀...' : '開始閱讀'}
            </Button>
          </div>
          
          <p className="text-[10px] text-slate-600">
            Powered by Gemini 2.5 (Flash, Image, TTS)
          </p>
        </div>
      </div>
    );
  }

  // 2. Outline View
  if (appState === AppState.OUTLINE_READY) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 md:p-12 pb-20">
        <div className="max-w-4xl mx-auto mb-8 text-center pt-8 md:pt-0">
           <h1 className="text-2xl md:text-3xl font-serif-sc font-bold text-slate-200 mb-2">{novelTitle}</h1>
           <p className="text-slate-500 text-sm">點擊章節開始播放</p>
        </div>
        <ChapterList 
          chapters={chapters} 
          onChapterSelect={handleSelectChapter} 
        />
      </div>
    );
  }

  // 3. Comic Player View
  if (appState === AppState.PLAYING && currentChapter) {
    if (currentScenes.length > 0) {
      return (
        <ComicPlayer
          chapter={currentChapter}
          initialScenes={currentScenes}
          onBack={handleBackToOutline}
          onNextChapter={handleNextChapter}
        />
      );
    } else {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-6 p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                <div className="text-center space-y-2">
                    <p className="text-amber-500 font-serif-sc text-lg animate-pulse">正在生成分鏡腳本...</p>
                    <p className="text-slate-600 text-xs">AI 正在編寫第 {currentChapter.chapterNumber} 章的劇情</p>
                </div>
            </div>
        )
    }
  }

  return <div>Loading...</div>;
};

export default App;