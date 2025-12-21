import React, { useState, useEffect } from 'react';
import { AppMode, Word } from './types';
import { supabase, wordService } from './services/supabaseClient';
import { extractWordsFromImage } from './services/geminiService';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import NoWordsModal from './components/NoWordsModal';
import DeleteModal from './components/DeleteModal';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNoWordsModal, setShowNoWordsModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [studySet, setStudySet] = useState<Word[]>([]);
  
  // Silme işlemleri için state'ler
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Test Modu: Auth bypass ediliyor
    setLoadingSession(false);
    loadWords();
  }, []);

  const loadWords = async () => {
    const data = await wordService.getAllWords();
    // En yeniden en eskiye sıralamayı garanti et
    const sortedData = data.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setWords(sortedData);
  };

  const prepareStudySet = (type: 'LATEST' | 'RANDOM' = 'RANDOM') => {
      let source = [...words];
      let setSize = 20;
      if (words.length > 200) setSize = 10;
      else if (words.length > 100) setSize = 15;

      if (type === 'RANDOM') {
          source = source.sort(() => 0.5 - Math.random());
      }
      setStudySet(source.slice(0, setSize));
  };

  const handleModeSelect = (selectedMode: AppMode) => {
      // Önce hiç kelime yok mu kontrol et
      if (words.length === 0) {
          setShowNoWordsModal(true);
          return;
      }

      // Quiz modu için özel sayı kontrolü
      if (words.length < 4 && selectedMode === AppMode.QUIZ) {
          alert("Test modu için en az 4 farklı kelime eklemelisin!");
          return;
      }
      
      prepareStudySet('RANDOM');
      setMode(selectedMode);
  };

  const handleQuickAddRedirect = () => {
      setShowNoWordsModal(false);
      // WordList bileşenine kaydır
      setTimeout(() => {
          const section = document.getElementById('word-list-section');
          if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
              // Butona tıklatarak formu aç (State lift yapmadan pratik çözüm)
              const btn = document.getElementById('quick-add-btn');
              if (btn) btn.click();
          }
      }, 100);
  };

  const handleAddWord = async (english: string, turkish: string, example: string) => {
    try {
      const newWord = await wordService.addWord(
          { english, turkish, example_sentence: example, turkish_sentence: '' }
      );
      if (newWord) {
        setWords(prev => [newWord, ...prev]);
      } else {
        alert("Bu kelime zaten listenizde var.");
      }
    } catch (e) {
      alert("Kelime eklenirken bir sorun oluştu.");
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
    // Tekil Silme
    if (wordToDelete) {
      await wordService.deleteWord(wordToDelete);
      setWords(prev => prev.filter(w => w.id !== wordToDelete));
      setWordToDelete(null);
    }
    
    // Tarihe Göre Toplu Silme
    if (dateToDelete) {
        const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
        
        // Silinecek kelimeleri bul
        const wordsToDelete = words.filter(w => formatDate(w.created_at || '') === dateToDelete);
        
        // Her birini sil
        for (const w of wordsToDelete) {
            await wordService.deleteWord(w.id);
        }

        // State'i güncelle
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
          // Kaç kelime silineceğini hesapla
          const formatDate = (dStr: string) => new Date(dStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
          const count = words.filter(w => formatDate(w.created_at || '') === dateToDelete).length;
          return {
              title: "Toplu Silme İşlemi",
              description: `${dateToDelete} tarihinde eklenen toplam ${count} adet kelimeyi silmek üzeresin. Bu işlem geri alınamaz. Emin misin?`
          };
      }
      return { title: "", description: "" };
  };

  const handleLogout = () => {
      alert("Test Modunda Çıkış Kapalıdır.");
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
          await wordService.bulkAddWords(extracted);
          await loadWords();
          alert(`${extracted.length} yeni kelime görselden başarıyla çıkarıldı!`);
          setShowUploadModal(false);
        } else {
          alert("Görselde okunabilir kelime bulunamadı.");
        }
      } catch (error: any) {
        alert(error.message || "Görsel işlenirken bir hata oluştu.");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loadingSession) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-blue-500 font-bold tracking-widest text-sm uppercase">LinguaCard Başlatılıyor</p>
    </div>
  );

  if (mode === AppMode.FLASHCARDS) return <FlashcardMode words={studySet} onExit={() => setMode(AppMode.HOME)} />;
  if (mode === AppMode.QUIZ) return <QuizMode words={studySet} allWords={words} onExit={() => setMode(AppMode.HOME)} />;
  if (mode === AppMode.SENTENCES) return <SentenceMode words={studySet} onExit={() => setMode(AppMode.HOME)} />;

  const modalProps = getDeleteModalProps();

  return (
    <div className="bg-black min-h-screen text-white">
        <Dashboard 
            userEmail="Test Kullanıcısı"
            words={words}
            onModeSelect={handleModeSelect}
            onAddWord={handleAddWord}
            onDeleteWord={handleRequestDelete}
            onDeleteByDate={handleRequestDeleteByDate}
            onLogout={handleLogout}
            onOpenUpload={() => setShowUploadModal(true)}
        />
        {showUploadModal && (
            <UploadModal 
                onClose={() => setShowUploadModal(false)}
                onImageUpload={handleImageUpload}
                isLoading={ocrLoading}
            />
        )}
        {showNoWordsModal && (
            <NoWordsModal 
                onClose={() => setShowNoWordsModal(false)}
                onOpenUpload={() => setShowUploadModal(true)}
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