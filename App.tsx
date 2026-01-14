
import React, { useState, useEffect } from 'react';
import { AppMode, Word } from './types';
import { wordService, supabase } from './services/supabaseClient';
import { extractWordsFromImage } from './services/geminiService';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import ArchiveView from './components/ArchiveView';
import Auth from './components/Auth';
import DeleteModal from './components/DeleteModal';
import { PulseLoader } from './components/Loader';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

// 🚀 PERFORMANS ÇÖZÜMÜ: Inline Web Worker + Optimized Base64
// Donmayı önlemek için Base64 dönüşümü ve temizliği worker içinde yapılıyor.
const WORKER_CODE = `
self.onmessage = async (e) => {
  const file = e.data;

  try {
    // 1. Görseli Bitmap olarak decode et
    const bitmap = await createImageBitmap(file);
    
    // 2. Boyut Hesaplama (Tamsayı garantisi ile)
    let { width, height } = bitmap;
    const MAX_DIMENSION = 1024; // Kalite için biraz artırdık, performans hala iyi olur

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.floor(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.floor(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }
    }

    // 3. OffscreenCanvas Kontrolü ve Çizim
    if (typeof OffscreenCanvas === 'undefined') {
        throw new Error("Tarayıcınız bu işlemi desteklemiyor.");
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Worker: Canvas context oluşturulamadı.");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    // 4. Blob Oluşturma
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.6 // %60 kalite yeterli, boyutu düşürür hızlandırır
    });

    // 5. Base64 Dönüşümü ve Header Temizliği (Worker İçinde)
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
            // "data:image/jpeg;base64," kısmını burada atıyoruz
            // Ana thread'e daha az veri gider, split işlemi ana thread'i yormaz.
            const base64Raw = result.split(',')[1] || result;
            self.postMessage({ success: true, data: base64Raw });
        } else {
            self.postMessage({ success: false, error: "Base64 oluşturulamadı" });
        }
    };
    reader.onerror = () => {
        self.postMessage({ success: false, error: "Blob okunamadı" });
    };

  } catch (error) {
    console.error("Worker Hatası:", error);
    self.postMessage({ success: false, error: error.message || "Bilinmeyen worker hatası" });
  }
};
`;

