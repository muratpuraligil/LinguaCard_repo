
import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Volume2, CheckCircle2, XCircle, Eraser, Languages, Eye, Trophy, RotateCcw, HelpCircle, Info, Plus, Home } from 'lucide-react';
import { wordService, supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface CustomSetStudyModeProps {
    words: Word[];
    onExit: () => void;
    onGoHome: () => void;
    showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

interface ProgressState {
    input: string;
    status: 'IDLE' | 'CORRECT' | 'WRONG';
}

const CustomSetStudyMode: React.FC<CustomSetStudyModeProps> = ({ words, onExit, onGoHome, showToast }) => {
    const setName = words[0]?.set_name || 'default_set';
    // Key'in benzersiz olmasını sağlamak için set ismini kullanıyoruz.
    // Eğer aynı isimde setler varsa çakışma olabilir, ancak şimdilik isim kullanılıyor.
    const storageKey = `lingua_set_progress_${setName.replace(/\s+/g, '_')}`;

    const [progress, setProgress] = useState<Record<string, ProgressState>>({});

    // YARDIMCI: Dil Tespiti
    const detectLang = (text: string): 'tr' | 'en' | 'unknown' => {
        if (!text) return 'unknown';
        const trChars = /[çğıöşüÇĞİÖŞÜ]/;
        if (trChars.test(text)) return 'tr';
        const enWords = new Set(['the', 'is', 'are', 'a', 'an', 'to', 'in', 'of', 'and', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your']);
        const trWords = new Set(['bir', 'bu', 've', 'ile', 'ne', 'mi', 'mı', 'mu', 'mü', 'o', 'şu', 'biz', 'siz', 'onlar', 'ben', 'sen']);

        const words = text.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);
        if (words.some(w => enWords.has(w))) return 'en';
        if (words.some(w => trWords.has(w))) return 'tr';
        return 'unknown';
    };

    // HEURISTIC: Set'in verisi ters mi (Swapped) kaydedilmiş?
    // Normalde 'turkish' sütununda Türkçe, 'english' sütununda İngilizce olmalı.
    // Ancak bazı setlerde 'turkish' sütununda İngilizce cümleler var. Bunu tespit ediyoruz.
    const isSetDataSwapped = React.useMemo(() => {
        let enCountInTrCol = 0;
        let trCountInTrCol = 0;
        let checkLimit = Math.min(words.length, 10); // İlk 10 kelimeye bakmak yeterli

        for (let i = 0; i < checkLimit; i++) {
            const w = words[i];
            const content = w.turkish_sentence || w.turkish || "";
            const lang = detectLang(content);
            if (lang === 'en') enCountInTrCol++;
            if (lang === 'tr') trCountInTrCol++;
        }
        // Eğer 'turkish' sütununda İngilizce tespiti Türkçeden fazlaysa, veri terstir.
        return enCountInTrCol > trCountInTrCol;
    }, [words]);

    // DÜZELTME: Varsayılan yön TR_EN (Türkçe -> İngilizce) yapıldı.
    const languagePrefKey = `lingua_set_pref_${setName.replace(/\s+/g, '_')}`;
    const [direction, setDirection] = useState<LanguageDirection>(() => {
        const saved = localStorage.getItem(languagePrefKey);
        return (saved as LanguageDirection) || LanguageDirection.TR_EN;
    });

    useEffect(() => {
        localStorage.setItem(languagePrefKey, direction);
    }, [direction, languagePrefKey]);

    const [showFinishedModal, setShowFinishedModal] = useState(false);

    // Custom Modal States
    const [selectionToAdd, setSelectionToAdd] = useState<{ text: string, word: Word } | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

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

    // Yön değiştiğinde inputları temizle (İlerleme sıfırlansın mı? Kullanıcı isteği: eski input kalmasın)
    useEffect(() => {
        // Sadece direction değiştiğinde çalışır, ancak ilk yüklemede değil (çünkü progress boş başlar veya yüklenir)
        // Burada basitçe, mevcut progress'i sıfırlamak yerine inputları temizleyebiliriz.
        // Veya daha radikal: Yön değişince o oturumun "çalışma verisi" değiştiği için resetlemek mantıklıdır.
        if (Object.keys(progress).length > 0) {
            const resetState: Record<string, ProgressState> = {};
            words.forEach(w => {
                resetState[w.id] = { input: '', status: 'IDLE' };
            });
            setProgress(resetState);
            // LocalStorage temizlemeye gerek yok, otomatik kaydolacak veya ayrı key kullanılabilir.
            // Ancak aynı key'e yazıyorsak üstüne yazar.
        }
    }, [direction]);

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

    const completedCount = Object.values(progress).filter((p: ProgressState) => p?.status === 'CORRECT').length;
    const progressPercentage = Math.round((completedCount / words.length) * 100);

    useEffect(() => {
        if (words.length > 0 && completedCount === words.length) {
            if (!showFinishedModal) {
                setShowFinishedModal(true);
                triggerSuccessConfetti();
            }
        }
    }, [completedCount, words.length, showFinishedModal]);

    // Normalizasyon Fonksiyonu
    const normalize = (str: string) => str.toLowerCase().replace(/[.,!?;:"'’`]/g, '').trim();

    // speak fonksiyonu
    const speak = (text: string, lang: 'en-US' | 'tr-TR') => {
        if (!text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.8;
        window.speechSynthesis.speak(u);
    };

    const handleInputChange = (id: string, value: string, targetText: string, currentIndex: number) => {
        // 1. Durumu güncelle
        const isMatch = normalize(value) === normalize(targetText);

        setProgress(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                input: value,
                status: isMatch ? 'CORRECT' : 'IDLE'
            }
        }));

        // 2. Eğer doğruysa otomatik işlemler
        if (isMatch) {
            // Hedef dile göre konuşmacı belirle
            let targetLang: 'en-US' | 'tr-TR' = 'en-US';

            // Eğer veri ters ise: TR_EN modu -> hedef word.english (ama içinde TR var).
            // Eğer veri düz ise: TR_EN modu -> hedef word.english (içinde EN var).

            if (isSetDataSwapped) {
                // DATA TERS: 'english' sütununda Türkçe var. 'turkish' sütununda İngilizce var.
                if (direction === LanguageDirection.TR_EN) {
                    // Mod: TR -> EN. Prompt: word.english (TR). Target: word.turkish (EN).
                    // Beklenen: Target EN.
                    targetLang = 'en-US';
                } else {
                    // Mod: EN -> TR. Prompt: word.turkish (EN). Target: word.english (TR).
                    targetLang = 'tr-TR';
                }
            } else {
                // DATA DÜZ: Standart.
                if (direction === LanguageDirection.TR_EN) {
                    // Mod: TR -> EN. Prompt: TR. Target: EN.
                    targetLang = 'en-US';
                } else {
                    // Mod: EN -> TR. Prompt: EN. Target: TR.
                    targetLang = 'tr-TR';
                }
            }

            speak(targetText, targetLang);

            // Bir sonraki inputa odaklan
            setTimeout(() => {
                const nextInputId = `study-input-${currentIndex + 1}`;
                const nextElement = document.getElementById(nextInputId);
                if (nextElement) {
                    nextElement.focus();
                }
            }, 100);
        }
    };

    const clearLine = (id: string) => {
        setProgress(prev => ({
            ...prev,
            [id]: { input: '', status: 'IDLE' }
        }));
    };

    const checkAnswer = (id: string, targetText: string) => {
        const currentInput = progress[id]?.input || '';
        const isCorrect = normalize(currentInput) === normalize(targetText);

        setProgress(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                status: isCorrect ? 'CORRECT' : 'WRONG'
            }
        }));

        if (isCorrect) {
            // Speak logic duplicate - simplified reuse or copy logic
            let targetLang: 'en-US' | 'tr-TR' = 'en-US';
            if (isSetDataSwapped) {
                if (direction === LanguageDirection.TR_EN) targetLang = 'en-US';
                else targetLang = 'tr-TR';
            } else {
                if (direction === LanguageDirection.TR_EN) targetLang = 'en-US';
                else targetLang = 'tr-TR';
            }
            speak(targetText, targetLang);
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

    const handleManualReset = () => {
        setShowResetConfirm(true);
    };

    const handleRestart = () => {
        localStorage.removeItem(storageKey);
        alert("Set sıfırlandı ve 'Devam Eden Çalışmalar' alanına taşındı.");
        onExit();
    };

    const performReset = () => {
        const resetState: Record<string, ProgressState> = {};
        words.forEach(w => {
            resetState[w.id] = { input: '', status: 'IDLE' };
        });
        setProgress(resetState);
        localStorage.removeItem(storageKey);
        setShowFinishedModal(false);
        setShowResetConfirm(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmAddToLibrary = async () => {
        if (!selectionToAdd) return;

        try {
            const { data: { session } } = await supabase!.auth.getSession();
            const userId = session?.user?.id;

            const isExactMatch = selectionToAdd.text.toLowerCase() === selectionToAdd.word.english.toLowerCase();
            const inferredTurkish = isExactMatch ? selectionToAdd.word.turkish : '?';

            await wordService.addWord({
                english: selectionToAdd.text,
                turkish: inferredTurkish,
                example_sentence: selectionToAdd.word.example_sentence || selectionToAdd.word.english,
                turkish_sentence: selectionToAdd.word.turkish_sentence || selectionToAdd.word.turkish
            }, userId);

            showToast(`"${selectionToAdd.text}" kelimesi listeye eklendi!`, 'success');
            setSelectionToAdd(null);
        } catch (e) {
            console.error(e);
            showToast('Bir hata oluştu.', 'error');
        }
    };

    const handlePromptDoubleClick = (word: Word) => {
        const selection = window.getSelection()?.toString().trim();
        if (!selection || selection.length < 2) return;
        setSelectionToAdd({ text: selection, word });
    };

    const handleInputDoubleClick = (e: React.MouseEvent<HTMLInputElement>, word: Word) => {
        const input = e.currentTarget;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const selectedText = input.value.substring(start, end).trim();
        if (selectedText && selectedText.length > 1) {
            setSelectionToAdd({ text: selectedText, word: word });
        }
    };

    if (showFinishedModal) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans'] relative overflow-hidden z-[100]">
                {/* Same Finished Modal */}
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

    const containerClass = "w-full max-w-6xl px-4 md:px-8 mx-auto flex flex-col items-center";

    return (
        <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10 p-4 shadow-2xl">
                <div className="w-full max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button onClick={onGoHome} className="p-3 bg-zinc-900 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-white/5 flex-shrink-0 group" title="Ana Sayfa">
                            <Home size={20} className="text-slate-400 group-hover:text-white" />
                        </button>
                        <div className="w-px h-8 bg-white/10 mx-2"></div>
                        <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all border border-white/5 flex-shrink-0">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div className="flex-1 overflow-hidden ml-2">
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

                <div className="w-full max-w-6xl mx-auto px-4 md:px-8 mt-6">
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_#3b82f6]"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 p-4 md:p-8">
                <div className={containerClass}>

                    {/* Info Box */}
                    <div className="w-full bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl mb-8 flex items-start gap-3">
                        <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                        <p className="text-sm font-medium text-blue-200">
                            Çeviri girişi doğru sağlanırsa bir sonraki cümleye geçiş otomatik gerçekleşir.
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        {words.map((word, index) => {
                            const state = progress[word.id] || { input: '', status: 'IDLE' };
                            const isCorrect = state.status === 'CORRECT';
                            const isWrong = state.status === 'WRONG';

                            let promptText = '';
                            let targetText = '';

                            const isTrToEn = direction === LanguageDirection.TR_EN;

                            // DİNAMİK Prompt/Target Belirleme
                            let promptLang: 'tr' | 'en' = 'tr';

                            if (isSetDataSwapped) {
                                // Data Ters: word.turkish -> EN, word.english -> TR
                                if (direction === LanguageDirection.TR_EN) {
                                    // Kullanıcı "TR -> EN" istiyor. 
                                    // Kaynak (Prompt): TR olmalı -> word.english kullanmalıyız.
                                    // Hedef (Target): EN olmalı -> word.turkish kullanmalıyız.
                                    promptText = word.english; // Veri ters olduğu için burada TR cümle var
                                    targetText = word.turkish_sentence || word.turkish; // Burada EN cümle var
                                    promptLang = 'tr';
                                } else {
                                    // Kullanıcı "EN -> TR" istiyor.
                                    // Kaynak: EN -> word.turkish
                                    // Hedef: TR -> word.english
                                    promptText = word.turkish_sentence || word.turkish;
                                    targetText = word.english;
                                    promptLang = 'en';
                                }
                            } else {
                                // Data Düz: Standart
                                if (direction === LanguageDirection.TR_EN) {
                                    // TR -> EN
                                    promptText = word.turkish_sentence || word.turkish;
                                    targetText = word.example_sentence || word.english;
                                    promptLang = 'tr';
                                } else {
                                    // EN -> TR
                                    promptText = word.example_sentence || word.english;
                                    targetText = word.turkish_sentence || word.turkish;
                                    promptLang = 'en';
                                }
                            }

                            // Konuşmacı ve Placeholder Mantığı (Prompt Dilinin TERSİ olacak)
                            // Prompt TR ise -> Hedef EN -> Konuşmacı EN, Placeholder EN.
                            // Prompt EN ise -> Hedef TR -> Konuşmacı TR, Placeholder TR.

                            const targetIsEn = promptLang === 'tr';
                            const speechLang = targetIsEn ? 'en-US' : 'tr-TR';
                            const inputPlaceholder = targetIsEn ? "İngilizce çevirisi..." : "Türkçe çevirisi...";

                            return (
                                <div
                                    key={word.id}
                                    className={`group relative flex flex-col md:flex-row items-stretch bg-zinc-900 rounded-[24px] border-2 transition-all w-full
                            ${isCorrect ? 'border-emerald-500/30 bg-emerald-900/10' : isWrong ? 'border-red-500/30' : 'border-zinc-800 focus-within:border-blue-500/50'}
                        `}
                                >
                                    {/* Sol: Prompt (Soru) */}
                                    <div
                                        className="flex-1 p-4 md:p-5 border-b md:border-b-0 md:border-r border-white/5 bg-white/5 md:bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center"
                                        onDoubleClick={() => handlePromptDoubleClick(word)}
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
                                    <div className="flex-1 p-3 md:p-4 flex items-center justify-center">
                                        <div className="w-full flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <input
                                                    key={direction} // Yön değişince input resetlenmeli
                                                    id={`study-input-${index}`}
                                                    type="text"
                                                    value={state.input}
                                                    onChange={(e) => handleInputChange(word.id, e.target.value, targetText, index)}
                                                    onKeyDown={(e) => handleKeyDown(e, word.id, targetText)}
                                                    onDoubleClick={(e) => handleInputDoubleClick(e, word)}
                                                    placeholder={inputPlaceholder}
                                                    disabled={isCorrect}
                                                    className={`w-full bg-zinc-800 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-base md:text-lg font-bold outline-none transition-all placeholder:text-zinc-600 shadow-inner
                                            ${isCorrect ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : 'text-white focus:border-blue-500 focus:bg-zinc-700'}
                                            ${isWrong ? 'text-red-400 border-red-500/50' : ''}
                                        `}
                                                />
                                                {/* Buton Grubu - Inputun İçinde */}
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">

                                                    {!isCorrect && state.input.trim().length > 0 && (
                                                        <button
                                                            onClick={() => checkAnswer(word.id, targetText)}
                                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                            title="Kontrol Et (Enter)"
                                                            tabIndex={-1}
                                                        >
                                                            <HelpCircle size={18} />
                                                        </button>
                                                    )}

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
                                                            className="text-red-500 hover:scale-110 transition-transform hover:text-red-400 p-1"
                                                            title="Temizle"
                                                            tabIndex={-1}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => speak(state.input, speechLang)}
                                                className="p-4 bg-zinc-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex-shrink-0 border border-white/5 shadow-lg"
                                                tabIndex={-1}
                                                title={isTrToEn ? "Tersine Çevrildi: TR" : "Tersine Çevrildi: EN"}
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

                {/* Reset Confirmation Modal */}
                {showResetConfirm && (
                    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-scaleIn">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                                <Eraser size={32} />
                            </div>

                            <h3 className="text-xl font-black text-white mb-2">Sıfırla?</h3>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                Bu set için tüm ilerlemen silinecek. Baştan başlamak istediğine emin misin?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 py-4 rounded-xl bg-zinc-900 text-slate-400 font-bold hover:bg-zinc-800 hover:text-white transition-all"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={performReset}
                                    className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                                >
                                    Evet, Sıfırla
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Add Word Modal */}
                {selectionToAdd && (
                    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-scaleIn">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-500">
                                <Plus size={32} />
                            </div>

                            <h3 className="text-xl font-black text-white mb-2">Listeye Ekle</h3>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-md mx-1">"{selectionToAdd.text}"</span>
                                kelimesini ana çalışma listene eklemek istiyor musun?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectionToAdd(null)}
                                    className="flex-1 py-4 rounded-xl bg-zinc-900 text-slate-400 font-bold hover:bg-zinc-800 hover:text-white transition-all"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={confirmAddToLibrary}
                                    className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSetStudyMode;
