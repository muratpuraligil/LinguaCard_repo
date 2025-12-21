import React, { useState } from 'react';
import { Word } from '../types';
import { Search, Volume2, Trash2, Plus, Sparkles, Image, Calendar } from 'lucide-react';

interface WordListProps {
  words: Word[];
  onDelete: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onAdd: (english: string, turkish: string, example: string) => void;
  onOpenUpload: () => void;
}

const WordList: React.FC<WordListProps> = ({ words, onDelete, onDeleteByDate, onAdd, onOpenUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEng, setNewEng] = useState('');
  const [newTr, setNewTr] = useState('');
  const [newEx, setNewEx] = useState('');

  const filteredWords = words.filter(w => 
    w.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.turkish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newEng, newTr, newEx);
    setNewEng('');
    setNewTr('');
    setNewEx('');
    setIsAdding(false);
  };

  // Tarih formatlamak için yardımcı fonksiyon
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Tarih Yok';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full" id="word-list-section">
      {/* Search and Quick Add Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={24} />
          <input 
            type="text" 
            placeholder="Listende hızlıca ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-[#0a0a0a] border border-white/5 rounded-3xl focus:outline-none focus:border-blue-500/50 transition-all text-lg font-medium text-white placeholder:text-slate-700 h-full"
          />
        </div>
        <button 
          id="quick-add-btn"
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center justify-center gap-2 px-8 py-5 rounded-3xl font-black text-lg transition-all active:scale-95 whitespace-nowrap ${isAdding ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20'}`}
        >
          <Plus size={24} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
          {isAdding ? 'İptal' : 'Hızlı Ekle'}
        </button>
      </div>

      {isAdding && (
          <form onSubmit={handleSubmit} className="mb-10 bg-zinc-900 p-10 rounded-[40px] border border-blue-500/20 animate-fadeIn shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                  <h4 className="text-2xl font-black text-white">Yeni Kelime</h4>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Manuel Giriş</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <input 
                    required 
                    value={newEng} 
                    onChange={e=>setNewEng(e.target.value)} 
                    placeholder="İngilizce Kelime" 
                    className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Lütfen bu alanı doldurun.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
                  <input 
                    required 
                    value={newTr} 
                    onChange={e=>setNewTr(e.target.value)} 
                    placeholder="Türkçe Karşılığı" 
                    className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Lütfen bu alanı doldurun.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
              </div>
              <input value={newEx} onChange={e=>setNewEx(e.target.value)} placeholder="Örnek Cümle (Opsiyonel)" className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold mb-8"/>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95">
                  Listeye Kaydet
              </button>
          </form>
      )}

      {/* Word Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWords.map((word) => {
            const dateStr = formatDate(word.created_at);
            return (
              <div key={word.id} className="bg-zinc-900 p-8 rounded-[40px] border-b-4 border-slate-700 hover:border-slate-500 transition-all group relative overflow-hidden flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{word.english}</h3>
                    <button onClick={() => speak(word.english)} className="text-slate-600 hover:text-blue-400 p-2 rounded-xl bg-white/5 transition-all">
                        <Volume2 size={20} />
                    </button>
                </div>
                
                <p className="text-slate-500 font-bold text-lg mb-6">{word.turkish}</p>
                
                {word.example_sentence && (
                    <div className="bg-black/30 p-5 rounded-2xl border border-white/5 mb-8 flex-1">
                        <p className="text-sm text-slate-400 font-medium italic leading-relaxed">"{word.example_sentence}"</p>
                    </div>
                )}
                
                {!word.example_sentence && <div className="flex-1 mb-8"></div>}

                {/* Bottom Actions: Date & Delete */}
                <div className="absolute bottom-6 right-6 flex items-center gap-2">
                    {/* Date Badge / Bulk Delete Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteByDate(dateStr); }}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all group/date"
                        title={`${dateStr} tarihindeki tüm kelimeleri sil`}
                    >
                        <Calendar size={14} className="group-hover/date:text-red-400" />
                        <span className="text-[10px] font-black tracking-widest">{dateStr}</span>
                    </button>

                    {/* Single Delete Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(word.id); }}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                      title="Sadece bu kelimeyi sil"
                    >
                      <Trash2 size={20} />
                    </button>
                </div>
              </div>
            );
        })}
      </div>

      {/* Empty States */}
      {words.length === 0 && !isAdding && (
          <div className="w-full py-24 bg-zinc-900 rounded-[48px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
              <div className="bg-white/5 p-6 rounded-3xl mb-6">
                 <Sparkles className="text-slate-500" size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-6">Henüz kelime yok.</h3>
              
              <div className="flex flex-col md:flex-row gap-4">
                  <button 
                    onClick={onOpenUpload}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                      <Image size={20} />
                      Resim ile Yükle
                  </button>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 border border-white/5"
                  >
                      <Plus size={20} />
                      Hızlı Ekle
                  </button>
              </div>
          </div>
      )}

      {words.length > 0 && filteredWords.length === 0 && (
          <div className="col-span-full py-20 bg-zinc-900 rounded-[40px] border border-white/5 flex flex-col items-center justify-center">
              <p className="text-slate-700 font-black text-xl mb-2">Aradığın kelime bulunamadı.</p>
              <button onClick={() => setSearchTerm('')} className="text-blue-500 text-sm font-bold hover:underline">Aramayı Temizle</button>
          </div>
      )}
    </div>
  );
};

export default WordList;