const processImageWithWorker = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Worker Kurulumu
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // 2. Zaman Aşımı Koruması (20 Saniye)
    // Eğer worker veya tarayıcı takılırsa, uygulamayı sonsuz döngüden kurtarır.
    const timeoutId = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(new Error("İşlem zaman aşımına uğradı. Görsel çok büyük olabilir."));
    }, 20000);

    // 3. Mesaj Dinleme
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timeoutId); // İşlem başarılı, sayacı durdur
      const { success, data, error } = e.data;
      
      if (success && data) {
        resolve(data as string);
      } else {
        reject(new Error(error || "Görsel işlenirken hata oluştu."));
      }

      worker.terminate();
      URL.revokeObjectURL(workerUrl); // Bellek temizliği
    };

    // 4. Hata Dinleme
    worker.onerror = (err: ErrorEvent) => {
      clearTimeout(timeoutId);
      console.error("Worker Error:", err);
      reject(new Error("Görsel işleme servisi başlatılamadı."));
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    // 5. Başlat
    worker.postMessage(file);
  });
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  const [flashcardOffset, setFlashcardOffset] = useState(() => {
    const saved = localStorage.getItem('lingua_global_offset');
    return saved ? parseInt(saved) : 0;
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const initializeApp = async () => {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 8000));
      
      try {
        if (!supabase) {
          setLoadingSession(false);
          return;
        }

        const loadData = async () => {
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            
            setSession(currentSession);
            
            if (currentSession) {
              const allWords = await wordService.getAllWords(currentSession.user.id);
              setWords(allWords || []);
            }
        };

        await Promise.race([loadData(), timeoutPromise]);

      } catch (e: any) {
        if (e.message !== "TIMEOUT") {
            console.error("Uygulama başlatılamadı:", e);
        } else {
            console.warn("Oturum kontrolü uzun sürdü, devam ediliyor...");
        }
      } finally {
        setLoadingSession(false);
      }
    };
    initializeApp();

    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        try {
          const allWords = await wordService.getAllWords(newSession.user.id);
          setWords(allWords || []);
        } catch (e) {
          console.error("Kelime yükleme hatası:", e);
        }
      } else {
        setWords([]);
        wordService.clearCache();
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };
    
    return () => subscription.unsubscribe();
  }, []);

  const displayWords = words
    .filter(w => !w.is_archived && !w.set_name)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const archivedWords = words.filter(w => w.is_archived === true);

  const getSequentialSet = () => {
      const sortedActive = words
        .filter(w => !w.is_archived && !w.set_name)
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      return sortedActive.slice(flashcardOffset, flashcardOffset + 20);
  };

  const handleNextFlashcardSet = () => {
      const nextOffset = flashcardOffset + 20;
      const totalActiveCount = words.filter(w => !w.is_archived && !w.set_name).length;
      if (nextOffset >= totalActiveCount) {
          setFlashcardOffset(0);
          localStorage.setItem('lingua_global_offset', '0');
          showToast("Tüm listeyi tamamladınız, başa dönülüyor.");
      } else {
          setFlashcardOffset(nextOffset);
          localStorage.setItem('lingua_global_offset', nextOffset.toString());
          showToast("Bir sonraki 20'li sete geçildi.");
      }
  };

  const handleArchiveWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: true } : w));
    await wordService.toggleArchive(id, true);
    showToast("Kelime öğrenildi ve arşive kaldırıldı.");
  };

  const handleRestoreWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: false } : w));
    await wordService.toggleArchive(id, false);
    showToast("Kelime tekrar listeye eklendi.");
  };

  const handleAddWord = async (english: string, turkish: string, example: string, turkish_sentence: string): Promise<boolean> => {
    try {
      const newWord = await wordService.addWord({ english, turkish, example_sentence: example, turkish_sentence: turkish_sentence }, session?.user?.id);
      if (newWord) {
        setWords(prev => [newWord, ...prev]);
        showToast("Kelime eklendi.");
        return true;
      }
    } catch (e) {
      console.error("Ekleme hatası:", e);
    }
    return false;
  };

  const handleImageAnalysis = async (file: File) => {
    setOcrLoading(true);

    try {
      // 1. ADIM: Web Worker ile Arka Planda İşle (Donma Yok, Timeout Korumalı)
      // Worker artık doğrudan raw base64 string döndürüyor, 'data:...' prefix yok.
      const rawBase64 = await processImageWithWorker(file);

      // 2. ADIM: AI Analizi
      // Gemini servisine raw base64 gönderiyoruz.
      const extracted = await extractWordsFromImage(rawBase64, 'image/jpeg');
      
      if (!extracted || extracted.length === 0) {
        showToast("Görselde okunabilir kelime bulunamadı.", "warning");
        setShowUploadModal(false);
        return;
      }

      // 3. ADIM: Veritabanına Kayıt
      const wordsToAdd = extracted.map(item => ({
          english: item.english,
          turkish: item.turkish,
          example_sentence: item.example_sentence,
          turkish_sentence: item.turkish_sentence
      }));

      const addedWords = await wordService.addWordsBulk(wordsToAdd, session?.user?.id);
      
      if (addedWords.length > 0) {
        setWords(prev => [...addedWords, ...prev]);
        showToast(`${addedWords.length} yeni kelime eklendi!`);
      } else {
        showToast("Kelimeler veritabanına kaydedilemedi.", "error");
      }
      
      setShowUploadModal(false);
    } catch (err: any) {
      console.error("Analiz Hatası:", err);
      // Hata mesajını kullanıcı dostu hale getir
      let msg = err.message || "Bilinmeyen hata";
      if (msg.includes("zaman aşımına")) msg = "Görsel çok büyük veya işlem çok uzun sürdü.";
      else if (msg === "QUOTA_EXCEEDED") msg = "AI kotası doldu, lütfen biraz bekleyin.";
      
      showToast("İşlem başarısız: " + msg, "error");
      setShowUploadModal(false);
    } finally {
      setOcrLoading(false);
    }
  };

  const confirmDeleteWord = (id: string) => {
    setWordToDelete(id);
  };

  const handleDeleteConfirmed = async () => {
    if (wordToDelete) {
      const id = wordToDelete;
      setWords(prev => prev.filter(w => w.id !== id));
      setWordToDelete(null);
      
      try {
        await wordService.deleteWord(id);
        showToast("Kelime silindi.", "warning");
      } catch (e) {
        console.error("Silme hatası:", e);
        showToast("Silme işlemi başarısız.", "error");
      }
    }
  };

  const confirmDeleteDate = (date: string) => {
    setDateToDelete(date);
  };

  const handleDeleteDateConfirmed = async () => {
    if (dateToDelete) {
      const dateStr = dateToDelete;
      const wordsToDelete = words.filter(w => {
          const wDate = new Date(w.created_at || 0).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
          return wDate === dateStr;
      });
      const ids = wordsToDelete.map(w => w.id);
      
      setWords(prev => prev.filter(w => !ids.includes(w.id)));
      setDateToDelete(null);

      try {
        await wordService.deleteWords(ids);
        showToast(`${ids.length} kelime silindi.`, "warning");
      } catch (e) {
        console.error("Toplu silme hatası:", e);
        showToast("Toplu silme başarısız.", "error");
      }
    }
  };

  if (loadingSession) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <PulseLoader />
      <p className="text-slate-500 font-bold mt-8 animate-pulse text-sm uppercase tracking-widest">Oturum Açılıyor...</p>
    </div>
  );
  
  if (!session) return <Auth />;

  return (
    <div className="bg-black min-h-screen text-white font['Plus_Jakarta_Sans']">
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10001] animate-fadeIn w-full max-w-lg px-4">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
              toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 
              'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {toast.type === 'error' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              <span className="font-black text-sm flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARDS && <FlashcardMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} onNextSet={handleNextFlashcardSet} onRemoveWord={handleArchiveWord} />}
        {mode === AppMode.QUIZ && <QuizMode words={getSequentialSet()} allWords={words.filter(w => !w.is_archived)} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.SENTENCES && <SentenceMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.ARCHIVE && <ArchiveView words={archivedWords} onExit={() => setMode(AppMode.HOME)} onRestore={handleRestoreWord} />}
        
        {mode === AppMode.HOME && (
            <Dashboard 
                userEmail={session.user.email} 
                words={displayWords} 
                onModeSelect={m => {
                    if (m === AppMode.ARCHIVE) setMode(m);
                    else {
                        const set = getSequentialSet();
                        if (set.length === 0) showToast("Önce listeye kelime eklemelisiniz.", "error");
                        else { setMode(m); }
                    }
                }}
                onAddWord={handleAddWord} 
                onDeleteWord={confirmDeleteWord} 
                onDeleteByDate={confirmDeleteDate}
                onLogout={async () => { try { await supabase!.auth.signOut(); } catch (e) {} }}
                onOpenUpload={() => setShowUploadModal(true)}
                onQuickAdd={() => { document.getElementById('force-open-add-word')?.click(); }}
                onResetAccount={() => {}} 
            />
        )}

        {showUploadModal && (
          <UploadModal 
            onClose={() => setShowUploadModal(false)} 
            onFileSelect={handleImageAnalysis} 
            isLoading={ocrLoading} 
            showToast={showToast} 
          />
        )}
        
        {wordToDelete && (
          <DeleteModal 
            onConfirm={handleDeleteConfirmed} 
            onCancel={() => setWordToDelete(null)} 
          />
        )}

        {dateToDelete && (
          <DeleteModal 
            title="Bu Tarihi Sil?"
            description={`"${dateToDelete}" tarihinde eklenen kelimeler silinecek. Emin misin?`}
            onConfirm={handleDeleteDateConfirmed} 
            onCancel={() => setDateToDelete(null)} 
          />
        )}
    </div>
  );
}
