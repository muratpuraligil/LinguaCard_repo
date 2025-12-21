import React, { useState, useEffect } from 'react';
import { AppMode, Word } from './types';
import { supabase, wordService } from './services/supabaseClient';
import { extractWordsFromImage } from './services/geminiService';
import { parseExcelFile } from './services/excelParser';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import NoWordsModal from './components/NoWordsModal';
import DeleteModal from './components/DeleteModal';
import SentenceModeSelectionModal from './components/SentenceModeSelectionModal';
import CustomSetManager from './components/CustomSetManager';
import Auth from './components/Auth';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // İki ayrı veri kaynağı:
  // 1. words: Ana kelime listesi (Kelime Listem)
  // 2. customSetWords: Özel Cümle Setleri (Ayrı Tablo)
  const [words, setWords] = useState<Word[]>([]);
  const [customSetWords, setCustomSetWords] = useState<Word[]>([]);

  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNoWordsModal, setShowNoWordsModal] = useState(false);
  const [showSentenceSelectModal, setShowSentenceSelectModal] = useState(false);
  
  const [ocrLoading, setOcrLoading] = useState(false);
  const [studySet, setStudySet] = useState<Word[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  
  // Set yönetimi için state
  const [activeSetName, setActiveSetName] = useState<string | null>(null); // Yükleme sırasında set ismini tutar

  // Silme işlemleri için state'ler
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Supabase oturum kontrolü
    if (!supabase) {
        setLoadingSession(false);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          loadWords();
          loadCustomSets(); // Özel setleri de yükle
      }
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          loadWords();
          loadCustomSets();
      } else {
          setWords([]);
          setCustomSetWords([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadWords = async () => {
    const data = await wordService.getAllWords();
    const sortedData = data.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setWords(sortedData);
  };

  const loadCustomSets = async () => {
      const data = await wordService.getCustomSetWords();
      setCustomSetWords(data);
  };

  const prepareStudySet = (type: 'LATEST' | 'RANDOM' = 'RANDOM', sourceWords?: Word[]) => {
      let source = sourceWords ? [...sourceWords] : [...words];
      let setSize = 20;
      
      // Eğer özel bir kaynak (set) verilmişse hepsini al, kesme
      if (sourceWords) {
          setStudySet(source);
          return;
      }

      if (words.length > 200) setSize = 10;
      else if (words.length > 100) setSize = 15;

      if (type === 'RANDOM') {
          source = source.sort(() => 0.5 - Math.random());
      }
      setStudySet(source.slice(0, setSize));
  };

  const handleModeSelect = (selectedMode: AppMode) => {
      if (selectedMode === AppMode.SENTENCES) {
          setShowSentenceSelectModal(true);
          return;
      }

      // Quiz modu için özel sayı kontrolü
      if (selectedMode === AppMode.QUIZ) {
          if (words.length < 4) {
              alert("Test modu için en az 4 farklı kelime eklemelisin!");
              return;
          }
      }
      
      // Flashcards veya Quiz için kelime yoksa uyar (Sentences modu hariç, çünkü o menüden seçiliyor)
      if (selectedMode !== AppMode.CUSTOM_SETS && words.length === 0) {
          setShowNoWordsModal(true);
          return;
      }

      prepareStudySet('RANDOM');
      setMode(selectedMode);
  };

  // Cümle Modu Seçimleri
  const handleSentenceModeStandard = () => {
      if (words.length === 0) {
          alert("Henüz kelime listen boş.");
          return;
      }
      setShowSentenceSelectModal(false);
      prepareStudySet('RANDOM');
      setMode(AppMode.SENTENCES);
  };

  const handleSentenceModeCustom = () => {
      setShowSentenceSelectModal(false);
      setMode(AppMode.CUSTOM_SETS);
  };

  const handleQuickAddRedirect = () => {
      setShowNoWordsModal(false);
      setTimeout(() => {
          const section = document.getElementById('word-list-section');
          if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
              const btn = document.getElementById('quick-add-btn');
              if (btn) btn.click();
          }
      }, 100);
  };

  const handleAddWord = async (english: string, turkish: string, example: string): Promise<boolean> => {
    try {
      const userId = session?.user?.id;
      const newWord = await wordService.addWord(
          { english, turkish, example_sentence: example, turkish_sentence: '' },
          userId
      );
      if (newWord) {
        setWords(prev => [newWord, ...prev]);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.error("Kelime ekleme hatası", e);
      return false;
    }
  };

  const handleRequestDelete = (id: string) => {
    setWordToDelete(id);
    setDateToDelete(null);
  };

  const handleRequestDeleteByDate = (date: string) => {
    setDateToDelete(date);
    setWordToDelete(null);
  };

  const confirmDelete = async () => {
    if (wordToDelete) {
      await wordService.deleteWord(wordToDelete);
      setWords(prev => prev.filter(w => w.id !== wordToDelete));
      setWordToDelete(null);
    }
    
    if (dateToDelete) {
        const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const wordsToDelete = words.filter(w => formatDate(w.created_at || '') === dateToDelete);
        for (const w of wordsToDelete) {
            await wordService.deleteWord(w.id);
        }
        setWords(prev => prev.filter(w => formatDate(w.created_at || '') !== dateToDelete));
        setDateToDelete(null);
    }
  };

  const getDeleteModalProps = () => {
      if (wordToDelete) {
          return {
              title: "Kelimeyi Sil",
              description: "Bu kelimeyi silmek istediğine emin misin? Bu işlem geri alınamaz."
          };
      }
      if (dateToDelete) {
          const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
          const count = words.filter(w => formatDate(w.created_at || '') === dateToDelete).length;
          return {
              title: "Toplu Silme İşlemi",
              description: `${dateToDelete} tarihinde eklenen toplam ${count} adet kelimeyi silmek üzeresin. Bu işlem geri alınamaz. Emin misin?`
          };
      }
      return { title: "", description: "" };
  };

  const handleLogout = async () => {
      if (supabase) {
          await supabase.auth.signOut();
          setSession(null);
          setWords([]);
          setCustomSetWords([]);
      }
  };

  const handleUploadNewSet = (setName: string) => {
      setActiveSetName(setName);
      setShowUploadModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = file.type;
    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      try {
        const extracted = await extractWordsFromImage(base64, mimeType);
        if (extracted && extracted.length > 0) {
          
          if (activeSetName) {
             // 1. DURUM: Özel Set Yüklemesi (Yeni Tabloya)
             await wordService.addCustomSetItems(extracted, activeSetName, session?.user?.id);
             await loadCustomSets(); // Custom set listesini yenile
             alert(`${extracted.length} adet cümle '${activeSetName}' setine eklendi! (Kelime listesine eklenmedi)`);
          } else {
             // 2. DURUM: Normal Kelime Yüklemesi (Ana Tabloya)
             await wordService.bulkAddWords(extracted, session?.user?.id);
             await loadWords(); // Ana listeyi yenile
             alert(`${extracted.length} adet kelime listenize eklendi!`);
          }
          
          setShowUploadModal(false);
          setActiveSetName(null);
        } else {
          alert("Görselde okunabilir veri bulunamadı.");
        }
      } catch (error: any) {
        alert(error.message || "Görsel işlenirken bir hata oluştu.");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setImportLoading(true);
      try {
          const extractedWords = await parseExcelFile(file);
          if (extractedWords && extractedWords.length > 0) {
              await wordService.bulkAddWords(extractedWords, session?.user?.id);
              await loadWords();
              alert(`${extractedWords.length} adet kelime listenize eklendi!`);
          } else {
              alert("Dosyada uygun formatta kelime bulunamadı. Lütfen sütunların (İngilizce, Türkçe) dolu olduğundan emin olun.");
          }
      } catch (error: any) {
          alert("Excel yükleme hatası: " + error.message);
      } finally {
          setImportLoading(false);
          e.target.value = '';
      }
  };

  if (loadingSession) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-blue-500 font-bold tracking-widest text-sm uppercase">LinguaCard Başlatılıyor</p>
    </div>
  );

  if (!session) {
      return <Auth />;
  }

  if (mode === AppMode.FLASHCARDS) return <FlashcardMode words={studySet} onExit={() => setMode(AppMode.HOME)} />;
  if (mode === AppMode.QUIZ) return <QuizMode words={studySet} allWords={words} onExit={() => setMode(AppMode.HOME)} />;
  
  if (mode === AppMode.SENTENCES) {
      return <SentenceMode words={studySet} onExit={() => setMode(AppMode.HOME)} />;
  }
  
  if (mode === AppMode.CUSTOM_SETS) {
      return (
        <>
            <CustomSetManager 
                words={customSetWords} // ARTIK SADECE ÖZEL SETLER GÖNDERİLİYOR
                onExit={() => setMode(AppMode.HOME)} 
                onUploadNewSet={handleUploadNewSet}
                onPlaySet={(setWords) => {
                    prepareStudySet('RANDOM', setWords);
                    setMode(AppMode.SENTENCES);
                }}
            />
             {showUploadModal && (
                <UploadModal 
                    onClose={() => setShowUploadModal(false)}
                    onImageUpload={handleImageUpload}
                    isLoading={ocrLoading}
                />
            )}
        </>
      );
  }

  const modalProps = getDeleteModalProps();

  return (
    <div className="bg-black min-h-screen text-white">
        {importLoading && (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center">
                 <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                 <h2 className="text-2xl font-black text-white">Excel İşleniyor</h2>
                 <p className="text-slate-400 mt-2">Kelimeler veritabanına aktarılıyor...</p>
             </div>
        )}

        <Dashboard 
            userEmail={session.user.email}
            words={words} // SADECE ANA KELİME LİSTESİ
            onModeSelect={handleModeSelect}
            onAddWord={handleAddWord}
            onDeleteWord={handleRequestDelete}
            onDeleteByDate={handleRequestDeleteByDate}
            onLogout={handleLogout}
            onOpenUpload={() => { setActiveSetName(null); setShowUploadModal(true); }} // Normal yükleme
            onQuickAdd={handleQuickAddRedirect}
            onExcelUpload={handleExcelUpload}
        />
        
        {showUploadModal && (
            <UploadModal 
                onClose={() => setShowUploadModal(false)}
                onImageUpload={handleImageUpload}
                isLoading={ocrLoading}
            />
        )}

        {showSentenceSelectModal && (
            <SentenceModeSelectionModal 
                onClose={() => setShowSentenceSelectModal(false)}
                onSelectStandard={handleSentenceModeStandard}
                onSelectCustom={handleSentenceModeCustom}
            />
        )}

        {showNoWordsModal && (
            <NoWordsModal 
                onClose={() => setShowNoWordsModal(false)}
                onOpenUpload={() => { setActiveSetName(null); setShowUploadModal(true); }}
                onQuickAdd={handleQuickAddRedirect}
            />
        )}
        {(wordToDelete || dateToDelete) && (
            <DeleteModal 
                title={modalProps.title}
                description={modalProps.description}
                onConfirm={confirmDelete}
                onCancel={() => { setWordToDelete(null); setDateToDelete(null); }}
            />
        )}
    </div>
  );
}