
import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { Search, Volume2, Trash2, Plus, Sparkles, Image, Calendar, AlertCircle, Languages, X, Layers, MessageSquareQuote } from 'lucide-react';

interface WordListProps {
  words: Word[];
  onDelete: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onAdd: (english: string, turkish: string, example: string, turkish_sentence: string) => Promise<boolean>;
  onOpenUpload: () => void;
}

const WordList: React.FC<WordListProps> = ({ words, onDelete, onDeleteByDate, onAdd, onOpenUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const [newEng, setNewEng] = useState('');
  const [newTr, setNewTr] = useState('');
  const [newEx, setNewEx] = useState('');
  const [newTrEx, setNewTrEx] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Çevirisi açık olan cümlenin ID'si
  const [flippedSentenceId, setFlippedSentenceId] = useState<string | null>(null);

  const filteredWords = words.filter(w =>
    w.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.turkish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedWords = searchTerm ? filteredWords : filteredWords.slice(0, visibleCount);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleSentenceClick = (id: string) => {
    if (flippedSentenceId === id) {
      setFlippedSentenceId(null);
    } else {
      setFlippedSentenceId(id);
      // 3 saniye sonra otomatik kapat
      setTimeout(() => {
        setFlippedSentenceId(prev => prev === id ? null : prev);
      }, 3500);
    }
  };

  const handleForceOpen = () => {
    setIsAdding(true);
    setFormError(null);
    setTimeout(() => {
      const formElement = document.getElementById('add-word-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    const success = await onAdd(newEng, newTr, newEx, newTrEx);
    setIsSubmitting(false);
    if (success) {
      setNewEng(''); setNewTr(''); setNewEx(''); setNewTrEx('');
      setIsAdding(false);
    } else {
      setFormError('Bu kelime zaten listenizde mevcut!');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Tarih Yok';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full" id="word-list-section">
      <button id="force-open-add-word" className="hidden" onClick={handleForceOpen}></button>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={24} />
          <input
            type="text"
            placeholder="Listende hızlıca ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-14 py-5 bg-zinc-900 border border-white/10 rounded-3xl focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800 transition-all text-lg font-bold text-white placeholder:text-slate-500 h-full shadow-lg shadow-black/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); setFormError(null); }}
          className={`flex items-center justify-center gap-2 px-8 py-5 rounded-3xl font-black text-lg transition-all active:scale-95 whitespace-nowrap ${isAdding ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20'}`}
        >
          <Plus size={24} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
          {isAdding ? 'İptal' : 'Hızlı Ekle'}
        </button>
      </div>

      {isAdding && (
        <div id="add-word-form-container">
          <form onSubmit={handleSubmit} className="mb-10 bg-zinc-900 p-10 rounded-[40px] border border-blue-500/20 animate-fadeIn shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-2xl font-black text-white">Yeni Kelime</h4>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Manuel Giriş</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <input required value={newEng} onChange={e => setNewEng(e.target.value)} placeholder="İngilizce Kelime" className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold" />
              <input required value={newTr} onChange={e => setNewTr(e.target.value)} placeholder="Türkçe Karşılığı" className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <input value={newEx} onChange={e => setNewEx(e.target.value)} placeholder="İngilizce Örnek Cümle" className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold" />
              <input value={newTrEx} onChange={e => setNewTrEx(e.target.value)} placeholder="Türkçe Cümle Çevirisi" className="w-full p-5 rounded-2xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold" />
            </div>
            {formError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 animate-shake"><AlertCircle size={20} /> <span className="font-bold text-sm">{formError}</span></div>}
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50">
              {isSubmitting ? 'Kontrol Ediliyor...' : 'Listeye Kaydet'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedWords.map((word) => {
          const dateStr = formatDate(word.created_at);
          const isFlipped = flippedSentenceId === word.id;

          // Eğer cümle kelimenin kendisiyse veya çok kısaysa bozuk sayıp göstermiyoruz
          const hasValidSentence = word.example_sentence &&
            word.example_sentence.trim().length > 3 &&
            word.example_sentence.trim().toLowerCase() !== word.english.trim().toLowerCase();

          return (
            <div key={word.id} className="bg-zinc-900 p-8 rounded-[40px] border-b-4 border-slate-700 hover:border-slate-500 transition-all group relative overflow-hidden flex flex-col h-full items-start text-left">
              {word.set_name && (
                <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase px-4 py-2 rounded-bl-2xl border-l border-b border-blue-500/20 flex items-center gap-1.5 backdrop-blur-sm z-10">
                  <Layers size={12} /> {word.set_name}
                </div>
              )}

              <div className="flex justify-between items-start w-full mb-3 mt-2">
                <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight">{word.english}</h3>
                <button onClick={() => speak(word.english)} className="text-slate-600 hover:text-blue-400 p-2 rounded-xl bg-white/5 transition-all flex-shrink-0 ml-2">
                  <Volume2 size={20} />
                </button>
              </div>
              <p className="text-slate-500 font-bold text-lg mb-6">{word.turkish}</p>

              {hasValidSentence ? (
                <div
                  className="perspective-1000 w-full mb-6 cursor-pointer group/sentence"
                  onClick={() => handleSentenceClick(word.id)}
                >
                  <div className={`relative w-full transition-transform duration-700 transform-style-3d min-h-[110px] ${isFlipped ? 'rotate-y-180' : ''}`}>

                    {/* ÖN YÜZ (EN Cümle) */}
                    <div className="absolute inset-0 backface-hidden bg-black/40 border border-white/5 p-6 rounded-[32px] group-hover/sentence:bg-black/60 transition-colors flex items-center">
                      <p className="text-sm font-bold leading-relaxed text-blue-100 italic relative z-10">
                        "{word.example_sentence}"
                      </p>
                      <div className="absolute bottom-3 right-4 opacity-30 group-hover/sentence:opacity-100 transition-opacity">
                        <Languages size={14} className="text-slate-500" />
                      </div>
                    </div>

                    {/* ARKA YÜZ (TR Çeviri) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 border border-blue-500 p-6 rounded-[32px] flex items-center shadow-lg shadow-blue-900/20">
                      <p className="text-xs font-black leading-relaxed text-white uppercase tracking-wider relative z-10">
                        {word.turkish_sentence || 'Çeviri eklenmemiş'}
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="flex-1 mb-6 w-full"></div>
              )}

              <div className="w-full flex justify-between items-center mt-auto pt-2">
                <button onClick={() => onDeleteByDate(dateStr)} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all group/date">
                  <Calendar size={16} /> <span className="text-[11px] font-black tracking-widest">{dateStr}</span>
                </button>
                <button onClick={() => onDelete(word.id)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!searchTerm && visibleCount < filteredWords.length && (
        <div className="w-full flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-8 py-4 bg-zinc-900 border border-white/10 rounded-full text-slate-400 font-bold hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            Daha Fazla Göster ({filteredWords.length - visibleCount} kaldı)
          </button>
        </div>
      )}
    </div>
  );
};

export default WordList;
