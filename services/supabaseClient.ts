
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

const mapDbToApp = (dbRecord: any): Word => ({
  id: dbRecord.id,
  english: dbRecord.word_en || dbRecord.english || '',
  turkish: dbRecord.word_tr || dbRecord.turkish || '',
  example_sentence: dbRecord.example_sentence_en || dbRecord.example_sentence || '',
  turkish_sentence: dbRecord.example_sentence_tr || dbRecord.turkish_sentence || '',
  created_at: dbRecord.created_at,
  user_id: dbRecord.user_id,
  set_name: dbRecord.set_name || undefined,
  is_archived: dbRecord.is_archived || false
});

const mapAppToDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string) => ({
  word_en: word.english.trim(),
  word_tr: word.turkish.trim(),
  example_sentence_en: word.example_sentence.trim(),
  example_sentence_tr: word.turkish_sentence.trim(),
  user_id: userId,
  set_name: word.set_name || null,
  is_archived: word.is_archived || false
});

export const wordService = {
  getCachedWords(): Word[] {
    return getLocalWords();
  },

  clearCache() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },

  async getAllWords(userId?: string): Promise<Word[]> {
    let remoteVocab: Word[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('words').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (!error && data) remoteVocab = data.map(mapDbToApp);
      } catch (e) { console.error(e); }
    }
    
    if (remoteVocab.length > 0) setLocalWords(remoteVocab);
    return remoteVocab.length > 0 ? remoteVocab : getLocalWords();
  },

  async toggleArchive(id: string, isArchived: boolean): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.id === id ? { ...w, is_archived: isArchived } : w));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').update({ is_archived: isArchived }).eq('id', id);
    }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    const finalWord: Word = {
      ...word,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: userId,
      is_archived: false
    };

    const updatedLocal = [finalWord, ...getLocalWords()];
    setLocalWords(updatedLocal);

    if (isSupabaseConfigured && supabase && userId) {
      try {
        const payload = mapAppToDb(finalWord, userId);
        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        if (!error && data) {
            const dbWord = mapDbToApp(data);
            // Update local ID with real DB ID if needed, usually UUID matches but consistent data is better
            const refreshedLocal = updatedLocal.map(w => w.id === finalWord.id ? dbWord : w);
            setLocalWords(refreshedLocal);
            return dbWord;
        }
      } catch (e) { console.error(e); }
    } 
    return finalWord;
  },

  // PERFORMANS ÇÖZÜMÜ: Toplu Ekleme Fonksiyonu
  async addWordsBulk(words: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<Word[]> {
    if (words.length === 0) return [];

    // 1. Frontend için geçici nesneleri oluştur (Tek seferde)
    const newWords: Word[] = words.map(w => ({
        ...w,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: userId,
        is_archived: false
    }));

    // 2. LocalStorage'ı TEK SEFERDE güncelle (IO darboğazını önler)
    const currentWords = getLocalWords();
    const updatedLocal = [...newWords, ...currentWords];
    setLocalWords(updatedLocal);

    // 3. Supabase'e TEK SEFERDE (Bulk Insert) gönder
    if (isSupabaseConfigured && supabase && userId) {
        try {
            const payload = newWords.map(w => mapAppToDb(w, userId));
            // Supabase bulk insert
            const { data, error } = await supabase.from('words').insert(payload).select();
            
            if (!error && data) {
                // DB'den dönen gerçek verilerle local veriyi senkronize et (ID değişimi vs için)
                const dbWords = data.map(mapDbToApp);
                
                // DB'den gelenleri ve önceden var olanları birleştir
                // (Geçici eklediklerimizi silip yerine gerçeklerini koyuyoruz gibi düşünebiliriz ama
                // en temizi listenin başına DB'den gelenleri koymaktır)
                const finalLocal = [...dbWords, ...currentWords];
                setLocalWords(finalLocal);
                return dbWords;
            }
        } catch (e) { 
            console.error("Bulk insert error:", e); 
        }
    }

    return newWords;
  },

  async deleteWord(id: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => w.id !== id));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').delete().eq('id', id);
    }
  },

  async deleteWords(ids: string[]): Promise<void> {
    const currentWords = getLocalWords();
    setLocalWords(currentWords.filter(w => !ids.includes(w.id)));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').delete().in('id', ids);
    }
  },

  async renameCustomSet(oldName: string, newName: string): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.set_name === oldName ? { ...w, set_name: newName } : w));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').update({ set_name: newName }).eq('set_name', oldName);
    }
  },

  async deleteCustomSet(setName: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => w.set_name !== setName));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('words').delete().eq('set_name', setName);
    }
  }
};
