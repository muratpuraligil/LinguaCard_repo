
import React from 'react';
import { Word, AppMode } from '../types';
import WordList from './WordList';
import GradientText from './GradientText';
import Antigravity from './Antigravity';
import { BookOpen, Puzzle, Sparkles, Plus, LogOut, Download, Image, Book, Archive } from 'lucide-react';

interface DashboardProps {
  userEmail?: string;
  words: Word[];
  onModeSelect: (mode: AppMode) => void;
  onAddWord: (english: string, turkish: string, example: string, turkish_sentence: string) => Promise<boolean>;
  onDeleteWord: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onLogout: () => void;
  onOpenUpload: () => void;
  onQuickAdd: () => void;
  onResetAccount: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userEmail,
  words,
  onModeSelect,
  onAddWord,
  onDeleteWord,
  onDeleteByDate,
  onLogout,
  onOpenUpload,
  onQuickAdd
}) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex justify-center">
      <div className="w-full max-w-6xl bg-black min-h-screen border-x border-white/5 relative">
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-5 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 animate-float">
              <BookOpen size={32} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter leading-none">LinguaCard</h1>
              <p className="text-slate-500 text-[11px] font-extrabold tracking-[0.25em] uppercase mt-1 pl-0.5">Kelime Öğren</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onModeSelect(AppMode.ARCHIVE)}
              className="p-4 bg-zinc-900 text-slate-500 rounded-2xl border border-white/5 hover:bg-zinc-800 hover:text-white transition-all active:scale-95 shadow-md"
              title="Arşiv"
            >
              <Archive size={20} />
            </button>
            <button onClick={onLogout} className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-md">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="px-8 my-6">
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-6 md:p-8 rounded-[32px] border border-blue-500/30 relative overflow-hidden group shadow-2xl">

            {/* Background Effect */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
              <Antigravity
                count={300}
                magnetRadius={6}
                ringRadius={7}
                waveSpeed={0.4}
                waveAmplitude={1}
                particleSize={1.5}
                lerpSpeed={0.25}
                color="#cbd813"
                autoAnimate
                particleVariance={1}
                rotationSpeed={0}
                depthFactor={1}
                pulseSpeed={3}
                particleShape="capsule"
                fieldStrength={10}
              />
            </div>

            <div className="relative z-10">
              <div className="mb-2">
                <GradientText
                  colors={["#f2eee8", "#ffdb9e", "#eed65d", "#ffef42", "#ccaa00"]}
                  animationSpeed={8}
                  showBorder={false}
                  className="text-2xl font-black tracking-tight !m-0 !justify-start"
                >
                  Hadi Pratik Yapalım!
                </GradientText>
              </div>
              <p className="text-blue-200/70 font-medium text-sm mb-6">Kütüphanende aktif <span className="text-yellow-400 font-black text-lg">{words.length}</span> kelime var.</p>
              <div className="flex items-center gap-3">
                <button onClick={onOpenUpload} className="bg-white text-blue-900 hover:bg-blue-50 px-5 py-3 rounded-xl font-black text-xs flex items-center transition-all shadow-lg active:scale-95"><Image size={16} className="mr-2" /> Resim ile Yükle</button>
                <button onClick={onQuickAdd} className="bg-blue-600/30 text-blue-100 hover:bg-blue-600 border border-blue-400/30 px-5 py-3 rounded-xl font-black text-xs flex items-center transition-all active:scale-95"><Plus size={16} className="mr-2" /> Hızlı Ekle</button>
              </div>
            </div>

            {/* Animated Book and Words Text inside the book area */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center group-hover:scale-110 transition-transform duration-700 select-none pointer-events-none">
              <div className="relative flex items-center justify-center">
                <span className="absolute text-[9px] font-black uppercase tracking-[0.4em] text-white z-10 drop-shadow-2xl">words</span>
                <Book size={80} strokeWidth={1} className="text-white/20 animate-pulse -rotate-12" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 mb-10">
          <button onClick={() => onModeSelect(AppMode.FLASHCARDS)} className="bg-zinc-900 p-6 rounded-[32px] border-b-4 border-yellow-500 hover:border-yellow-400 transition-all text-left group shadow-lg">
            <div className="bg-yellow-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-yellow-500 group-hover:scale-110 transition-all"><BookOpen size={24} /></div>
            <h3 className="text-xl font-black mb-2 text-white">Kartlar</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">20 kelimelik setler halinde çalış.</p>
          </button>
          <button onClick={() => onModeSelect(AppMode.QUIZ)} className="bg-zinc-900 p-6 rounded-[32px] border-b-4 border-emerald-500 hover:border-emerald-400 transition-all text-left group shadow-lg">
            <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-all"><Puzzle size={24} /></div>
            <h3 className="text-xl font-black mb-2 text-white">Test Çöz</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">Öğrendiklerini test ederek puan topla.</p>
          </button>
          <button onClick={() => onModeSelect(AppMode.SENTENCES)} className="bg-zinc-900 p-6 rounded-[32px] border-b-4 border-purple-500 hover:border-purple-400 transition-all text-left group shadow-lg">
            <div className="bg-purple-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-all"><Sparkles size={24} /></div>
            <h3 className="text-xl font-black mb-2 text-white">Cümleler</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">Cümle kurma pratiği yap.</p>
          </button>
        </div>

        <div className="px-8 pb-20">
          <WordList words={words} onDelete={onDeleteWord} onDeleteByDate={onDeleteByDate} onAdd={onAddWord} onOpenUpload={onOpenUpload} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
