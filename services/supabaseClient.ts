import { createClient } from '@supabase/supabase-js';
import { Word } from '../types';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const LOCAL_STORAGE_KEY = 'lingua_words_local';

// --- YEREL DEPOLAMA YARDIMCILARI ---
const getLocalWords = (): Word[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const setLocalWords = (words: Word[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(words));
};

const addLocalWordImpl = (word: Omit<Word, 'id' | 'created_at'>): Word | null => {
  const current = getLocalWords();
  if (current.some(w => w.english.toLowerCase() === word.english.toLowerCase())) return null;

  const newWord: Word = {
    ...word,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  setLocalWords([newWord, ...current]);
  return newWord;
};

const bulkAddLocalWordsImpl = (wordsToAdd: Omit<Word, 'id' | 'created_at'>[]) => {
  const current = getLocalWords();
  const existingEnglish = new Set(current.map(w => w.english.toLowerCase()));
  
  const filtered = wordsToAdd
    .filter(w => !existingEnglish.has(w.english.toLowerCase()))
    .map(w => ({
      ...w,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));
  
  if (filtered.length > 0) {
    setLocalWords([...filtered, ...current]);
  }
};

// --- DB MAPPER FONKSİYONLARI ---
// Veritabanındaki sütunları (word_en) Frontend yapısına (english) çevirir
const mapDbToApp = (dbRecord: any): Word => ({
  id: dbRecord.id,
  english: dbRecord.word_en,
  turkish: dbRecord.word_tr,
  example_sentence: dbRecord.example_sentence_en || '',
  turkish_sentence: dbRecord.example_sentence_tr || '', // Tahmini sütun adı
  created_at: dbRecord.created_at,
  user_id: dbRecord.user_id
});

// Frontend yapısını (english) Veritabanı sütunlarına (word_en) çevirir
const mapAppToDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string) => ({
  word_en: word.english,
  word_tr: word.turkish,
  example_sentence_en: word.example_sentence,
  example_sentence_tr: word.turkish_sentence,
  user_id: userId
});

export const wordService = {
  async getAllWords(): Promise<Word[]> {
    let remoteWords: Word[] = [];
    
    if (isSupabaseConfigured && supabase) {
      try {
        // DB sütunlarını çekerken frontend'in beklediği isimlere alias (takma ad) veriyoruz
        // Yöntem 1: Raw SQL mapping yerine JS tarafında map ediyoruz daha güvenli
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn("Supabase veri çekme hatası:", error.message);
        } else if (data) {
           remoteWords = data.map(mapDbToApp);
        }
      } catch (e) {
        console.warn('Supabase erişim sorunu. Yerel veriler kullanılıyor.');
      }
    }
    
    // Yerel ve Uzak verileri birleştir (Çakışmaları önleyerek)
    const local = getLocalWords();
    const combined = [...remoteWords];
    const remoteSet = new Set(remoteWords.map(w => w.english.toLowerCase()));
    
    local.forEach(l => {
      if (!remoteSet.has(l.english.toLowerCase())) {
        combined.push(l);
      }
    });

    return combined.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  },

  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    // 1. Önce yerel kayıt (Yedek)
    const localResult = addLocalWordImpl(word);
    
    // 2. Supabase Kayıt
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapAppToDb(word, userId);

        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        
        if (error) {
          console.warn("Supabase insert hatası:", error.message);
          throw error;
        }
        
        if (data) return mapDbToApp(data);
      } catch (e) {
        console.warn("Supabase ekleme başarısız, sadece yerel kayıt yapıldı.");
      }
    } 
    return localResult;
  },

  async bulkAddWords(wordsToAdd: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<void> {
    if (wordsToAdd.length === 0) return;

    // 1. Yerel Ekleme
    bulkAddLocalWordsImpl(wordsToAdd);

    // 2. Supabase Ekleme
    if (isSupabaseConfigured && supabase) {
      try {
        // Mükerrer kayıt kontrolü için mevcut kelimeleri (word_en) çek
        const { data: existingData, error: fetchError } = await supabase
          .from('words')
          .select('word_en');
        
        if (fetchError) throw fetchError;

        const existingEnglish = new Set(existingData?.map((w: any) => w.word_en.toLowerCase()) || []);
        
        // Sadece yeni olanları filtrele ve DB formatına çevir
        let filtered = wordsToAdd
          .filter(w => !existingEnglish.has(w.english.toLowerCase()))
          .map(w => mapAppToDb(w, userId));

        if (filtered.length > 0) {
          const { error: insertError } = await supabase.from('words').insert(filtered);
          if (insertError) {
             console.warn("Toplu ekleme sırasında hata:", insertError.message);
          }
        }
      } catch (error: any) {
          console.error("Toplu ekleme işlemi tamamlanamadı (DB hatası).", error.message);
      }
    }
  },

  async deleteWord(id: string): Promise<void> {
    // Yerelden sil
    const current = getLocalWords();
    if (current.some(w => w.id === id)) {
        setLocalWords(current.filter(w => w.id !== id));
    }

    // Uzaktan sil
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('words').delete().eq('id', id);
      } catch (e) {}
    }
  }
};