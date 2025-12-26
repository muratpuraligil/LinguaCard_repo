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

const bulkAddLocalWordsImpl = (wordsToAdd: Omit<Word, 'id' | 'created_at'>[]) => {
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
};

// --- DB MAPPER FONKSİYONLARI ---
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
  set_name: word.set_name // Zorunlu alan
});

export const wordService = {
  // ANA KELİME LİSTESİNİ ÇEKER
  async getAllWords(): Promise<Word[]> {
    let remoteWords: Word[] = [];
    
    if (isSupabaseConfigured && supabase) {
      try {
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
    
    // Yerel ve Uzak verileri birleştir
    const local = getLocalWords();
    const combined = [...remoteWords];
    const remoteIds = new Set(remoteWords.map(w => w.id));
    
    local.forEach(l => {
      if (!remoteIds.has(l.id)) {
        combined.push(l);
      }
    });

    return combined.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  },

  // ÖZEL SET CÜMLELERİNİ ÇEKER
  async getCustomSetWords(): Promise<Word[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('custom_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') { 
            console.warn("Custom sets tablosu henüz oluşturulmamış.");
        } else {
            console.warn("Custom sets çekme hatası:", error.message);
        }
        return [];
      }
      return data ? data.map(mapDbToApp) : [];
    } catch (e) {
      console.error("Custom sets servisi hatası:", e);
      return [];
    }
  },

  // ANA KELİME LİSTESİNE EKLEME
  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    const localResult = addLocalWordImpl(word);
    
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapAppToDb(word, userId);
        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        
        if (error) throw error;
        if (data) return mapDbToApp(data);
      } catch (e) {
        console.warn("Supabase ekleme başarısız, sadece yerel kayıt yapıldı.");
      }
    } 
    return localResult;
  },

  // ANA KELİME LİSTESİNE TOPLU EKLEME (SADECE EKLEME YAPAR, SAYI DÖNMEZ)
  async bulkAddWords(wordsToAdd: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<void> {
    if (wordsToAdd.length === 0) return;

    // Önce Local Storage güncelle (Fallback)
    bulkAddLocalWordsImpl(wordsToAdd);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Adım: Gelen Listeyi Kendi İçinde Tekilleştir
        const uniqueIncoming = new Map();
        wordsToAdd.forEach(w => {
            const key = w.english.trim().toLowerCase();
            if(!uniqueIncoming.has(key)) {
                uniqueIncoming.set(key, w);
            }
        });
        const distinctWordsToAdd = Array.from(uniqueIncoming.values());

        // 2. Adım: Mevcut kelimeleri DB'den kontrol et (Hala veri bütünlüğü için gerekli)
        const { data: existingData, error: fetchError } = await supabase
          .from('words')
          .select('word_en');
        
        if (fetchError) throw fetchError;

        const existingEnglish = new Set(existingData?.map((w: any) => w.word_en.toLowerCase().trim()) || []);
        
        // 3. Adım: Filtrele
        let filtered = distinctWordsToAdd
          .filter(w => !existingEnglish.has(w.english.toLowerCase().trim()))
          .map(w => mapAppToDb(w, userId));

        // 4. Adım: Sadece Ekle
        if (filtered.length > 0) {
          const { error: insertError } = await supabase.from('words').insert(filtered);
          if (insertError) {
             console.warn("Toplu ekleme sırasında hata:", insertError.message);
          }
        }
      } catch (error: any) {
          console.error("Toplu ekleme işlemi tamamlanamadı:", error.message);
      }
    }
  },

  // ÖZEL SET TABLOSUNA TOPLU EKLEME (SADECE EKLEME YAPAR, SAYI DÖNMEZ)
  async addCustomSetItems(items: Omit<Word, 'id' | 'created_at'>[], setName: string, userId?: string): Promise<void> {
     if (!isSupabaseConfigured || !supabase || items.length === 0) return;

     try {
       const uniqueIncoming = new Map();
       items.forEach(w => {
            const key = w.english.trim().toLowerCase();
            if(!uniqueIncoming.has(key)) {
                uniqueIncoming.set(key, w);
            }
       });
       const distinctItems = Array.from(uniqueIncoming.values());

       const { data: existingSetData, error: fetchError } = await supabase
           .from('custom_sets')
           .select('english')
           .eq('set_name', setName);
        
       if (fetchError && fetchError.code !== '42P01') {
           console.warn("Set kontrol hatası:", fetchError.message);
       }

       const existingSetWords = new Set(existingSetData?.map((w: any) => w.english.toLowerCase().trim()) || []);

       const payload = distinctItems
        .filter(item => !existingSetWords.has(item.english.toLowerCase().trim()))
        .map(item => mapAppToCustomDb({ ...item, set_name: setName }, userId));

       if (payload.length > 0) {
           await supabase.from('custom_sets').insert(payload);
       }
       
     } catch (error: any) {
       console.error("Custom set ekleme hatası:", error.message);
       throw error;
     }
  },

  async deleteWord(id: string): Promise<void> {
    const current = getLocalWords();
    if (current.some(w => w.id === id)) {
        setLocalWords(current.filter(w => w.id !== id));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('words').delete().eq('id', id);
      } catch (e) {}
    }
  }
};