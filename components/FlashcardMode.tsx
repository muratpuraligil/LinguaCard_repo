import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Check, Volume2, Languages, RotateCcw, Trophy, Home, Repeat } from 'lucide-react';
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
    const saved = localStorage.getItem('lingua_flashcard_direction');
    return (saved as LanguageDirection) || LanguageDirection.TR_EN;
  });
  
  // Güvenlik kontrolü
  const currentWord = words && words.length > 0 ? words[currentIndex] : null;

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

  const triggerSuccessConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#eab308', '#ffffff']
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

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const toggleDirection = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setDirection(prev => prev === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR);
  };

  if (!words || words.length === 0) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white font-['Plus_Jakarta_Sans']">
              <p className="text-xl font-bold mb-4">Çalışılacak kelime bulunamadı.</p>
              <button onClick={onExit} className="px-6 py-3 bg-white text-black rounded-xl font-bold">Geri Dön</button>
          </div>
      );
  }

  if (isFinished) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
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

  // 1. Yön Belirleme (EN->TR mi, TR->EN mi?)
  const isEnToTr = direction === LanguageDirection.EN_TR;
  
  // 2. İçerik Objelerini Oluşturma
  // Her iki yüz için de verileri hazırlıyoruz. 'isEnglish' bayrağı stil ve içerik kontrolü sağlar.
  
  const frontContent = {
      isEnglish: isEnToTr, // Eğer EN->TR ise ön yüz İngilizcedir.
      word: isEnToTr ? currentWord.english : currentWord.turkish,
      label: isEnToTr ? 'İngilizce' : 'Türkçe',
      lang: (isEnToTr ? 'en-US' : 'tr-TR') as 'en-US' | 'tr-TR',
      // Cümleler her zaman data objesinde dursun, render ederken isEnglish kontrolü yapacağız.
      exEn: currentWord.example_sentence,
      exTr: currentWord.turkish_sentence
  };

  const backContent = {
      isEnglish: !isEnToTr, // Eğer EN->TR ise arka yüz Türkçedir (yani İngilizce değildir).
      word: isEnToTr ? currentWord.turkish : currentWord.english,
      label: isEnToTr ? 'Türkçe' : 'İngilizce',
      lang: (isEnToTr ? 'tr-TR' : 'en-US') as 'en-US' | 'tr-TR',
      exEn: currentWord.example_sentence,
      exTr: currentWord.turkish_sentence
  };

  // 3. Stil Yardımcı Fonksiyonu
  const getCardStyle = (isEnglish: boolean) => {
      if (isEnglish) {
          // İNGİLİZCE: Sarı Arka Plan, Siyah Metin
          return {
              wrapperClass: "bg-yellow-500 text-black border-[6px] border-yellow-400 shadow-2xl",
              labelBg: "bg-black/10 text-black/60",
              subTextContainer: "bg-black/10 text-black",
              buttonClass: "bg-black text-white hover:scale-110 shadow-lg",
              footerText: "text-black/50"
          };
      } else {
          // TÜRKÇE: Siyah Arka Plan, Beyaz Metin
          return {
              wrapperClass: "bg-zinc-900 text-white border-[6px] border-zinc-700 shadow-2xl",
              labelBg: "bg-white/10 text-slate-400",
              subTextContainer: "hidden", // Türkçe kartta cümle gösterilmeyecek
              buttonClass: "bg-blue-600 text-white hover:scale-110 shadow-lg shadow-blue-600/30",
              footerText: "text-slate-500"
          };
      }
  };

  const frontStyle = getCardStyle(frontContent.isEnglish);
  const backStyle = getCardStyle(backContent.isEnglish);

  // 3D Animasyon Stilleri
  const containerStyle: React.CSSProperties = { perspective: '1000px' };
  const cardInnerStyle: React.CSSProperties = {
      position: 'relative', width: '100%', height: '100%',
      transition: 'transform 0.6s', transformStyle: 'preserve-3d',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };
  const faceStyle: React.CSSProperties = {
      position: 'absolute', width: '100%', height: '100%',
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      borderRadius: '48px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
  };
  const backFaceStyle: React.CSSProperties = { ...faceStyle, transform: 'rotateY(180deg)' };

  return (
    <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden text-white">
      
      {/* Top Navbar */}
      <div className="flex justify-between items-center p-6 relative z-20">
        <button onClick={onExit} className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={24} />
        </button>
        <div className="bg-zinc-900 border border-white/10 px-6 py-3 rounded-full text-white font-black text-xs tracking-widest uppercase">
            {currentIndex + 1} / {words.length}
        </div>
        <button onClick={toggleDirection} className="p-4 bg-zinc-900 border border-white/10 rounded-2xl text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-all flex items-center gap-2">
            <Languages size={20} />
            <span className="text-[10px] font-black hidden sm:inline">{isEnToTr ? 'EN → TR' : 'TR → EN'}</span>
        </button>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-md mx-auto">
        
        <div 
            className="w-full aspect-[4/5] cursor-pointer group"
            style={containerStyle}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div style={cardInnerStyle}>
                
                {/* FRONT FACE */}
                <div style={faceStyle} className={frontStyle.wrapperClass}>
                    <div className={`absolute top-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${frontStyle.labelBg}`}>
                        {frontContent.label}
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center w-full text-center">
                        <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight break-words w-full">
                            {frontContent.word}
                        </h2>
                        
                        {/* İngilizce ise hem EN hem TR cümle göster, Türkçe ise gösterme */}
                        {frontContent.isEnglish && (frontContent.exEn || frontContent.exTr) && (
                             <div className={`p-4 rounded-2xl w-full max-w-[280px] space-y-2 ${frontStyle.subTextContainer}`}>
                                {frontContent.exEn && (
                                    <p className="text-sm md:text-base font-bold italic leading-snug opacity-90">
                                        "{frontContent.exEn}"
                                    </p>
                                )}
                                {frontContent.exTr && (
                                    <p className="text-xs font-bold leading-snug opacity-60 border-t border-black/10 pt-2 uppercase tracking-wide">
                                        {frontContent.exTr}
                                    </p>
                                )}
                             </div>
                        )}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); speak(frontContent.word, frontContent.lang); }}
                        className={`mb-4 p-4 rounded-full transition-transform ${frontStyle.buttonClass}`}
                    >
                        <Volume2 size={24} />
                    </button>
                    
                    <div className={`flex items-center gap-2 opacity-50 text-[10px] font-black uppercase tracking-widest ${frontStyle.footerText}`}>
                        <Repeat size={12} />
                        Çevirmek için tıkla
                    </div>
                </div>

                {/* BACK FACE */}
                <div style={backFaceStyle} className={backStyle.wrapperClass}>
                    <div className={`absolute top-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${backStyle.labelBg}`}>
                        {backContent.label}
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center w-full text-center">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight break-words w-full">
                            {backContent.word}
                        </h2>
                        
                        {/* İngilizce ise hem EN hem TR cümle göster, Türkçe ise gösterme */}
                        {backContent.isEnglish && (backContent.exEn || backContent.exTr) && (
                            <div className={`p-4 rounded-2xl w-full max-w-[280px] space-y-2 ${backStyle.subTextContainer}`}>
                                {backContent.exEn && (
                                    <p className="text-sm md:text-base font-bold italic leading-snug opacity-90">
                                        "{backContent.exEn}"
                                    </p>
                                )}
                                {backContent.exTr && (
                                    <p className="text-xs font-bold leading-snug opacity-60 border-t border-black/10 pt-2 uppercase tracking-wide">
                                        {backContent.exTr}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); speak(backContent.word, backContent.lang); }}
                        className={`mb-4 p-4 rounded-full transition-transform ${backStyle.buttonClass}`}
                    >
                        <Volume2 size={24} />
                    </button>

                    <div className={`flex items-center gap-2 opacity-50 text-[10px] font-black uppercase tracking-widest ${backStyle.footerText}`}>
                        <Repeat size={12} />
                        Geri çevir
                    </div>
                </div>

            </div>
        </div>

      </div>

      {/* Footer Controls */}
      <div className="pb-24 pt-4 flex justify-center gap-6 relative z-20">
          <button 
            onClick={handleNext} 
            className="h-20 px-8 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all font-black text-lg"
          >
              <Check size={28} strokeWidth={4} />
              Sonraki karta geç
          </button>
      </div>
    </div>
  );
};

export default FlashcardMode;