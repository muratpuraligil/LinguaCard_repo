
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Word, OcrStatus } from './types';
import { wordService, supabase } from './services/supabaseClient';
import { analyzeImage } from './services/analyzeImage';
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

const WORKER_CODE = `
  self.onmessage = async (e) => {
    const { file } = e.data;
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      const MAX_DIMENSION = 512;
      
      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width));
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height));
          height = MAX_DIMENSION;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
      self.postMessage({ success: true, blob: blob });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  };
`;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] || (reader.result as string));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('IDLE');
  const [toast, setToast] = useState<Toast | null>(null);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!supabase) {
          setLoadingSession(false);
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (!error && data.session) {
            setSession(data.session);
            const allWords = await wordService.getAllWords(data.session.user.id);
            setWords(allWords || []);
        }
      } catch (e) {
          console.error("Auth init error:", e);
      } finally {
        setLoadingSession(false);
      }
    };
    initializeApp();

    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !newSession)) {
          setSession(null);
          setWords([]);
          wordService.clearCache();
      } else if (newSession) {
          setSession(newSession);
          const allWords = await wordService.getAllWords(newSession.user.id);
          setWords(allWords || []);
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };
    
    return () => subscription.unsubscribe();
  }, []);

  const cancelOcr = () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      supabase?.auth.startAutoRefresh();
      setOcrLoading(false);
      setOcrStatus('IDLE');
      showToast("İşlem durduruldu.", "warning");
  };

  const handleImageAnalysis = (file: File) => {
    if (ocrLoading) return;
    
    setOcrLoading(true);
    setOcrStatus('PREPARING');
    abortControllerRef.current = new AbortController();

    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = async (e) => {
        const { success, blob: resizedBlob, error } = e.data;

        if (success) {
            try {
                supabase?.auth.stopAutoRefresh();
                setOcrStatus('CONNECTING');
                const base64Data = await blobToBase64(resizedBlob);
                
                setOcrStatus('ANALYZING');
                // ESKİ Gemini Servisi Kaldırıldı, YENİ Edge Function Servisi Çağrılıyor
                const extracted = await analyzeImage(
                  base64Data, 
                  session,
                  abortControllerRef.current?.signal
                );

                if (extracted && extracted.length > 0) {
                    const addedWords = await wordService.addWordsBulk(extracted, session?.user?.id);
                    if (addedWords.length > 0) {
                        setWords(prev => [...addedWords, ...prev]);
                        showToast(`${addedWords.length} yeni kelime eklendi!`);
                        setShowUploadModal(false); 
                    } else {
                        showToast("Analiz edilen kelimeler zaten listenizde mevcut.", "warning");
                    }
                } else {
                    showToast("Görselde anlaşılır İngilizce kelime bulunamadı.", "warning");
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                  showToast(err.message || "Analiz sırasında bir sorun oluştu.", "error");
                }
            } finally {
                supabase?.auth.startAutoRefresh();
                setOcrLoading(false);
                setOcrStatus('IDLE');
                abortControllerRef.current = null;
            }
        } else {
            showToast(error || "Görsel hazırlama hatası.", "error");
            setOcrLoading(false);
            setOcrStatus('IDLE');
        }

        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        workerRef.current = null;
    };

    worker.postMessage({ file });
  };

  const displayWords = words
    .filter(w => !w.is_archived && !w.set_name)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const getSequentialSet = () => {
      const sortedActive = words
        .filter(w => !w.is_archived && !w.set_name)
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      
      const offset = parseInt(localStorage.getItem('lingua_global_offset') || '0');
      return sortedActive.slice(offset, offset + 20);
  };

  const handleNextFlashcardSet = () => {
      const currentOffset = parseInt(localStorage.getItem('lingua_global_offset') || '0');
      const nextOffset = currentOffset + 20;
      const totalCount = words.filter(w => !w.is_archived && !w.set_name).length;
      localStorage.setItem('lingua_global_offset', (nextOffset >= totalCount ? 0 : nextOffset).toString());
      showToast(nextOffset >= totalCount ? "Başa dönüldü." : "Sıradaki sete geçildi.");
  };

  const handleArchiveWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: true } : w));
    await wordService.toggleArchive(id, true);
    showToast("Öğrenildi.");
  };

  const handleRestoreWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: false } : w));
    await wordService.toggleArchive(id, false);
  };

  const handleAddWord = async (english: string, turkish: string, example: string, tr_ex: string): Promise<boolean> => {
    try {
      const newWord = await wordService.addWord({ english, turkish, example_sentence: example, turkish_sentence: tr_ex }, session?.user?.id);
      if (newWord) {
        setWords(prev => [newWord, ...prev]);
        showToast("Eklendi.");
        return true;
      }
    } catch (e) {}
    return false;
  };

  if (loadingSession) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <PulseLoader />
      <p className="text-slate-500 font-bold mt-8 animate-pulse text-[10px] uppercase tracking-[0.4em]">Yükleniyor...</p>
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
              <CheckCircle2 size={24} />
              <span className="font-black text-sm flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARDS && <FlashcardMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} onNextSet={handleNextFlashcardSet} onRemoveWord={handleArchiveWord} />}
        {mode === AppMode.QUIZ && <QuizMode words={getSequentialSet()} allWords={words.filter(w => !w.is_archived)} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.SENTENCES && <SentenceMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.ARCHIVE && <ArchiveView words={words.filter(w => w.is_archived)} onExit={() => setMode(AppMode.HOME)} onRestore={handleRestoreWord} />}
        
        {mode === AppMode.HOME && (
            <Dashboard 
                userEmail={session.user.email} 
                words={displayWords} 
                onModeSelect={setMode}
                onAddWord={handleAddWord} 
                onDeleteWord={(id) => setWordToDelete(id)} 
                onDeleteByDate={(date) => setDateToDelete(date)}
                onLogout={() => supabase!.auth.signOut()}
                onOpenUpload={() => setShowUploadModal(true)}
                onQuickAdd={() => document.getElementById('force-open-add-word')?.click()}
                onResetAccount={() => {}} 
            />
        )}

        {showUploadModal && (
          <UploadModal 
            onClose={() => setShowUploadModal(false)} 
            onFileSelect={handleImageAnalysis} 
            isLoading={ocrLoading} 
            ocrStatus={ocrStatus}
            onCancelLoading={cancelOcr}
            showToast={showToast} 
          />
        )}
        
        {wordToDelete && <DeleteModal onConfirm={async () => {
          setWords(prev => prev.filter(w => w.id !== wordToDelete));
          await wordService.deleteWord(wordToDelete);
          setWordToDelete(null);
          showToast("Silindi.", "warning");
        }} onCancel={() => setWordToDelete(null)} />}

        {dateToDelete && <DeleteModal 
            title="Grubu Sil?"
            description={`${dateToDelete} tarihindeki kelimeleri silmek istediğine emin misin?`}
            onConfirm={async () => {
              const ids = words.filter(w => new Date(w.created_at || '').toLocaleDateString('tr-TR') === dateToDelete).map(w => w.id);
              setWords(prev => prev.filter(w => !ids.includes(w.id)));
              await wordService.deleteWords(ids);
              setDateToDelete(null);
              showToast("Tarih grubu silindi.", "warning");
            }} 
            onCancel={() => setDateToDelete(null)} 
        />}
    </div>
  );
}
