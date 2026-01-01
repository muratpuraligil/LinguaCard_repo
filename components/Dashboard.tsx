
import React from 'react';
import { Word, AppMode } from '../types';
import WordList from './WordList';
import { BookOpen, Puzzle, Sparkles, Plus, LogOut, Download, Image, Book, Layers } from 'lucide-react';

interface DashboardProps {
  userEmail?: string;
  words: Word[];
  onModeSelect: (mode: AppMode) => void;
  onAddWord: (english: string, turkish: string, example: string) => Promise<boolean>;
  onDeleteWord: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onLogout: () => void;
  onOpenUpload: () => void;
  onQuickAdd: () => void;
  onExcelUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onQuickAdd,
  onExcelUpload
}) => {
  const exportToCSV = () => {
    if (words.length === 0) return;
    const headers = "İngilizce Kelime;Türkçe Karşılığı;Örnek Cümle;Türkçe Cümle\n";
    const rows = words.map(w => {
        const safe = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
        return `${safe(w.english)};${safe(w.turkish)};${safe(w.example_sentence)};${safe(w.turkish_sentence)}`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lingua_kelimeler_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // İstatistikleri Ayrıştır
  const vocabWords = words.filter(w => !w.set_name); // Normal kelimeler
  const setCards = words.filter(w => w.set_name);    // Cümle setlerine ait kartlar

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex justify-center">
      <div className="w-full max-w-6xl bg-black min-h-screen border-x border-white/5 relative">
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-5 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 animate-float">
              <BookOpen size={32} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter leading-none">
                Lingua<span className="text-blue-500">Card</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 pl-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <p className="text-slate-500 text-[11px] font-extrabold tracking-[0.25em] uppercase">Kelime Öğren</p>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95">
              <LogOut size={20} />
          </button>
        </div>

        <div className="px-8 my-6">
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-10 rounded-[48px] border border-blue-500/30 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[80px]"></div>
              <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-3 tracking-tight">Hadi Pratik Yapalım!</h2>
                  <p className="text-blue-100 font-medium text-lg flex flex-wrap items-center gap-2">
                      Kütüphanende
                      <span className="text-yellow-400 font-black text-2xl bg-yellow-400/10 px-2 rounded-lg border border-yellow-400/20">{vocabWords.length}</span>
                      kelime ve
                      <span className="text-purple-300 font-black text-2xl bg-purple-400/10 px-2 rounded-lg border border-purple-400/20">{setCards.length}</span>
                      cümle kartı var.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                      <button onClick={onOpenUpload} className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl">
                          <Image size={22}/> Resim ile Yükle
                      </button>
                      <button onClick={onQuickAdd} className="bg-blue-600/30 text-blue-100 hover:bg-blue-600 hover:text-white border border-blue-400/30 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95">
                          <Plus size={22}/> Hızlı Ekle
                      </button>
                  </div>
              </div>
              
              <div className="absolute right-12 bottom-12 text-yellow-400/20 w-40 h-40 flex items-center justify-center animate-pulse -rotate-12">
                  <Book size={140} strokeWidth={1} />
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 mb-16">
          <button onClick={() => onModeSelect(AppMode.FLASHCARDS)} className="bg-zinc-900 p-8 rounded-[40px] border-b-4 border-yellow-500 hover:border-yellow-400 transition-all text-left group">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 text-yellow-500 group-hover:scale-110 transition-all"><BookOpen size={32}/></div>
            <h3 className="text-2xl font-black mb-3">Kartlar</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-bold">Hafızanı tazelemek için klasik kart çevirme metodu.</p>
          </button>
          <button onClick={() => onModeSelect(AppMode.QUIZ)} className="bg-zinc-900 p-8 rounded-[40px] border-b-4 border-emerald-500 hover:border-emerald-400 transition-all text-left group">
            <div className="bg-emerald-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 text-emerald-500 group-hover:scale-110 transition-all"><Puzzle size={32}/></div>
            <h3 className="text-2xl font-black mb-3">Test Çöz</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-bold">Bilgini test et ve en yüksek puanı topla.</p>
          </button>
          <button onClick={() => onModeSelect(AppMode.SENTENCES)} className="bg-zinc-900 p-8 rounded-[40px] border-b-4 border-purple-500 hover:border-purple-400 transition-all text-left group">
            <div className="bg-purple-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 text-purple-500 group-hover:scale-110 transition-all"><Sparkles size={32}/></div>
            <h3 className="text-2xl font-black mb-3">Cümleler</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-bold">Kelimeleri cümle içinde kullanarak seviye atla.</p>
          </button>
        </div>

        <div className="px-8 pb-20">
          <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-3xl font-black">Kelime Listem</h3>
              <div className="flex items-center gap-4">
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all">
                      <Download size={18} />
                      <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Excel İndir</span>
                  </button>
                  <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl uppercase tracking-widest">
                      Toplam {words.length}
                  </span>
              </div>
          </div>
          <WordList words={words} onDelete={onDeleteWord} onDeleteByDate={onDeleteByDate} onAdd={onAddWord} onOpenUpload={onOpenUpload} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
