
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Word, OcrStatus } from './types';
import { wordService, supabase } from './services/supabaseClient';
import { analyzeImage } from './services/analyzeImage';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import CustomSetManager from './components/CustomSetManager';
import CustomSetStudyMode from './components/CustomSetStudyMode';
import SentenceModeSelectionModal from './components/SentenceModeSelectionModal';
import UploadModal from './components/UploadModal';
import ArchiveView from './components/ArchiveView';
import Auth from './components/Auth';
import DeleteModal from './components/DeleteModal';
import { PulseLoader } from './components/Loader';
import { CheckCircle2, X } from 'lucide-react';

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
      const MAX_DIMENSION = 1024; 
      
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
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      self.postMessage({ success: true, blob: blob });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  };
`;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Prefix'i (data:image/...;base64,) kesmiyoruz, tam URL'i döndürüyoruz
    reader.onloadend = () => resolve(reader.result as string);
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
  const [showSentenceSelection, setShowSentenceSelection] = useState(false);
  const [activeCustomSet, setActiveCustomSet] = useState<Word[]>([]);
  const [pendingSetName, setPendingSetName] = useState<string | null>(null);

  // Track offset for sequential study (Flashcards/Quiz/Sentences)
  const [studyOffset, setStudyOffset] = useState(() => parseInt(localStorage.getItem('lingua_global_offset') || '0'));

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
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!supabase) {
          if (isMounted) setLoadingSession(false);
          return;
        }

        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (isMounted) {
          if (currentSession) {
            setSession(currentSession);
            const allWords = await wordService.getAllWords(currentSession.user.id);
            setWords(allWords || []);
          }
        }
      } catch (err) {
        console.error("Başlatma hatası:", err);
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        wordService.getAllWords(newSession.user.id).then(w => setWords(w || []));
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setWords([]);
        wordService.clearCache();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      const { success, blob: resizedBlob, error: workerError } = e.data;

      if (success) {
        try {
          setOcrStatus('CONNECTING');
          const base64FullData = await blobToBase64(resizedBlob);

          setOcrStatus('ANALYZING');
          const extracted = await analyzeImage(
            base64FullData,
            session,
            abortControllerRef.current?.signal
          );

          if (extracted && extracted.length > 0) {

            // Eğer pendingSetName varsa, kelimelere set_name ekle
            const wordsToAdd = pendingSetName
              ? extracted.map((w: any) => ({ ...w, set_name: pendingSetName }))
              : extracted;

            const addedWords = await wordService.addWordsBulk(wordsToAdd, session?.user?.id);

            if (addedWords.length > 0) {
              setWords(prev => [...addedWords, ...prev]); // En başa ekle
              showToast(`${addedWords.length} kelime eklendi!`);
              setShowUploadModal(false);
              setPendingSetName(null); // Temizle
            } else {
              showToast("Analiz edilen kelimeler/cümleler zaten listenizde mevcut.", "warning");
            }
          } else {
            showToast("Görselde anlaşılır içerik bulunamadı.", "warning");
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            const errorMsg = err.message || "Analiz sırasında bir sorun oluştu.";
            showToast(errorMsg, "error");
          }
        } finally {
          setOcrLoading(false);
          setOcrStatus('IDLE');
          abortControllerRef.current = null;
        }
      } else {
        showToast(workerError || "Görsel hazırlama hatası.", "error");
        setOcrLoading(false);
        setOcrStatus('IDLE');
      }

      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };

    worker.postMessage({ file });
  };

  if (loadingSession) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <PulseLoader />
      <p className="text-slate-500 font-bold mt-8 animate-pulse text-[10px] uppercase tracking-[0.4em]">Sistem Hazırlanıyor...</p>
    </div>
  );

  if (!session) return <Auth />;

  const displayWords = words
    .filter(w => !w.is_archived && !w.set_name)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const getSequentialSet = () => {
    const sortedActive = words
      .filter(w => !w.is_archived && !w.set_name)
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    return sortedActive.slice(studyOffset, studyOffset + 20);
  };

  const handleNextSet = () => {
    const sortedActive = words
      .filter(w => !w.is_archived && !w.set_name)
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    let newOffset = studyOffset + 20;
    if (newOffset >= sortedActive.length) {
      newOffset = 0; // Loop back to start
      showToast("Tüm kelimeler bitti, başa dönüldü!", "success");
    }

    setStudyOffset(newOffset);
    localStorage.setItem('lingua_global_offset', newOffset.toString());
  };

  const handleArchiveWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: true } : w));
    await wordService.toggleArchive(id, true);
  };

  return (
    <div className="bg-black min-h-screen text-white font['Plus_Jakarta_Sans']">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10001] animate-fadeIn w-full max-w-lg px-4">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
              'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <CheckCircle2 size={24} />
            <span className="font-black text-sm flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
          </div>
        </div>
      )}

      {mode === AppMode.FLASHCARDS && <FlashcardMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} onNextSet={handleNextSet} onRemoveWord={handleArchiveWord} />}
      {mode === AppMode.QUIZ && <QuizMode words={getSequentialSet()} allWords={words} onExit={() => setMode(AppMode.HOME)} />}
      {mode === AppMode.SENTENCES && <SentenceMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} />}
      {mode === AppMode.ARCHIVE && <ArchiveView words={words.filter(w => w.is_archived)} onExit={() => setMode(AppMode.HOME)} onRestore={() => { }} />}

      {mode === AppMode.CUSTOM_SETS && (
        <CustomSetManager
          words={words}
          onExit={() => setMode(AppMode.HOME)}
          onPlaySet={(setWords) => {
            setActiveCustomSet(setWords);
            setMode(AppMode.CUSTOM_SET_STUDY);
          }}
          onUploadNewSet={(name) => {
            setPendingSetName(name);
            setShowUploadModal(true);
          }}
          onRefresh={async () => {
            if (session?.user?.id) {
              const w = await wordService.getAllWords(session.user.id);
              setWords(w || []);
            }
          }}
          onRenameCustomSetLocally={(oldName, newName) => {
            setWords(prev => prev.map(w => w.set_name === oldName ? { ...w, set_name: newName } : w));
          }}
        />
      )}

      {mode === AppMode.CUSTOM_SET_STUDY && (
        <CustomSetStudyMode
          words={activeCustomSet}
          onExit={() => setMode(AppMode.CUSTOM_SETS)}
          onGoHome={() => setMode(AppMode.HOME)}
          showToast={showToast}
        />
      )}

      {mode === AppMode.HOME && (
        <Dashboard
          userEmail={session.user.email}
          words={displayWords}
          onModeSelect={(m) => {
            if (m === AppMode.SENTENCES) {
              setShowSentenceSelection(true);
            } else {
              setMode(m);
            }
          }}
          onAddWord={async (en, tr, ex, trex) => {
            const newWord = await wordService.addWord({ english: en, turkish: tr, example_sentence: ex, turkish_sentence: trex }, session.user.id);
            if (newWord) {
              setWords(prev => [newWord, ...prev]);
              return true;
            }
            return false;
          }}
          onDeleteWord={(id) => setWordToDelete(id)}
          onDeleteByDate={(date) => setDateToDelete(date)}
          onLogout={() => supabase.auth.signOut()}
          onOpenUpload={() => {
            setPendingSetName(null); // Normal upload için null yap
            setShowUploadModal(true);
          }}
          onQuickAdd={() => {
            const btn = document.getElementById('force-open-add-word');
            if (btn) btn.click();
          }}
          onResetAccount={() => { }}
        />
      )}

      {showSentenceSelection && (
        <SentenceModeSelectionModal
          onClose={() => setShowSentenceSelection(false)}
          onSelectStandard={() => {
            setShowSentenceSelection(false);
            setMode(AppMode.SENTENCES);
          }}
          onSelectCustom={() => {
            setShowSentenceSelection(false);
            setMode(AppMode.CUSTOM_SETS);
          }}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onFileSelect={handleImageAnalysis}
          isLoading={ocrLoading}
          ocrStatus={ocrStatus}
          onCancelLoading={() => {
            abortControllerRef.current?.abort();
            setOcrLoading(false);
          }}
          showToast={showToast}
        />
      )}

      {wordToDelete && <DeleteModal onConfirm={async () => {
        await wordService.deleteWord(wordToDelete);
        setWords(prev => prev.filter(w => w.id !== wordToDelete));
        setWordToDelete(null);
      }} onCancel={() => setWordToDelete(null)} />}

      {dateToDelete && <DeleteModal title="Grubu Sil" description={`${dateToDelete} tarihindeki kelimeleri silmek istediğine emin misin?`} onConfirm={async () => {
        const toDelete = words.filter(w => new Date(w.created_at!).toLocaleDateString('tr-TR') === dateToDelete).map(w => w.id);
        await wordService.deleteWords(toDelete);
        setWords(prev => prev.filter(w => !toDelete.includes(w.id)));
        setDateToDelete(null);
        showToast(`${toDelete.length} kelime silindi.`, "success");
      }} onCancel={() => setDateToDelete(null)} />}
    </div>
  );
}
