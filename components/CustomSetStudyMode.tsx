import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Volume2, CheckCircle2, XCircle, Eraser, Languages, Eye } from 'lucide-react';
import { wordService, supabase } from '../services/supabaseClient';

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

  // State: Her kelimenin ID'sine göre input ve durumunu tutar
  const [progress, setProgress] = useState<Record<string, ProgressState>>({});
  // Dil Yönü: Varsayılan TR -> EN (Türkçe Cümle Gör -> İngilizce Yaz)
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);

  // Yükleme: Component açıldığında LocalStorage'dan veriyi çek
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error("İlerleme yüklenemedi", e);
      }
    } else {
        // İlk defa açılıyorsa boş state başlat
        const initial: Record<string, ProgressState> = {};
        words.forEach(w => {
            initial[w.id] = { input: '', status: 'IDLE' };
        });
        setProgress(initial);
    }
  }, [words, storageKey]);

  // Kaydetme: Progress değiştiğinde LocalStorage'a yaz
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [progress, storageKey]);

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
    
    // Basit normalizasyon: Noktalama işaretlerini kaldır, lowercase yap, boşlukları kırp
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
        // Doğruysa otomatik telaffuz et
        speak(targetText);
    }
  };

  // Cevabı direkt input içine yazar
  const revealAnswerInInput = (id: string, correctText: string) => {
    setProgress(prev => ({
        ...prev,
        [id]: { 
            input: correctText, 
            status: 'IDLE' // IDLE yapıyoruz ki kullanıcı enter'a basıp kontrol edebilsin veya düzenlesin
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
    // Dil ayarı
    u.lang = direction === LanguageDirection.TR_EN ? 'en-US' : 'tr-TR'; 
    // Hız ayarı: 0.8 (Biraz daha yavaş)
    u.rate = 0.8; 
    window.speechSynthesis.speak(u);
  };

  const resetProgress = () => {
      if (confirm('Bu set için tüm ilerlemen silinecek. Emin misin?')) {
          const resetState: Record<string, ProgressState> = {};
          words.forEach(w => {
              resetState[w.id] = { input: '', status: 'IDLE' };
          });
          setProgress(resetState);
          localStorage.removeItem(storageKey);
      }
  };

  // Ortak kelime ekleme mantığı
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
              
              alert('Kelime listene eklendi! Detaylarını ana sayfadan düzenleyebilirsin.');
          } catch (e) {
              console.error(e);
              alert('Kelime eklenirken bir hata oluştu.');
          }
      }
  };

  // Sol taraftaki metin (div) için çift tıklama
  const handlePromptDoubleClick = () => {
      const selection = window.getSelection()?.toString().trim();
      if (!selection || selection.length < 2) return;
      addWordToLibrary(selection);
  };

  // Sağ taraftaki input için çift tıklama
  const handleInputDoubleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const selectedText = input.value.substring(start, end).trim();

      if (selectedText && selectedText.length > 1) {
          addWordToLibrary(selectedText);
      }
  };

  // İlerleme yüzdesi
  const completedCount = Object.values(progress).filter(p => p?.status === 'CORRECT').length;
  const progressPercentage = Math.round((completedCount / words.length) * 100);

  // Dinamik genişlik stili (Header, Progress ve Liste için ortak)
  // w-fit: İçeriğe göre genişle (en geniş çocuğa göre)
  // min-w: Çok kısa cümlelerde bile belli bir genişlikte dur.
  // max-w: Ekran dışına taşma.
  const containerWidthClass = "w-[95%] md:w-fit md:min-w-[800px] md:max-w-[98vw] mx-auto";

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10 p-4 shadow-2xl">
          <div className={`${containerWidthClass} flex flex-col md:flex-row justify-between items-center gap-4`}>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all border border-white/5 flex-shrink-0">
                    <ArrowLeft size={20} className="text-slate-400" />
                </button>
                <div className="flex-1 md:flex-none overflow-hidden">
                    <h1 className="text-xl font-black text-white truncate">{setName}</h1>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>{completedCount} / {words.length} Tamamlandı</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                 {/* Dil Değiştirme Switch */}
                <button 
                    onClick={() => setDirection(prev => prev === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all font-bold text-xs uppercase tracking-widest whitespace-nowrap"
                >
                    <Languages size={18} />
                    {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
                </button>

                <button 
                    onClick={resetProgress}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    title="İlerlemeyi Sıfırla"
                >
                    <Eraser size={20} />
                </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className={`${containerWidthClass} mt-6 h-1 bg-zinc-800 rounded-full overflow-hidden`}>
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
          </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 overflow-x-hidden">
          {/* Container genişliği dinamik hale getirildi */}
          <div className={`${containerWidthClass} space-y-3`}>
              {words.map((word, index) => {
                  const state = progress[word.id] || { input: '', status: 'IDLE' };
                  const isCorrect = state.status === 'CORRECT';
                  const isWrong = state.status === 'WRONG';
                  
                  // Yöne göre Prompt ve Target belirleme
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
                        className={`group relative flex flex-col md:flex-row gap-0 md:gap-4 bg-zinc-900 rounded-[20px] border-2 transition-all items-stretch ${isCorrect ? 'border-emerald-500/30 bg-emerald-900/10' : isWrong ? 'border-red-500/30' : 'border-zinc-800 focus-within:border-blue-500/50'}`}
                      >
                          {/* Sol: Prompt (Soru) */}
                          <div 
                            className="flex-1 p-4 md:p-5 flex items-center border-b md:border-b-0 md:border-r border-white/5 bg-white/5 md:bg-transparent cursor-pointer hover:bg-white/5 transition-colors min-h-[60px]"
                            onDoubleClick={handlePromptDoubleClick}
                            title="Listene eklemek için kelimeye çift tıkla"
                          >
                              <p className="text-base md:text-lg font-bold text-slate-200 leading-relaxed selection:bg-blue-500 selection:text-white">
                                  <span className="text-slate-500 font-black mr-3 select-none">{index + 1}.</span>
                                  {promptText}
                              </p>
                          </div>

                          {/* Sağ: Input (Cevap) */}
                          <div className="flex-1 p-3 md:p-4 flex flex-col justify-center min-h-[60px]">
                              <div className="flex items-center gap-3">
                                  <div className="relative flex-1 min-w-[200px]">
                                      <input 
                                        type="text"
                                        value={state.input}
                                        onChange={(e) => handleInputChange(word.id, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, word.id, targetText)}
                                        onDoubleClick={handleInputDoubleClick}
                                        placeholder={direction === LanguageDirection.TR_EN ? "İngilizce çevirisi..." : "Türkçe çevirisi..."}
                                        disabled={isCorrect} 
                                        className={`w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-base font-bold outline-none transition-all placeholder:text-zinc-600 shadow-inner
                                            ${isCorrect ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : 'text-white focus:border-blue-500 focus:bg-zinc-700'}
                                            ${isWrong ? 'text-red-400 border-red-500/50' : ''}
                                        `}
                                        title="Listene eklemek için kelimeyi seç ve çift tıkla"
                                      />
                                      {/* Durum İkonu */}
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                           {/* Cevabı Göster Butonu - Input içinde sağ tarafta */}
                                           {isWrong && !isCorrect && (
                                                <button 
                                                    onClick={() => revealAnswerInInput(word.id, targetText)}
                                                    className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"
                                                    title="Cevabı Göster"
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
                                  
                                  {/* Dinleme Butonu */}
                                  <button 
                                      onClick={() => speak(direction === LanguageDirection.TR_EN ? targetText : promptText)} 
                                      className="p-3 bg-zinc-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex-shrink-0 border border-white/5"
                                      tabIndex={-1}
                                      title="Telaffuz"
                                  >
                                      <Volume2 size={18} />
                                  </button>
                              </div>
                              
                              {/* Mobil Kontrol Butonu */}
                              {!isCorrect && (
                                <div className="mt-2 md:hidden">
                                    <button 
                                        onClick={() => checkAnswer(word.id, targetText)}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs"
                                    >
                                        Kontrol
                                    </button>
                                </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
          
          <div className="h-20"></div> {/* Bottom spacer */}
      </div>
    </div>
  );
};

export default CustomSetStudyMode;