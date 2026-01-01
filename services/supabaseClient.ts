
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

// --- Varsayılan Veriler ---

const DEFAULT_VOCAB = [
  { english: 'Improve', turkish: 'Geliştirmek, iyileştirmek', example_sentence: 'I want to improve my English by practicing every day.', turkish_sentence: 'Her gün pratik yaparak İngilizcemi geliştirmek istiyorum.' },
  { english: 'Decide', turkish: 'Karar vermek', example_sentence: 'She decided to study abroad next year.', turkish_sentence: 'Gelecek yıl yurt dışında okumaya karar verdi.' },
  { english: 'Comfortable', turkish: 'Rahat, konforlu', example_sentence: 'This chair is very comfortable to sit on.', turkish_sentence: 'Bu sandalye oturmak için çok rahat.' },
  { english: 'Enough', turkish: 'Yeterli', example_sentence: 'I don’t have enough time to finish the work today.', turkish_sentence: 'Bugün işi bitirmek için yeterli zamanım yok.' },
  { english: 'Explain', turkish: 'Açıklamak', example_sentence: 'Can you explain this rule again, please?', turkish_sentence: 'Bu kuralı tekrar açıklar mısın lütfen?' },
];

const DEFAULT_SENTENCE_SET = [
  { english: 'The planes are at the airport.', turkish: 'Uçaklar havaalanında.', example_sentence: 'The planes are at the airport.', turkish_sentence: 'Uçaklar havaalanında.' },
  { english: 'The photos are in the album.', turkish: 'Fotoğraflar albümde.', example_sentence: 'The photos are in the album.', turkish_sentence: 'Fotoğraflar albümde.' },
  { english: 'These are dangerous animals.', turkish: 'Bunlar tehlikeli hayvanlar.', example_sentence: 'These are dangerous animals.', turkish_sentence: 'Bunlar tehlikeli hayvanlar.' },
  { english: 'These are good books.', turkish: 'Bunlar iyi kitaplar.', example_sentence: 'These are good books.', turkish_sentence: 'Bunlar iyi kitaplar.' },
  { english: 'Are the trees green or gray?', turkish: 'Ağaçlar yeşil mi yoksa gri mi?', example_sentence: 'Are the trees green or gray?', turkish_sentence: 'Ağaçlar yeşil mi yoksa gri mi?' },
  { english: 'Are the clouds brown or white?', turkish: 'Bulutlar kahverengi mi yoksa beyaz mı?', example_sentence: 'Are the clouds brown or white?', turkish_sentence: 'Bulutlar kahverengi mi yoksa beyaz mı?' },
  { english: 'Is this an English dictionary or a French one?', turkish: 'Bu, İngilizce mi yoksa Fransızca sözlük mü?', example_sentence: 'Is this an English dictionary or a French one?', turkish_sentence: 'Bu, İngilizce mi yoksa Fransızca sözlük mü?' },
  { english: 'Is it a sports car or a classic car?', turkish: 'Bir spor araba mı yoksa klasik bir araba mı?', example_sentence: 'Is it a sports car or a classic car?', turkish_sentence: 'Bir spor araba mı yoksa klasik bir araba mı?' },
  { english: 'Is Egypt in Europe or in Africa?', turkish: 'Mısır Avrupa’da mı yoksa Afrika’da mı?', example_sentence: 'Is Egypt in Europe or in Africa?', turkish_sentence: 'Mısır Avrupa’da mı yoksa Afrika’da mı?' },
  { english: 'Is this a butterfly or a bee?', turkish: 'Bu, kelebek mi arı mı?', example_sentence: 'Is this a butterfly or a bee?', turkish_sentence: 'Bu, kelebek mi arı mı?' },
];

// --- Formatlama Fonksiyonları ---

const formatEnglishWord = (str: string): string => {
  if (!str) return '';
  let cleaned = str.replace(/ı/g, 'i').replace(/İ/g, 'I');
  if (cleaned.includes(' ')) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.charAt(0).toLocaleUpperCase('en-US') + cleaned.slice(1).toLocaleLowerCase('en-US');
};

