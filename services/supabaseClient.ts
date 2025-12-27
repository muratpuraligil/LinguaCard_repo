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

const addLocalWordImpl = (word: Omit<Word, 'id' | 'created_at'>): Word | null => {
  const current = getLocalWords();
  const exists = current.some(w => 
    w.english.toLowerCase().trim() === word.english.toLowerCase().trim() && 
    w.set_name === word.set_name
  );
  
  if (exists) return null;

  const newWord: Word = {
    ...word,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  setLocalWords([newWord, ...current]);
  return newWord;
};

const bulkAddLocalWordsImpl = (wordsToAdd: Omit<Word, 'id' | 'created_at'>[]): number => {
  const current = getLocalWords();
  const existingEnglish = new Set(current.map(w => w.english.toLowerCase().trim()));
  
  const filtered = wordsToAdd
    .filter(w => !existingEnglish.has(w.english.toLowerCase().trim()))
    .map(w => ({
      ...w,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));
  
  if (filtered.length > 0) {
    setLocalWords([...filtered, ...current]);
  }
  return filtered.length;
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

const mapAppToCustomDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string) => ({
  english: word.english.trim(),
  turkish: word.turkish.trim(),
  example_sentence: word.example_sentence.trim(),
  turkish_sentence: word.turkish_sentence.trim(),
  user_id: userId,
  set_name: word.set_name
});

export const wordService = {
  async getAllWords(): Promise<Word[]> {
    let remoteWords: Word[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) remoteWords = data.map(mapDbToApp);
      } catch (e) {}
    }
    const local = getLocalWords();
    const combined = [...remoteWords];
    const remoteIds = new Set(remoteWords.map(w => w.id));
    local.forEach(l => { if (!remoteIds.has(l.id)) combined.push(l); });
    return combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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
    const localResult = addLocalWordImpl(word);
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapAppToDb(word, userId);
        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        if (!error && data) return mapDbToApp(data);
      } catch (e) {}
    } 
    return localResult;
  },

  async bulkAddWords(wordsToAdd: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<number> {
    if (wordsToAdd.length === 0) return 0;
    const localAdded = bulkAddLocalWordsImpl(wordsToAdd);

    if (isSupabaseConfigured && supabase) {
      try {
        const uniqueIncoming = new Map();
        wordsToAdd.forEach(w => {
            const key = w.english.trim().toLowerCase();
            if(!uniqueIncoming.has(key)) uniqueIncoming.set(key, w);
        });
        const distinctWordsToAdd = Array.from(uniqueIncoming.values());

        const { data: existingData, error: fetchError } = await supabase.from('words').select('word_en');
        if (fetchError) throw fetchError;

        const existingEnglish = new Set(existingData?.map((w: any) => w.word_en.toLowerCase().trim()) || []);
        let filtered = distinctWordsToAdd
          .filter(w => !existingEnglish.has(w.english.toLowerCase().trim()))
          .map(w => mapAppToDb(w, userId));

        if (filtered.length > 0) {
          const { error: insertError } = await supabase.from('words').insert(filtered);
          if (insertError) throw insertError;
          return filtered.length;
        }
        return 0;
      } catch (error: any) {
          console.error("Toplu ekleme hatası:", error.message);
          return localAdded;
      }
    }
    return localAdded;
  },

  async addCustomSetItems(items: Omit<Word, 'id' | 'created_at'>[], setName: string, userId?: string): Promise<number> {
     if (!isSupabaseConfigured || !supabase || items.length === 0) return 0;
     try {
       const uniqueIncoming = new Map();
       items.forEach(w => {
            const key = w.english.trim().toLowerCase();
            if(!uniqueIncoming.has(key)) uniqueIncoming.set(key, w);
       });
       const distinctItems = Array.from(uniqueIncoming.values());

       const { data: existingSetData, error: fetchError } = await supabase
           .from('custom_sets')
           .select('english')
           .eq('set_name', setName);
        
       if (fetchError && fetchError.code !== '42P01') throw fetchError;

       const existingSetWords = new Set(existingSetData?.map((w: any) => w.english.toLowerCase().trim()) || []);
       const payload = distinctItems
        .filter(item => !existingSetWords.has(item.english.toLowerCase().trim()))
        .map(item => mapAppToCustomDb({ ...item, set_name: setName }, userId));

       if (payload.length > 0) {
           const { error: insertError } = await supabase.from('custom_sets').insert(payload);
           if (insertError) throw insertError;
           return payload.length;
       }
       return 0;
     } catch (error: any) {
       console.error("Custom set ekleme hatası:", error.message);
       throw error;
     }
  },

  async deleteWord(id: string): Promise<void> {
    const current = getLocalWords();
    if (current.some(w => w.id === id)) setLocalWords(current.filter(w => w.id !== id));
    if (isSupabaseConfigured && supabase) {
      try { await supabase.from('words').delete().eq('id', id); } catch (e) {}
    }
  },

  async deleteCustomSet(setName: string): Promise<void> {
      if (!isSupabaseConfigured || !supabase) return;
      try {
          const { error } = await supabase.from('custom_sets').delete().eq('set_name', setName);
          if (error) throw error;
      } catch (e) {
          console.error("Set silme hatası", e);
          throw e;
      }
  },

  async renameCustomSet(oldName: string, newName: string): Promise<void> {
      if (!isSupabaseConfigured || !supabase) return;
      try {
          const { error } = await supabase.from('custom_sets').update({ set_name: newName }).eq('set_name', oldName);
          if (error) throw error;
      } catch (e) {
          console.error("Set isimlendirme hatası", e);
          throw e;
      }
  }
};