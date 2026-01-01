
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
  { english: 'Planes', turkish: 'Uçaklar', example_sentence: 'The planes are at the airport.', turkish_sentence: 'Uçaklar havaalanında.' },
  { english: 'Photos', turkish: 'Fotoğraflar', example_sentence: 'The photos are in the album.', turkish_sentence: 'Fotoğraflar albümde.' },
  { english: 'Dangerous Animals', turkish: 'Tehlikeli Hayvanlar', example_sentence: 'These are dangerous animals.', turkish_sentence: 'Bunlar tehlikeli hayvanlar.' },
  { english: 'Good Books', turkish: 'İyi Kitaplar', example_sentence: 'These are good books.', turkish_sentence: 'Bunlar iyi kitaplar.' },
  { english: 'Trees', turkish: 'Ağaçlar', example_sentence: 'Are the trees green or gray?', turkish_sentence: 'Ağaçlar yeşil mi yoksa gri mi?' },
  { english: 'Clouds', turkish: 'Bulutlar', example_sentence: 'Are the clouds brown or white?', turkish_sentence: 'Bulutlar kahverengi mi yoksa beyaz mı?' },
  { english: 'Dictionary', turkish: 'Sözlük', example_sentence: 'Is this an English dictionary or a French one?', turkish_sentence: 'Bu, İngilizce mi yoksa Fransızca sözlük mü?' },
  { english: 'Sports Car', turkish: 'Spor Araba', example_sentence: 'Is it a sports car or a classic car?', turkish_sentence: 'Bir spor araba mı yoksa klasik bir araba mı?' },
  { english: 'Egypt', turkish: 'Mısır', example_sentence: 'Is Egypt in Europe or in Africa?', turkish_sentence: 'Mısır Avrupa’da mı yoksa Afrika’da mı?' },
  { english: 'Butterfly', turkish: 'Kelebek', example_sentence: 'Is this a butterfly or a bee?', turkish_sentence: 'Bu, kelebek mi arı mı?' },
];

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
      // custom_sets view'ı yerine doğrudan words tablosundan set_name'i dolu olanları çekiyoruz
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
       // Bu set ve kullanıcı için var olan kelimeleri çek (word_en sütununu kontrol et)
       const { data: existingSetData } = await supabase
         .from('words')
         .select('word_en')
         .eq('set_name', setName)
         .eq('user_id', userId);

       const existingSetWords = new Set(existingSetData?.map((w: any) => (w.word_en || '').toLowerCase().trim()) || []);
       
       // İtemleri formatla ve set_name ekle
       const formattedItems = items.map(item => ({
            ...item,
            english: formatEnglishWord(item.english),
            turkish: formatTurkishWord(item.turkish),
            set_name: setName
       }));

       // Zaten var olanları filtrele (Duplicate önleme)
       const itemsToInsert = formattedItems.filter(item => 
           !existingSetWords.has(item.english.toLowerCase().trim())
       );

       if (itemsToInsert.length > 0) {
           // DB formatına çevir (word_en, word_tr vb.)
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

  // --- Yeni Kullanıcı Başlatma Fonksiyonu ---
  async initializeDefaults(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    
    try {
      // 1. Kullanıcının hiç kelimesi var mı kontrol et
      const { count } = await supabase.from('words').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      
      // Eğer hiç kelimesi yoksa, varsayılan 5 kelimeyi ekle
      if (count === 0) {
         console.log("Kullanıcı yeni, varsayılan kelimeler ekleniyor...");
         await this.bulkAddWords(DEFAULT_VOCAB, userId);
      }

      // 2. "am-is-are" seti kontrolü (İyileştirilmiş)
      // Sadece varlığına bakmak yetmez, eksikse tamamlamalı.
      const { data: currentSetWords } = await supabase
        .from('words')
        .select('id')
        .eq('user_id', userId)
        .eq('set_name', 'am-is-are');

      // Eğer set hiç yoksa veya eksikse (örn: daha önce hatalı yüklenmişse)
      if (!currentSetWords || currentSetWords.length < DEFAULT_SENTENCE_SET.length) {
        console.log("Varsayılan cümle seti (am-is-are) eksik veya yok, tamamlanıyor...");
        await this.addCustomSetItems(DEFAULT_SENTENCE_SET, 'am-is-are', userId);
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
