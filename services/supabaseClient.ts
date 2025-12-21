import { createClient } from '@supabase/supabase-js';
import { Word } from '../types';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Supabase şemasının geçerli olup olmadığını takip eden bayrak
let isRemoteSchemaValid = true;

const LOCAL_STORAGE_KEY = 'lingua_words_local';

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

export const wordService = {
  async getAllWords(): Promise<Word[]> {
    let remoteWords: Word[] = [];
    
    if (isSupabaseConfigured && supabase && isRemoteSchemaValid) {
      try {
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          // Eğer sütun hatası (42703) veya tablo hatası (42P01) varsa uzaktan erişimi devre dışı bırak
          if (error.code === '42703' || error.code === '42P01') {
            console.error("Supabase şema hatası tespit edildi. Yerel modda devam ediliyor.", error.message);
            isRemoteSchemaValid = false;
          }
          throw error;
        }

        if (data) {
          remoteWords = data as Word[];
        }
      } catch (e) {
        console.warn('Supabase erişim sorunu veya şema uyumsuzluğu. Yerel veriler kullanılıyor.');
      }
    }
    
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
    // Önce yerel olarak kaydet (her zaman güvenli liman)
    const localResult = addLocalWordImpl(word);
    
    if (isSupabaseConfigured && supabase && isRemoteSchemaValid) {
      try {
        const payload: any = { 
          english: word.english, 
          turkish: word.turkish, 
          example_sentence: word.example_sentence, 
          turkish_sentence: word.turkish_sentence 
        };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        
        if (error) {
          if (error.code === '42703') isRemoteSchemaValid = false;
          throw error;
        }
        
        if (data) return data as Word;
      } catch (e) {
        console.error("Supabase ekleme başarısız, yerel kayıt kullanıldı.");
      }
    } 
    return localResult;
  },

  async bulkAddWords(wordsToAdd: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<void> {
    if (wordsToAdd.length === 0) return;

    // Her zaman yerel depolamaya ekle
    bulkAddLocalWordsImpl(wordsToAdd);

    if (isSupabaseConfigured && supabase && isRemoteSchemaValid) {
      try {
        // Mevcut kelimeleri kontrol et (sadece 'english' sütununu seçiyoruz)
        const { data: existingData, error: fetchError } = await supabase
          .from('words')
          .select('english');
        
        if (fetchError) {
          if (fetchError.code === '42703') isRemoteSchemaValid = false;
          throw fetchError;
        }

        const existingEnglish = new Set(existingData?.map((w: any) => w.english.toLowerCase()) || []);
        let filtered: any[] = wordsToAdd.filter(w => !existingEnglish.has(w.english.toLowerCase()));
        
        if (userId) {
          filtered = filtered.map(w => ({ ...w, user_id: userId }));
        }

        if (filtered.length > 0) {
          const { error: insertError } = await supabase.from('words').insert(filtered);
          if (insertError) {
            if (insertError.code === '42703') isRemoteSchemaValid = false;
            throw insertError;
          }
        }
      } catch (error: any) {
          console.error("Toplu ekleme sırasında veritabanı hatası. Veriler sadece yerel olarak saklandı.", error.message);
      }
    }
  },

  async deleteWord(id: string): Promise<void> {
    // Yerelden sil
    const current = getLocalWords();
    if (current.some(w => w.id === id)) {
        setLocalWords(current.filter(w => w.id !== id));
    }

    // Uzaktan silmeyi dene
    if (isSupabaseConfigured && supabase && isRemoteSchemaValid) {
      try {
        await supabase.from('words').delete().eq('id', id);
      } catch (e) {}
    }
  }
};