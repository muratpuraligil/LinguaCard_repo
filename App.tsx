
import React, { useState, useEffect } from 'react';
import { AppMode, Word } from './types';
import { supabase, wordService } from './services/supabaseClient';
import { extractWordsFromImage } from './services/geminiService';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import CustomSetStudyMode from './components/CustomSetStudyMode';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import DeleteModal from './components/DeleteModal';
import SentenceModeSelectionModal from './components/SentenceModeSelectionModal';
import CustomSetManager from './components/CustomSetManager';
import Auth from './components/Auth';
import { PulseLoader } from './components/Loader';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [words, setWords] = useState<Word[]>(() => wordService.getCachedWords());
  const [customSetWords, setCustomSetWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSentenceSelectModal, setShowSentenceSelectModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [studySet, setStudySet] = useState<Word[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [activeSetName, setActiveSetName] = useState<string | null>(null);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    // Başlangıç fonksiyonunu tanımla
    const initializeApp = async () => {
        if (!supabase) {
            setLoadingSession(false);
            return;
        }

        try {
            // 1. Oturumu al
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            setSession(session);

            if (session) { 
                // 2. ÖNCE Yerel verileri sunucuya senkronize et (Eksik verileri tamamla)
                await wordService.syncLocalToRemote(session.user.id);

                // 3. Ardından güncel verileri çek ve varsayılanları kontrol et
                await Promise.allSettled([
                    wordService.initializeDefaults(session.user.id),
                    loadWords(session.user.id),
                    loadCustomSets(session.user.id)
                ]);
            }
        } catch (error) {
            console.error("Uygulama başlatma hatası:", error);
            // Hata olsa bile kullanıcıya bir şey göstermek için devam ediyoruz.
        } finally {
            // 4. Her durumda (başarılı veya hatalı) yükleme ekranını kapat
            setLoadingSession(false);
        }
    };

    // Başlat
    initializeApp();

    // Auth durum değişikliklerini dinle
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) { 
          // Giriş yapıldığında verileri tazele (arkaplanda)
          // Giriş anında da senkronizasyon dene
          wordService.syncLocalToRemote(session.user.id)
            .then(() => wordService.initializeDefaults(session.user.id))
            .then(() => { loadWords(session.user.id); loadCustomSets(session.user.id); })
            .catch(console.error);
      } else { 
          setWords([]); 
          setCustomSetWords([]); 
          wordService.clearCache(); // Oturum kapandığında cache'i temizle
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => subscription.unsubscribe();
  }, []);

  const loadWords = async (userId?: string) => {
    const data = await wordService.getAllWords(userId);
    setWords(data);
  };

  const loadCustomSets = async (userId?: string) => {
      const data = await wordService.getCustomSetWords(userId);
      setCustomSetWords(data);
  };

  const handleAddWord = async (english: string, turkish: string, example: string): Promise<boolean> => {
    try {
      const userId = session?.user?.id;
      const newWord = await wordService.addWord({ english, turkish, example_sentence: example, turkish_sentence: '' }, userId);
      if (newWord) {
        setWords(prev => [newWord, ...prev]);
        showToast("Kelime başarıyla eklendi.");
        return true;
      }
      return false;
    } catch (e) { return false; }
  };

  const handleResetAccount = async () => {
      if (!session?.user?.id) return;
      try {
          setLoadingSession(true);
          await wordService.deleteAllUserData(session.user.id);
          
          // Verileri sıfırla ve varsayılanları tekrar yükle
          setWords([]);
          setCustomSetWords([]);
          
          await wordService.initializeDefaults(session.user.id);
          await loadWords(session.user.id);
          await loadCustomSets(session.user.id);
          
          showToast("Hesap başarıyla sıfırlandı ve varsayılan veriler yüklendi.");
      } catch (error) {
          console.error(error);
          showToast("Sıfırlama sırasında hata oluştu.", "error");
      } finally {
          setLoadingSession(false);
      }
  };

  const confirmDelete = async () => {
    if (wordToDelete) {
      await wordService.deleteWord(wordToDelete);
      setWords(prev => prev.filter(w => w.id !== wordToDelete));
      setWordToDelete(null);
      showToast("Kelime silindi.");
    }
    if (dateToDelete) {
        const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const wordsToDelete = words.filter(w => formatDate(w.created_at || '') === dateToDelete);
        for (const w of wordsToDelete) { await wordService.deleteWord(w.id); }
        setWords(prev => prev.filter(w => formatDate(w.created_at || '') !== dateToDelete));
        setDateToDelete(null);
        showToast("Seçili tarihteki kelimeler silindi.");
    }
  };

  const handleImageFileProcess = (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      try {
        const extracted = await extractWordsFromImage(base64, file.type);
        if (extracted && extracted.length > 0) {
          if (activeSetName) {
             const added = await wordService.addCustomSetItems(extracted, activeSetName, session?.user?.id);
             await loadCustomSets(session?.user?.id);
             showToast(`${added} yeni cümle seti eklendi!`);
          } else {
             const addedCount = await wordService.bulkAddWords(extracted, session?.user?.id);
             await loadWords(session?.user?.id);
             showToast(`${addedCount} yeni kelime eklendi!`);
          }
          setShowUploadModal(false);
        } else { showToast("Görselde işlenecek metin bulunamadı.", "warning"); }
      } catch (error: any) {
        console.error("OCR Hatası:", error.message);
        if (error.message === "QUOTA_EXCEEDED") {
            showToast("Kullanım sınırına ulaşıldı, lütfen biraz bekleyin. Şimdilik manuel ekleme ile devam edebilirsiniz.", "error");
        } else {
            showToast(error.message, "error");
        }
      } finally { setOcrLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  if (loadingSession) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative">
        <PulseLoader />
        <p className="text-blue-500 font-black tracking-widest text-xs uppercase mt-8 animate-pulse">LinguaCard Başlatılıyor</p>
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div className="bg-black min-h-screen text-white font-['Plus_Jakarta_Sans']">
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10001] animate-fadeIn w-full max-w-lg px-4">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${
                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-black text-sm flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
          </div>
        )}

        {importLoading && (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center">
                 <PulseLoader />
                 <h2 className="text-2xl font-black text-white mt-8">Excel İşleniyor</h2>
             </div>
        )}

        {mode === AppMode.FLASHCARDS && <FlashcardMode words={studySet} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.QUIZ && <QuizMode words={studySet} allWords={words} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.SENTENCES && <SentenceMode words={studySet} onExit={() => setMode(AppMode.HOME)} />}
        {mode === AppMode.CUSTOM_SET_STUDY && <CustomSetStudyMode words={studySet} onExit={() => setMode(AppMode.CUSTOM_SETS)} />}
        
        {mode === AppMode.CUSTOM_SETS && (
            <CustomSetManager 
                words={customSetWords} 
                onExit={() => setMode(AppMode.HOME)} 
                onUploadNewSet={set => { setActiveSetName(set); setShowUploadModal(true); }}
                onRefresh={async () => { await loadCustomSets(session?.user?.id); }}
                onRenameCustomSetLocally={(old, name) => setCustomSetWords(prev => prev.map(w => w.set_name === old ? {...w, set_name: name} : w))}
                onPlaySet={set => { setStudySet(set); setMode(AppMode.CUSTOM_SET_STUDY); }}
            />
        )}

        {mode === AppMode.HOME && (
          <>
            <Dashboard 
                userEmail={session.user.email} words={words} onModeSelect={mode => {
                    if (mode === AppMode.SENTENCES) {
                        setShowSentenceSelectModal(true);
                    } else { 
                        // Quiz Modu için özel Resume mantığı
                        if (mode === AppMode.QUIZ) {
                            const savedSetString = localStorage.getItem('lingua_active_set');
                            const savedIndex = localStorage.getItem('lingua_quiz_index');
                            // Eğer kayıtlı bir set ve bitmemiş bir index varsa onu yükle
                            if (savedSetString && savedIndex) {
                                setStudySet(JSON.parse(savedSetString));
                                setMode(mode);
                                return;
                            }
                        }

                        // Yeni set oluştur
                        const newSet = [...words].sort(() => 0.5 - Math.random()).slice(0, 20);
                        setStudySet(newSet);
                        
                        // Seti kaydet
                        localStorage.setItem('lingua_active_set', JSON.stringify(newSet));
                        // Eğer Quiz ise index'i sıfırla
                        if (mode === AppMode.QUIZ) localStorage.setItem('lingua_quiz_index', '0');

                        setMode(mode); 
                    }
                }}
                onAddWord={handleAddWord} onDeleteWord={id => setWordToDelete(id)} onDeleteByDate={d => setDateToDelete(d)}
                onLogout={async () => { 
                    await supabase!.auth.signOut(); 
                    setSession(null); 
                    wordService.clearCache(); // Logout olunca cache temizle
                    setWords([]);
                }}
                onResetAccount={handleResetAccount} // Reset fonksiyonu bağlandı
                onOpenUpload={() => { setActiveSetName(null); setShowUploadModal(true); }}
                onQuickAdd={() => {
                    const btn = document.getElementById('force-open-add-word');
                    if (btn) btn.click();
                }}
            />
            
            {showSentenceSelectModal && (
                <SentenceModeSelectionModal 
                    onClose={() => setShowSentenceSelectModal(false)} 
                    onSelectStandard={() => { 
                        setShowSentenceSelectModal(false); 
                        
                        // Cümle Modu Resume Mantığı
                        const savedSetString = localStorage.getItem('lingua_active_sentence_set');
                        const savedIndex = localStorage.getItem('lingua_sentence_index');
                        
                        // Kayıtlı set varsa yükle
                        if (savedSetString && savedIndex) {
                             setStudySet(JSON.parse(savedSetString));
                        } else {
                             // Yoksa yeni oluştur
                             const validWords = words.filter(w => w.example_sentence && w.example_sentence.length > 3);
                             const newSet = [...validWords].sort(() => 0.5 - Math.random()).slice(0, 20);
                             
                             setStudySet(newSet);
                             localStorage.setItem('lingua_active_sentence_set', JSON.stringify(newSet));
                             localStorage.setItem('lingua_sentence_index', '0');
                        }
                        
                        setMode(AppMode.SENTENCES); 
                    }} 
                    onSelectCustom={() => { 
                        setShowSentenceSelectModal(false); 
                        setMode(AppMode.CUSTOM_SETS); 
                    }} 
                />
            )}
            {(wordToDelete || dateToDelete) && (
                <DeleteModal 
                    onConfirm={confirmDelete} 
                    onCancel={() => { setWordToDelete(null); setDateToDelete(null); }} 
                    description={dateToDelete 
                        ? "Seçilen tarihte yüklenen kartlar silinecektir onaylıyor musunuz?" 
                        : "Bu kelimeyi silmek istediğine emin misin? Bu işlem geri alınamaz."
                    }
                />
            )}
          </>
        )}

        {/* Upload Modal artık her modda çalışması için ana kapsayıcıya taşındı */}
        {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onFileSelect={handleImageFileProcess} isLoading={ocrLoading} />}
    </div>
  );
}
