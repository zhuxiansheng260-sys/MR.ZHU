import React from 'react';
import { Chapter } from '../types';

interface ChapterListProps {
  chapters: Chapter[];
  onChapterSelect: (chapter: Chapter) => void;
  currentChapterId?: number;
}

export const ChapterList: React.FC<ChapterListProps> = ({ chapters, onChapterSelect, currentChapterId }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-fade-in-up pb-12">
      <h2 className="text-xl md:text-2xl font-serif-sc font-bold text-amber-500 mb-6 border-b border-slate-700 pb-2 px-2">
        章節目錄
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {chapters.map((chapter) => (
          <div 
            key={chapter.chapterNumber}
            onClick={() => onChapterSelect(chapter)}
            className={`
              p-5 rounded-xl border cursor-pointer transition-all duration-300 group active:scale-[0.98]
              ${currentChapterId === chapter.chapterNumber 
                ? 'bg-amber-900/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              }
            `}
          >
            <div className="flex justify