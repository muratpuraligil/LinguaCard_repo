
import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Volume2, Languages, Trophy, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlashcardModeProps {
  words: Word[];
  onExit: () => void;
  onNextSet: () => void;
  onRemoveWord: (id: string) => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ words, onExit, onNextSet, onRemoveWord }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);
  
  const currentWord = words && words.length > 0 ? words[currentIndex] : null;

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const triggerSuccessConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
        setIsFinished(true);
        triggerSuccessConfetti();
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentWord) return;
      onRemoveWord(currentWord.id);
      handleNext();
  };

  const speak = (e: React.MouseEvent, text: string, lang: 'en-US' | 'tr-TR') => {
      e.stopPropagation();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
  };

  if (isFinished) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-['Plus_Jakarta_Sans']">
            <Trophy size={80} className="text-yellow-500 mb-8 animate-bounce" />
            <h2 className="text-4xl font-black mb-4">Harika Bir Set!</h2>
            <p className="text-slate-500 mb-10 font-bold">Bu gruptaki tüm kelimeleri inceledin.</p>
            <div className="space-y-4 w-full max-w-xs">
                <button onClick={() => { setIsFinished(false); setCurrentIndex(0); onNextSet(); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Sıradaki Set</button>
                <button onClick={onExit} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-lg border border-white/5 active:scale-95 transition-all">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  if (!currentWord) return null;

  const isFrontTR = direction === LanguageDirection.TR_EN;
  const frontWord = isFrontTR ? currentWord.turkish : currentWord.english;
  const backWord = isFrontTR ? currentWord.english : currentWord.turkish;
  const frontSentence = isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence;
  const backSentence = isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence;

  return (
    <div className="min-h-screen bg-black flex flex-col text-white font-['Plus_Jakarta_Sans']">
      {/* Top Header */}
      <div className="flex justify-between items-center p-6 md:px-10 md:py-8 relative z-50">
        <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg"><ArrowLeft size={20} /></button>
        <div className="flex flex-col items-center">
            <button 
                onClick={() => setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR)} 
                className="bg-zinc-900 border border-white/10 px-5 py-2 rounded-full text-slate-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:text-white transition-all mb-2 shadow-xl"
            >
                <Languages size={14}/> {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
            </button>
            <div className="bg-zinc-900/50 px-3 py-1 rounded-full font-black text-[10px] text-slate-600 uppercase tracking-widest border border-white/5">{currentIndex + 1} / {words.length}</div>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto relative">
        <div className="w-full aspect-[4/5.8] cursor-pointer perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* ÖN YÜZ */}
                <div className={`absolute inset-0 backface-hidden rounded-[40px] flex flex-col items-center justify-center p-8 shadow-2xl ${isFrontTR ? 'bg-zinc-950 text-white border-2 border-zinc-800' : 'bg-yellow-400 text-black'}`}>
                    <div className={`absolute top-8 left-10 opacity-20 font-black uppercase tracking-[0.3em] text-[10px] ${isFrontTR ? 'text-white' : 'text-black'}`}>{isFrontTR ? 'Turkish' : 'English'}</div>
                    
                    <h2 className="text-3xl md:text-4xl font-black text-center mb-6 tracking-tighter leading-tight">{frontWord}</h2>
                    
                    {frontSentence && (
                        <p className={`text-center text-xs md:text-sm font-bold italic px-4 leading-relaxed opacity-60 mb-6`}>
                            "{frontSentence}"
                        </p>
                    )}

                    <div className="flex flex-col items-center gap-2">
                        <button 
                            onClick={(e) => speak(e, frontWord, isFrontTR ? 'tr-TR' : 'en-US')}
                            className={`p-4 rounded-2xl transition-all active:scale-90 ${isFrontTR ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                        >
                            <Volume2 size={24} />
                        </button>
                        <span className={`text-[9px] font-black uppercase tracking-widest animate-blink ${isFrontTR ? 'text-blue-400' : 'text-black/40'}`}>Çeviri için tıkla!!!</span>
                    </div>

                    <button 
                        onClick={handleArchive}
                        className={`absolute bottom-8 px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isFrontTR ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg' : 'bg-black/10 text-black/50 border border-black/10 hover:bg-black hover:text-white shadow-sm'}`}
                    >
                        <Check size={12} strokeWidth={3} /> Öğrendim
                    </button>
                </div>

                {/* ARKA YÜZ */}
                <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[40px] flex flex-col items-center justify-center p-8 shadow-2xl ${isFrontTR ? 'bg-yellow-400 text-black' : 'bg-zinc-950 text-white border-2 border-zinc-800'}`}>
                    <div className={`absolute top-8 left-10 opacity-20 font-black uppercase tracking-[0.3em] text-[10px] ${isFrontTR ? 'text-black' : 'text-white'}`}>{isFrontTR ? 'English' : 'Turkish'}</div>
                    
                    <h2 className="text-3xl md:text-4xl font-black text-center mb-6 tracking-tighter leading-tight">{backWord}</h2>
                    
                    {backSentence && (
                        <p className={`text-center text-xs md:text-sm font-bold italic px-4 leading-relaxed opacity-60 mb-6`}>
                            "{backSentence}"
                        </p>
                    )}

                    <div className="flex flex-col items-center gap-2">
                        <button 
                            onClick={(e) => speak(e, backWord, isFrontTR ? 'en-US' : 'tr-TR')}
                            className={`p-4 rounded-2xl transition-all active:scale-90 ${isFrontTR ? 'bg-black/5 text-black/40 hover:bg-black/10' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            <Volume2 size={24} />
                        </button>
                        <span className={`text-[9px] font-black uppercase tracking-widest animate-blink ${isFrontTR ? 'text-black/40' : 'text-blue-400'}`}>Kelimeye Dön!!!</span>
                    </div>

                    <button 
                        onClick={handleArchive}
                        className={`absolute bottom-8 px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isFrontTR ? 'bg-black/10 text-black/50 border border-black/10 hover:bg-black hover:text-white shadow-sm' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg'}`}
                    >
                        <Check size={12} strokeWidth={3} /> Öğrendim
                    </button>
                </div>
            </div>
        </div>

        {/* Navigation Controls - Centered and Dynamic */}
        <div className="mt-10 w-full flex justify-center items-center gap-4">
            {currentIndex > 0 ? (
              <>
                <button 
                    onClick={handlePrev} 
                    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-90 shadow-xl"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={handleNext} 
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5 min-w-[140px]"
                >
                    Sıradaki <ChevronRight size={20} />
                </button>
              </>
            ) : (
                <button 
                    onClick={handleNext} 
                    className="w-full max-w-[200px] py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                >
                    Sıradaki <ChevronRight size={20} />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardMode;
