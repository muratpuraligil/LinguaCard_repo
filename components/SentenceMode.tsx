
import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
// Added Sparkles to the imported icons
import { Check, X, RefreshCw, Type, Languages, ArrowLeft, Volume2, Sparkles } from 'lucide-react';

interface SentenceModeProps {
  words: Word[];
  onExit: () => void;
}

const SentenceMode: React.FC<SentenceModeProps> = ({ words, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
      const saved = localStorage.getItem('lingua_sentence_index');
      return saved ? Math.min(parseInt(saved), words.length - 1) : 0;
  });
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);
  
  const validWords = words.filter(w => w.example_sentence && w.example_sentence.length > 3);
  const currentWord = validWords[currentIndex];

  useEffect(() => {
      localStorage.setItem('lingua_sentence_index', currentIndex.toString());
  }, [currentIndex]);

  const checkAnswer = () => {
    if (!currentWord) return;
    
    // Normalize fonksiyonu: Büyük/küçük harf, tırnak işaretleri ve noktalama işaretlerini temizler.
    const normalize = (str: string) => {
        return str
            .toLowerCase()
            .replace(/["'“”‘’]/g, '') // Tırnak işaretlerini kaldır
            .replace(/[.,!?;:]/g, '')  // Noktalama işaretlerini kaldır
            .replace(/\s+/g, ' ')      // Fazla boşlukları tek boşluğa indir
            .trim();
    };

    const correct = normalize(direction === LanguageDirection.TR_EN ? currentWord.example_sentence : currentWord.turkish_sentence);
    const input = normalize(userInput);

    if (input === correct) setStatus('CORRECT');
    else setStatus('WRONG');
  };

  const handleNext = () => {
    if (currentIndex < validWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setStatus('IDLE');
    } else {
        // Test bittiğinde kayıtlı seti ve indexi temizle
        localStorage.removeItem('lingua_sentence_index');
        localStorage.removeItem('lingua_active_sentence_set');
        onExit();
    }
  };

  const speak = () => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(currentWord.example_sentence);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
  };

  if (!currentWord) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans']">
        <p className="text-slate-500 font-black mb-8">Cümle içeren kelime bulunamadı.</p>
        <button onClick={onExit} className="bg-white text-black px-8 py-4 rounded-2xl font-black">Geri Dön</button>
    </div>
  );

  const promptText = direction === LanguageDirection.TR_EN ? currentWord.turkish_sentence : currentWord.example_sentence;
  const targetText = direction === LanguageDirection.TR_EN ? currentWord.example_sentence : currentWord.turkish_sentence;

  return (
    <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden text-white">
      {/* Background Decor */}
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full"></div>
      
      {/* Header */}
      <div className="p-8 flex justify-between items-center relative z-10">
          <button onClick={onExit} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={24}/>
          </button>
          <button 
            onClick={() => setDirection(d => d === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)} 
            className="bg-purple-500/10 border border-purple-500/20 px-6 py-3 rounded-full text-purple-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:bg-purple-500/20 transition-all"
          >
            <Languages size={16}/> {direction.replace('_', ' → ')}
          </button>
          <span className="bg-white/5 border border-white/5 px-6 py-3 rounded-full text-slate-500 font-black text-[10px] tracking-widest uppercase">
            {currentIndex + 1} / {validWords.length}
          </span>
      </div>

      <div className="flex-1 px-8 flex flex-col justify-center max-w-2xl mx-auto w-full relative z-10">
        <div className="bg-[#0a0a0a] rounded-[56px] p-10 border border-white/5 shadow-2xl mb-8 relative group">
            <div className="absolute top-0 right-0 p-10 opacity-5">
                {/* Fixed: Sparkles is now correctly imported */}
                <Sparkles size={120} className="text-purple-500" />
            </div>
            
            <h3 className="text-purple-500 font-black text-[10px] mb-6 flex items-center gap-3 uppercase tracking-[0.3em]">
                <Type size={16}/> {direction === LanguageDirection.TR_EN ? 'İngilizceye Çevir' : 'Türkçeye Çevir'}
            </h3>
            
            <p className="text-3xl font-black text-white mb-10 leading-snug tracking-tight">"{promptText}"</p>
            
            {direction === LanguageDirection.TR_EN && (
                <button onClick={speak} className="flex items-center gap-3 text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-purple-400 transition-all mb-8">
                    <Volume2 size={20}/> Telaffuzu Dinle
                </button>
            )}

            <textarea 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Çevirini buraya yaz..."
                className="w-full p-8 rounded-[40px] bg-zinc-800 border-2 border-white/5 focus:border-purple-500/50 focus:bg-zinc-700/50 outline-none h-44 resize-none text-xl font-bold transition-all text-white placeholder:text-zinc-500 shadow-inner"
                disabled={status === 'CORRECT'}
            />

            {status === 'WRONG' && (
                <div className="mt-6 p-6 bg-red-500/10 text-red-400 rounded-[32px] border border-red-500/20 animate-shake">
                    <p className="font-black flex items-center gap-3 mb-2 uppercase text-[10px] tracking-widest"><X size={20}/> Hatalı Deneme</p>
                    <p className="text-lg font-bold leading-relaxed">Doğrusu: <span className="text-white">"{targetText}"</span></p>
                </div>
            )}
            {status === 'CORRECT' && (
                <div className="mt-6 p-6 bg-emerald-500/10 text-emerald-400 rounded-[32px] border border-emerald-500/20 animate-bounce">
                    <p className="font-black flex items-center gap-3 uppercase text-[10px] tracking-widest"><Check size={20}/> Mükemmel!</p>
                    <p className="text-lg font-bold">Harika bir çeviri yaptın.</p>
                </div>
            )}
        </div>

        <button 
            onClick={status === 'IDLE' ? checkAnswer : handleNext}
            className={`w-full py-8 rounded-[40px] font-black text-2xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${status === 'IDLE' ? 'bg-purple-600 text-white shadow-purple-600/20' : 'bg-white text-black'}`}
        >
            {status === 'IDLE' ? 'Kontrol Et' : 'Devam Et'}
        </button>
      </div>
      
      <div className="pb-10"></div>
    </div>
  );
};

export default SentenceMode;