const formatTurkishWord = (str: string): string => {
  if (!str) return '';
  if (str.includes(' ')) {
      return str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1);
  }
  return str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1).toLocaleLowerCase('tr-TR');
};

const mapDbToApp = (dbRecord: any): Word => ({
  id: dbRecord.id,
  english: dbRecord.word_en || dbRecord.english || '',
  turkish: dbRecord.word_tr || dbRecord.turkish || '',
  example_sentence: dbRecord.example_sentence_en || dbRecord.example_sentence || '',
  turkish_sentence: dbRecord.example_sentence_tr || dbRecord.turkish_sentence || '',
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
    remoteWords.forEach(w => wordMap.set(w.english.toLowerCase().trim(), w));
    local.forEach(w => {
        const key = w.english.toLowerCase().trim();
        if (!wordMap.has(key)) {
            wordMap.set(key, w);
        }
    });
    
    const finalWords = Array.from(wordMap.values()).sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    setLocalWords(finalWords);
    return finalWords;
  },

  async getCustomSetWords(): Promise<Word[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .not('set_name', 'is', null)
        .order('created_at', { ascending: false });
        
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

    const updatedLocal = [finalWord, ...currentLocal];
    setLocalWords(updatedLocal);

    if (isSupabaseConfigured && supabase && userId) {
      try {
        const payload = mapAppToDb(formattedWord, userId);
        const { data, error } = await supabase.from('words').insert([payload]).select().single();
        if (!error && data) {
            const dbWord = mapDbToApp(data);
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
       // Sadece 'word_en' ve 'set_name' ile kontrol et
       const { data: existingSetData } = await supabase
         .from('words')
         .select('word_en') 
         .eq('set_name', setName)
         .eq('user_id', userId);

       const existingSetWords = new Set(existingSetData?.map((w: any) => (w.word_en || '').toLowerCase().trim()) || []);
       
       const formattedItems = items.map(item => ({
            ...item,
            english: formatEnglishWord(item.english),
            turkish: formatTurkishWord(item.turkish),
            set_name: setName
       }));

       const itemsToInsert = formattedItems.filter(item => 
           !existingSetWords.has(item.english.toLowerCase().trim())
       );

       if (itemsToInsert.length > 0) {
           const payload = itemsToInsert.map(item => mapAppToDb(item, userId));
           
           const { error: insertError } = await supabase.from('words').insert(payload); 
           if (insertError) throw insertError;
           return payload.length;
       }
       return 0;
     } catch (error: any) {
       console.error("Custom set add error:", error.message || error);
       throw error;
     }
  },

  // --- Yeni Kullanıcı Başlatma Fonksiyonu (Güçlendirilmiş) ---
  async initializeDefaults(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    
    try {
      // 1. Önce am-is-are setini kontrol et
      const { data: currentSetWords, error: setError } = await supabase
        .from('words')
        .select('id')
        .eq('user_id', userId)
        .eq('set_name', 'am-is-are');

      if (setError) {
          console.error("Set kontrol hatası:", setError);
      }

      // Eğer set yoksa veya eksikse EKLE
      if (!currentSetWords || currentSetWords.length < DEFAULT_SENTENCE_SET.length) {
        console.log("Varsayılan cümle seti eksik, ekleniyor...");
        await this.addCustomSetItems(DEFAULT_SENTENCE_SET, 'am-is-are', userId);
      } else {
        console.log("am-is-are seti hazır.");
      }

      // 2. Varsayılan kelimeleri kontrol et
      const { count } = await supabase.from('words').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (count === 0) {
         console.log("Kullanıcı yeni, varsayılan kelimeler ekleniyor...");
         await this.bulkAddWords(DEFAULT_VOCAB, userId);
      }

    } catch (e: any) {
      console.error("Varsayılan veriler yüklenirken hata:", e.message || e);
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
