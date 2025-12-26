import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Volume2, CheckCircle2, XCircle, Eraser, Languages, Eye, Trophy, RotateCcw } from 'lucide-react';
import { wordService, supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface CustomSetStudyModeProps {
  words: Word[];
  onExit: () => void;
}

interface ProgressState {
  input: string;
  status: 'IDLE' | 'CORRECT' | 'WRONG';
}

const CustomSetStudyMode: React.FC<CustomSetStudyModeProps> = ({ words, onExit }) => {
  const setName = words[0]?.set_name || 'default_set';
  const storageKey = `lingua_set_progress_${setName.replace(/\s+/g, '_')}`;

  const [progress, setProgress] = useState<Record<string, ProgressState>>({});
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);
  const [showFinishedModal, setShowFinishedModal] = useState(false);

  // Yükleme
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProgress(parsed);
      } catch (e) {
        console.error("İlerleme yüklenemedi", e);
      }
    } else {
        const initial: Record<string, ProgressState> = {};
        words.forEach(w => {
            initial[w.id] = { input: '', status: 'IDLE' };
        });
        setProgress(initial);
    }
  }, [words, storageKey]);

  // Kaydetme
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [progress, storageKey]);

  // Konfeti Tetikleyici
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

  // Tamamlanma Kontrolü
  const completedCount = Object.values(progress).filter(p => p?.status === 'CORRECT').length;
  const progressPercentage = Math.round((completedCount / words.length) * 100);

  useEffect(() => {
      // Tüm kelimeler tamamlandıysa ve modal henüz açık değilse
      if (words.length > 0 && completedCount === words.length) {
          if (!showFinishedModal) {
              setShowFinishedModal(true);
              triggerSuccessConfetti();
          }
      }
  }, [completedCount, words.length, showFinishedModal]);

  const handleInputChange = (id: string, value: string) => {
    setProgress(prev => ({
        ...prev,
        [id]: { ...prev[id], input: value, status: 'IDLE' }
    }));
  };

  const clearLine = (id: string) => {
    setProgress(prev => ({
        ...prev,
        [id]: { input: '', status: 'IDLE' }
    }));
  };

  const checkAnswer = (id: string, targetText: string) => {
    const currentInput = progress[id]?.input || '';
    const normalize = (str: string) => str.toLowerCase().replace(/[.,!?;:"]/g, '').trim();
    const isCorrect = normalize(currentInput) === normalize(targetText);

    setProgress(prev => ({
        ...prev,
        [id]: { 
            ...prev[id], 
            status: isCorrect ? 'CORRECT' : 'WRONG' 
        }
    }));

    if (isCorrect) {
        speak(targetText);
    }
  };

  const revealAnswerInInput = (id: string, correctText: string) => {
    setProgress(prev => ({
        ...prev,
        [id]: { 
            input: correctText, 
            status: 'CORRECT' 
        }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, targetText: string) => {
      if (e.key === 'Enter') {
          checkAnswer(id, targetText);
      }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = direction === LanguageDirection.TR_EN ? 'en-US' : 'tr-TR'; 
    u.rate = 0.8; 
    window.speechSynthesis.speak(u);
  };

  // Manuel Sıfırlama (Buton için - Onay ister)
  const handleManualReset = () => {
      if (confirm('Bu set için tüm ilerlemen silinecek. Emin misin?')) {
          performReset();
      }
  };

  // Otomatik Sıfırlama (Modal için - Onay istemez)
  const handleRestart = () => {
      performReset();
  };

  const performReset = () => {
      const resetState: Record<string, ProgressState> = {};
      words.forEach(w => {
          resetState[w.id] = { input: '', status: 'IDLE' };
      });
      // State'i güncelle
      setProgress(resetState);
      // LocalStorage'ı temizle
      localStorage.removeItem(storageKey);
      // Modalı kapat
      setShowFinishedModal(false);
      // En yukarı kaydır
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addWordToLibrary = async (text: string) => {
      if (confirm(`"${text}" kelimesini/ifadesini ana kelime listene eklemek ister misin?`)) {
          try {
              const { data: { session } } = await supabase!.auth.getSession();
              const userId = session?.user?.id;
              await wordService.addWord({
                  english: text, 
                  turkish: '?', 
                  example_sentence: '',
                  turkish_sentence: ''
              }, userId);
              alert('Kelime listene eklendi!');
          } catch (e) {
              console.error(e);
              alert('Hata oluştu.');
          }
      }
  };

  const handlePromptDoubleClick = () => {
      const selection = window.getSelection()?.toString().trim();
      if (!selection || selection.length < 2) return;
      addWordToLibrary(selection);
  };

  const handleInputDoubleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const selectedText = input.value.substring(start, end).trim();
      if (selectedText && selectedText.length > 1) {
          addWordToLibrary(selectedText);
      }
  };

  if (showFinishedModal) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans'] relative overflow-hidden z-[100]">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
            
            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-blue-500/20 p-10 rounded-[48px] text-center shadow-2xl animate-float">
                <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Trophy size={48} className="text-blue-500" strokeWidth={2} />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Set Tamamlandı!</h2>
                <p className="text-slate-400 font-medium text-lg mb-10 leading-relaxed">
                    <span className="text-blue-400 font-bold">{setName}</span> setindeki tüm cümleleri başarıyla çalıştın.
                </p>

                <div className="space-y-4">
                    <button 
                        onClick={handleRestart}
                        className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                    >
                        <RotateCcw size={20} />
                        Sıfırla ve Tekrar Et
                    </button>
                    
                    <button 
                        onClick={onExit}
                        className="w-full py-5 bg-zinc-800 text-slate-300 rounded-2xl font-black text-lg hover:bg-zinc-700 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/5"
                    >
                        <ArrowLeft size={20} />
                        Listeye Dön
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // Genişlik Ayarı: max-w-6xl ile sınırlandı, yatay scroll kaldırıldı
  const containerClass = "w-full max-w-6xl px-4 md:px-8 mx-auto flex flex-col items-center";
  
  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10 p-4 shadow-2xl">
          <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all border border-white/5 flex-shrink-0">
                    <ArrowLeft size={20} className="text-slate-400" />
                </button>
                <div className="flex-1 overflow-hidden">
                    <h1 className="text-xl font-black text-white leading-tight whitespace-nowrap">{setName}</h1>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        <span>{completedCount} / {words.length} Tamamlandı</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                    onClick={() => setDirection(prev => prev === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all font-bold text-xs uppercase tracking-widest whitespace-nowrap"
                >
                    <Languages size={18} />
                    {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
                </button>

                <button 
                    onClick={handleManualReset}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    title="İlerlemeyi Sıfırla"
                >
                    <Eraser size={20} />
                </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full max-w-6xl mx-auto mt-6 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_#3b82f6]" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
          </div>
      </div>

      {/* List Content */}
      <div className="flex-1 p-4 md:p-8">
          <div className={containerClass}>
            <div className="w-full space-y-4">
              {words.map((word, index) => {
                  const state = progress[word.id] || { input: '', status: 'IDLE' };
                  const isCorrect = state.status === 'CORRECT';
                  const isWrong = state.status === 'WRONG';
                  
                  let promptText = '';
                  let targetText = '';

                  if (direction === LanguageDirection.TR_EN) {
                      promptText = word.turkish_sentence || word.turkish;
                      targetText = word.example_sentence || word.english;
                  } else {
                      promptText = word.example_sentence || word.english;
                      targetText = word.turkish_sentence || word.turkish;
                  }

                  return (
                      <div 
                        key={word.id} 
                        className={`group relative flex flex-col md:flex-row items-stretch bg-zinc-900 rounded-[24px] border-2 transition-all w-full
                            ${isCorrect ? 'border-emerald-500/30 bg-emerald-900/10' : isWrong ? 'border-red-500/30' : 'border-zinc-800 focus-within:border-blue-500/50'}
                        `}
                      >
                          {/* Sol: Prompt (Soru) - Soru etiketi kaldırıldı, numara eklendi */}
                          <div 
                            className="flex-1 p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/5 bg-white/5 md:bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center"
                            onDoubleClick={handlePromptDoubleClick}
                            title="Listene eklemek için çift tıkla"
                          >
                              <div className="w-full">
                                  <p className="text-lg md:text-xl font-bold text-slate-200 leading-snug selection:bg-blue-500 selection:text-white break-words">
                                      <span className="text-slate-500 mr-3 select-none">{index + 1}.</span>
                                      {promptText}
                                  </p>
                              </div>
                          </div>

                          {/* Sağ: Input (Cevap) */}
                          <div className="flex-1 p-4 md:p-5 flex items-center justify-center">
                              <div className="w-full flex items-center gap-3">
                                  <div className="relative flex-1">
                                      <input 
                                        type="text"
                                        value={state.input}
                                        onChange={(e) => handleInputChange(word.id, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, word.id, targetText)}
                                        onDoubleClick={handleInputDoubleClick}
                                        placeholder={direction === LanguageDirection.TR_EN ? "İngilizce çevirisi..." : "Türkçe çevirisi..."}
                                        disabled={isCorrect} 
                                        className={`w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-4 text-base md:text-lg font-bold outline-none transition-all placeholder:text-zinc-600 shadow-inner
                                            ${isCorrect ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : 'text-white focus:border-blue-500 focus:bg-zinc-700'}
                                            ${isWrong ? 'text-red-400 border-red-500/50' : ''}
                                        `}
                                      />
                                      {/* Buton Grubu */}
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                           {isWrong && !isCorrect && (
                                                <button 
                                                    onClick={() => revealAnswerInInput(word.id, targetText)}
                                                    className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"
                                                    title="Cevabı Göster (Tamamlandı Sayılır)"
                                                    tabIndex={-1}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}

                                          {isCorrect && <CheckCircle2 className="text-emerald-500 pointer-events-none" size={20} />}
                                          
                                          {isWrong && (
                                            <button 
                                                onClick={() => clearLine(word.id)}
                                                className="text-red-500 hover:scale-110 transition-transform hover:text-red-400"
                                                title="Temizle"
                                                tabIndex={-1}
                                            >
                                                <XCircle size={20} />
                                            </button>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <button 
                                      onClick={() => speak(direction === LanguageDirection.TR_EN ? targetText : promptText)} 
                                      className="p-4 bg-zinc-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex-shrink-0 border border-white/5 shadow-lg"
                                      tabIndex={-1}
                                      title="Telaffuz"
                                  >
                                      <Volume2 size={20} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  );
              })}
            </div>
          </div>
          <div className="h-20"></div>
      </div>
    </div>
  );
};

export default CustomSetStudyMode;