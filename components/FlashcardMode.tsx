import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Check, Volume2, Languages, MousePointerClick, RotateCcw, Trophy, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [isFinished, setIsFinished] = useState(false);
  const [direction, setDirection] = useState<LanguageDirection>(() => {
    // Varsayılan olarak TR -> EN (TR_EN)
    return LanguageDirection.TR_EN;
  });
  
  const currentWord = words[currentIndex];

  useEffect(() => {
    if (!isFinished) {
        localStorage.setItem('lingua_flashcard_index', currentIndex.toString());
        setIsFlipped(false);
    }
  }, [currentIndex, isFinished]);

  useEffect(() => {
    localStorage.setItem('lingua_flashcard_direction', direction);
    setIsFlipped(false);
  }, [direction]);

  // Konfeti Efekti
  const triggerSuccessConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#eab308', '#ffffff'] // Mavi, Sarı, Beyaz
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3b82f6', '#eab308', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

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
        setIsFinished(true);
        triggerSuccessConfetti();
    }
  };

  const handleRestart = () => {
      setIsFinished(false);
      setCurrentIndex(0);
      setIsFlipped(false);
  };

  const toggleDirection = () => {
      setDirection(prev => prev === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR);
  };

  // --- BİTİŞ EKRANI ---
  if (isFinished) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
            {/* Arka plan efekti */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-black to-black"></div>
            
            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-yellow-500/20 p-10 rounded-[48px] text-center shadow-2xl animate-float">
                <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                    <Trophy size={48} className="text-yellow-500" strokeWidth={2} />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Harika İş!</h2>
                <p className="text-slate-400 font-medium text-lg mb-10 leading-relaxed">
                    Bu seti başarıyla tamamladın.<br/>
                    <span className="text-yellow-500 font-bold">{words.length} kelimeyi</span> gözden geçirdin.
                </p>

                <div className="space-y-4">
                    <button 
                        onClick={handleRestart}
                        className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-yellow-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                    >
                        <RotateCcw size={20} />
                        Tekrar Et
                    </button>
                    
                    <button 
                        onClick={onExit}
                        className="w-full py-5 bg-zinc-800 text-slate-300 rounded-2xl font-black text-lg hover:bg-zinc-700 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/5"
                    >
                        <Home size={20} />
                        Ana Menüye Dön
                    </button>
                </div>
            </div>
        </div>
      );
  }

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
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative z-10">
        <div 
            className="relative w-full max-w-sm aspect-[4/6] perspective-1000 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* FRONT CARD */}
                <div className="absolute w-full h-full bg-zinc-900 border-2 border-zinc-700 rounded-[56px] flex flex-col items-center justify-center p-6 backface-hidden shadow-2xl group-hover:border-blue-500/50 transition-colors">
                    
                    {/* TOP LABEL (Absolute) */}
                    <div className="absolute top-12 left-0 w-full flex justify-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] bg-black/20 px-4 py-2 rounded-full">
                            {direction === LanguageDirection.EN_TR ? 'İngilizce' : 'Türkçe'}
                        </p>
                    </div>

                    {/* MAIN WORD (Center) */}
                    {/* Padding ekleyerek uzun kelimelerin üst/alt öğelere çarpmasını engelliyoruz */}
                    <div className="w-full flex items-center justify-center py-20">
                        <h2 className="text-4xl md:text-5xl font-black text-white text-center leading-tight tracking-tighter drop-shadow-lg break-words px-4">
                            {frontText}
                        </h2>
                    </div>
                    
                    {/* BOTTOM ACTIONS (Absolute) */}
                    <div className="absolute bottom-10 left-0 w-full flex flex-col items-center gap-6">
                        <button 
                            onClick={(e) => { e.stopPropagation(); speak(frontText, frontLang); }} 
                            className="p-5 bg-black/30 text-slate-300 rounded-3xl hover:text-blue-400 hover:bg-black/50 transition-all active:scale-90"
                        >
                            <Volume2 size={28} />
                        </button>
                        
                        <div className="px-6 py-3 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                             <MousePointerClick size={16} className="text-blue-400" />
                             <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Tıklayıp Çevir</span>
                        </div>
                    </div>
                </div>

                {/* BACK CARD */}
                <div className="absolute w-full h-full bg-yellow-500 rounded-[56px] flex flex-col items-center justify-center p-6 backface-hidden rotate-y-180 shadow-2xl shadow-yellow-500/20 border-4 border-yellow-400">
                    
                    {/* TOP LABEL (Absolute - Same Position) */}
                    <div className="absolute top-12 left-0 w-full flex justify-center">
                        <p className="text-black/40 text-[10px] font-black uppercase tracking-[0.3em] bg-black/5 px-4 py-2 rounded-full">
                            Karşılığı
                        </p>
                    </div>

                    {/* MAIN WORD (Center - Same Position) */}
                    <div className="w-full flex items-center justify-center py-20">
                        <h2 className="text-4xl md:text-5xl font-black text-black text-center leading-tight tracking-tighter break-words px-4">
                            {backText}
                        </h2>
                    </div>
                    
                    {/* BOTTOM CONTENT (Absolute - Same Start Position) */}
                    <div className="absolute bottom-10 left-0 w-full flex flex-col items-center px-6">
                        
                        {/* Example Sentence Box */}
                        <div className="bg-black/10 backdrop-blur-md p-5 rounded-[28px] w-full border border-black/5 mb-6">
                            <p className="text-black text-center font-bold italic text-base md:text-lg leading-relaxed line-clamp-3">
                                "{currentWord.example_sentence}"
                            </p>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); speak(backText, backLang); }} 
                            className="p-5 rounded-3xl bg-black text-yellow-500 hover:scale-105 transition-all shadow-xl shadow-black/20"
                        >
                            <Volume2 size={28} />
                        </button>
                    </div>
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