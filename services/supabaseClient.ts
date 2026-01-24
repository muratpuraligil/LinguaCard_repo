
import { createClient } from '@supabase/supabase-js';
import { Word } from '../types';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

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
  is_archived: !!dbRecord.is_archived
});

const mapAppToDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string, includeArchiveField: boolean = true) => {
  const payload: any = {
    word_en: word.english.trim(),
    word_tr: word.turkish.trim(),
    example_sentence_en: (word.example_sentence || '').trim(),
    example_sentence_tr: (word.turkish_sentence || '').trim(),
    user_id: userId,
    set_name: word.set_name || null
  };

  if (includeArchiveField) {
    payload.is_archived = !!word.is_archived;
  }

  return payload;
};

export const wordService = {
  getCachedWords(): Word[] {
    return getLocalWords();
  },

  clearCache() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },

  async getAllWords(userId?: string): Promise<Word[]> {
    try {
      // is_archived sütunu yoksa hata almamak için select(*) yerine explicit alanlar da denenebilir
      // Ancak PostgREST genellikle eksik sütunlarda 400 hatası verir.
      let query = supabase.from('words').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;

      if (error) {
        // is_archived hatası alırsak, lokal veriye güvenelim ve hatayı loglayalım
        console.warn("Supabase Fetch Warning (Şema hatası olabilir):", error.message);
      }

      if (!error && data) {
        const remoteWords = data.map(mapDbToApp);
        setLocalWords(remoteWords);
        return remoteWords;
      }
    } catch (e) {
      console.error("Critical Word Fetch Error:", e);
    }
    return getLocalWords();
  },

  async toggleArchive(id: string, isArchived: boolean): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.id === id ? { ...w, is_archived: isArchived } : w));

    try {
      const { error } = await supabase.from('words').update({ is_archived: isArchived }).eq('id', id);
      if (error && error.message.includes('is_archived')) {
        console.error("Arşivleme özelliği veritabanında henüz aktif değil. Lütfen SQL komutunu çalıştırın.");
      }
    } catch (e) { }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    const payload = mapAppToDb(word, userId, true);
    let { data, error } = await supabase.from('words').insert([payload]).select().single();

    // Eğer is_archived sütunu yüzünden hata alıyorsak, o alan olmadan tekrar dene
    if (error && error.message.includes('is_archived')) {
      const fallbackPayload = mapAppToDb(word, userId, false);
      const retry = await supabase.from('words').insert([fallbackPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const dbWord = mapDbToApp(data);
      const updated = [dbWord, ...getLocalWords()];
      setLocalWords(updated);
      return dbWord;
    }
    return null;
  },

  async addWordsBulk(words: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<Word[]> {
    if (words.length === 0) return [];

    // Eğer set_name varsa, global "unique" kontrolünü atlıyoruz veya ona göre yapıyoruz.
    // Şimdilik set_name olanlar için direkt ekleme yapalım (Kullanıcı aynı kelimeyi farklı setlerde isteyebilir).
    // Ancak set olmayanlar (normal kelimeler) için kontrol devam etmeli.

    const wordsWithSet = words.filter(w => !!w.set_name);
    const wordsWithoutSet = words.filter(w => !w.set_name);

    let finalWordsToAdd = [...wordsWithSet];

    if (wordsWithoutSet.length > 0) {
      const latestFromDb = await this.getAllWords(userId);
      const dbMap = new Set(latestFromDb.map(w => w.english.toLowerCase().trim()));
      const uniqueSimpleWords = wordsWithoutSet.filter(w => !dbMap.has(w.english.toLowerCase().trim()));
      finalWordsToAdd = [...finalWordsToAdd, ...uniqueSimpleWords];
    }

    if (finalWordsToAdd.length === 0) return [];

    let payload = finalWordsToAdd.map(w => mapAppToDb(w, userId, true));
    let { data, error } = await supabase.from('words').insert(payload).select();

    // Fallback: is_archived alanı yoksa silip tekrar dene
    if (error && error.message.includes('is_archived')) {
      console.warn("is_archived sütunu bulunamadı, bu alan olmadan deneniyor...");
      payload = finalWordsToAdd.map(w => mapAppToDb(w, userId, false));
      const retry = await supabase.from('words').insert(payload).select();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const added = data.map(mapDbToApp);
      // Local cache güncelleme
      const currentLocal = getLocalWords();
      const finalLocal = [...added, ...currentLocal];
      setLocalWords(finalLocal);
      return added;
    }

    if (error) {
      console.error("Supabase Bulk Insert Error:", error.message);
      throw new Error(error.message);
    }

    return [];
  },

  async deleteWord(id: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => w.id !== id));
    await supabase.from('words').delete().eq('id', id);
  },

  async deleteWords(ids: string[]): Promise<void> {
    setLocalWords(getLocalWords().filter(w => !ids.includes(w.id)));
    await supabase.from('words').delete().in('id', ids);
  },

  async renameCustomSet(oldName: string, newName: string): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.set_name === oldName ? { ...w, set_name: newName } : w));
    await supabase.from('words').update({ set_name: newName }).eq('set_name', oldName);
  },

  async deleteCustomSet(setName: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => w.set_name !== setName));
    await supabase.from('words').delete().eq('set_name', setName);
  }
};
