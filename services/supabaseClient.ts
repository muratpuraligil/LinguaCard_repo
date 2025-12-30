
import { createClient } from '@supabase/supabase-js';
import { Word } from '../types';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

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

// --- Formatlama Fonksiyonları ---

// İngilizce Kelimeler İçin Formatlayıcı
const formatEnglishWord = (str: string): string => {
  if (!str) return '';
  
  // 1. Adım: Türkçe klavye hatalarını düzelt (Stupıd -> Stupid)
  let cleaned = str
    .replace(/ı/g, 'i')  // Noktasız ı -> i
    .replace(/İ/g, 'I'); // Büyük noktalı İ -> I

  // 2. Adım: İngilizce kurallarına göre Title Case yap
  return cleaned.split(' ')
    .filter(w => w.length > 0)
    .map(word => word.charAt(0).toLocaleUpperCase('en-US') + word.slice(1).toLocaleLowerCase('en-US'))
    .join(' ');
};

// Türkçe Kelimeler İçin Formatlayıcı
const formatTurkishWord = (str: string): string => {
  if (!str) return '';
  // Türkçe kurallarına göre Title Case (Ilık -> Ilık, İstanbul -> İstanbul)
  return str.split(' ')
    .filter(w => w.length > 0)
    .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
};

const mapDbToApp = (dbRecord: any): Word => ({
  id: dbRecord.id,
  english: dbRecord.english || dbRecord.word_en || '',
  turkish: dbRecord.turkish || dbRecord.word_tr || '',
  example_sentence: dbRecord.example_sentence || dbRecord.example_sentence_en || '',
  turkish_sentence: dbRecord.turkish_sentence || dbRecord.example_sentence_tr || '',
  created_at: dbRecord.created_at,
  user_id: dbRecord.user_id,
  set_name: dbRecord.set_name || undefined
});

const mapAppToDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string) => ({
  word_en: word.english.trim(),
  word_tr: word.turkish.trim(),
  example_sentence_en: word.example_sentence.trim(),
  example_sentence_tr: word.turkish_sentence.trim(),
  user_id: userId,
  set_name: word.set_name || null
});

export const wordService = {
  getCachedWords(): Word[] {
    return getLocalWords();
  },

  async getAllWords(): Promise<Word[]> {
    const local = getLocalWords();
    let remoteWords: Word[] = [];
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) remoteWords = data.map(mapDbToApp);
      } catch (e) {
        console.error("Supabase fetch error:", e);
      }
    }
    
    const wordMap = new Map<string, Word>();
    
    // Remote verileri ekle (Öncelikli)
    remoteWords.forEach(w => wordMap.set(w.english.toLowerCase().trim(), w));
    // Lokal verileri ekle (Eğer remote'da yoksa)
    local.forEach(w => {
        const key = w.english.toLowerCase().trim();
        if (!wordMap.has(key)) {
            wordMap.set(key, w);
        }
    });
    
    const finalWords = Array.from(wordMap.values()).sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // Her zaman son hali lokale de yansıt
    setLocalWords(finalWords);
    return finalWords;
  },

  async getCustomSetWords(): Promise<Word[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase.from('custom_sets').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data ? data.map(mapDbToApp) : [];
    } catch (e) { return []; }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    const formattedWord = {
        ...word,
        english: formatEnglishWord(word.english),
        turkish: formatTurkishWord(word.turkish)
    };

    const currentLocal = getLocalWords();
    const isDuplicate = currentLocal.some(w => w.english.toLowerCase().trim() === formattedWord.english.toLowerCase().trim());
    
    if (isDuplicate) return null;

    let finalWord: Word = {
      ...formattedWord,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: userId
    };

    // Önce lokale kaydet (Güvenlik için)
    const updatedLocal = [finalWord, ...currentLocal];
    setLocalWords(updatedLocal);

    if (isSupabaseConfigured && supabase && userId) {
      try {
        const payload = mapAppToDb(formattedWord, userId);
        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        if (!error && data) {
            const dbWord = mapDbToApp(data);
            // Lokal kaydı DB'den gelen ID ile güncelle
            setLocalWords(updatedLocal.map(w => w.id === finalWord.id ? dbWord : w));
            return dbWord;
        }
      } catch (e) {
        console.error("Supabase insert error, kept local only");
      }
    } 

    return finalWord;
  },

  async bulkAddWords(wordsToAdd: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<number> {
    if (wordsToAdd.length === 0) return 0;
    
    const formattedWordsToAdd = wordsToAdd.map(w => ({
        ...w,
        english: formatEnglishWord(w.english),
        turkish: formatTurkishWord(w.turkish)
    }));

    const currentWords = getLocalWords();
    const existingEnglish = new Set(currentWords.map(w => w.english.toLowerCase().trim()));
    
    const newWords = formattedWordsToAdd.filter(w => !existingEnglish.has(w.english.toLowerCase().trim()));
    
    if (newWords.length === 0) return 0;

    const wordsWithIds = newWords.map(w => ({
      ...w,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: userId
    }));

    const updatedLocal = [...wordsWithIds, ...currentWords];
    setLocalWords(updatedLocal);

    if (isSupabaseConfigured && supabase && userId) {
      try {
          const payload = newWords.map(w => mapAppToDb(w, userId));
          await supabase.from('words').insert(payload);
      } catch (e) {
          console.error("Supabase bulk insert error");
      }
    }

    return wordsWithIds.length;
  },

  async addCustomSetItems(items: Omit<Word, 'id' | 'created_at'>[], setName: string, userId?: string): Promise<number> {
     if (!isSupabaseConfigured || !supabase || items.length === 0) return 0;
     try {
       const { data: existingSetData } = await supabase.from('custom_sets').select('english').eq('set_name', setName);
       const existingSetWords = new Set(existingSetData?.map((w: any) => w.english.toLowerCase().trim()) || []);
       
       const payload = items
        .filter(item => !existingSetWords.has(item.english.toLowerCase().trim()))
        .map(item => ({
            english: formatEnglishWord(item.english),
            turkish: formatTurkishWord(item.turkish),
            example_sentence: item.example_sentence.trim(),
            turkish_sentence: item.turkish_sentence.trim(),
            user_id: userId,
            set_name: setName
        }));

       if (payload.length > 0) {
           const { error: insertError } = await supabase.from('words').insert(payload); // custom_sets yerine words veya uygun tablo
           if (insertError) throw insertError;
           return payload.length;
       }
       return 0;
     } catch (error: any) {
       console.error("Custom set add error:", error.message);
       throw error;
     }
  },

  async deleteWord(id: string): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.filter(w => w.id !== id));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').delete().eq('id', id);
    }
  },

  async deleteCustomSet(setName: string): Promise<void> {
      if (!isSupabaseConfigured || !supabase) return;
      await supabase.from('words').delete().eq('set_name', setName);
  },

  async renameCustomSet(oldName: string, newName: string): Promise<void> {
      if (!isSupabaseConfigured || !supabase) return;
      await supabase.from('words').update({ set_name: newName }).eq('set_name', oldName);
  }
};
