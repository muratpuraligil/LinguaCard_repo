import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Check, Sparkles, Volume2, Languages } from 'lucide-react';

interface FlashcardModeProps {
  words: Word[];
  onExit: () => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ words, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem('lingua_flashcard_index');
    return saved ? Math.min(parseInt(saved), words.length - 1) : 0;
  });
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<LanguageDirection>(() => {
    // Varsayılan olarak TR -> EN (TR_EN)
    return LanguageDirection.TR_EN;
  });
  
  const currentWord = words[currentIndex];

  useEffect(() => {
    localStorage.setItem('lingua_flashcard_index', currentIndex.toString());
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('lingua_flashcard_direction', direction);
    setIsFlipped(false);
  }, [direction]);

  const speak = (text: string, lang: 'en-US' | 'tr-TR' = 'en-US') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
        localStorage.removeItem('lingua_flashcard_index');
        onExit();
    }
  };

  const toggleDirection = () => {
      setDirection(prev => prev === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR);
  };

  if (!currentWord) return null;

  const frontText = direction === LanguageDirection.EN_TR ? currentWord.english : currentWord.turkish;
  const backText = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;
  
  const frontLang = direction === LanguageDirection.EN_TR ? 'en-US' : 'tr-TR';
  const backLang = direction === LanguageDirection.EN_TR ? 'tr-TR' : 'en-US';

  return (
    <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center p-8 relative z-10">
        <button onClick={onExit} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={24} />
        </button>
        <div className="bg-white/5 border border-white/5 px-6 py-3 rounded-full text-white font-black text-xs tracking-widest uppercase">
            {currentIndex + 1} / {words.length}
        </div>
        <button onClick={toggleDirection} className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-500 flex items-center gap-3 px-6 hover:bg-yellow-500/20 transition-all">
            <Languages size={20} />
            <span className="text-[10px] font-black tracking-widest uppercase">{direction.replace('_', ' → ')}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div 
            className="relative w-full max-w-sm aspect-[4/5.5] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* FRONT */}
                <div className="absolute w-full h-full bg-[#0a0a0a] border border-white/5 rounded-[56px] flex flex-col items-center justify-center p-10 backface-hidden shadow-2xl">
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8">
                        {direction === LanguageDirection.EN_TR ? 'İngilizce' : 'Türkçe'}
                    </p>
                    <h2 className="text-5xl font-black text-white text-center leading-tight tracking-tighter mb-12">
                        {frontText}
                    </h2>
                    <button 
                        onClick={(e) => { e.stopPropagation(); speak(frontText, frontLang); }} 
                        className="p-6 bg-white/5 text-slate-400 rounded-3xl hover:text-blue-400 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <Volume2 size={32} />
                    </button>
                    <div className="absolute bottom-12 text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                         Tıklayıp Anlamını Gör
                    </div>
                </div>

                {/* BACK */}
                <div className="absolute w-full h-full bg-yellow-500 rounded-[56px] flex flex-col items-center justify-center p-10 backface-hidden rotate-y-180 shadow-2xl shadow-yellow-500/20">
                    <p className="text-black/30 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Karşılığı</p>
                    <h2 className="text-5xl font-black text-black text-center leading-tight tracking-tighter mb-8">
                        {backText}
                    </h2>
                    
                    <div className="bg-black/10 backdrop-blur-md p-6 rounded-[32px] w-full border border-black/5 mt-4">
                        <p className="text-black text-center font-bold italic text-lg leading-relaxed">
                            "{currentWord.example_sentence}"
                        </p>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); speak(backText, backLang); }} 
                        className="mt-12 p-6 rounded-3xl bg-black text-yellow-500 hover:scale-105 transition-all shadow-xl shadow-black/20"
                    >
                        <Volume2 size={32} />
                    </button>
                </div>

            </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pb-16 pt-4 flex justify-center relative z-10">
          <button 
            onClick={handleNext} 
            className="w-24 h-24 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
          >
              <Check size={44} strokeWidth={4} />
          </button>
      </div>
    </div>
  );
};

export default FlashcardMode;