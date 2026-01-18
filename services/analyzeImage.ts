
/**
 * Görseli analiz etmek için Supabase Edge Function'ı (super-handler) çağırır.
 */
export async function analyzeImage(base64Image: string, session: any, signal?: AbortSignal) {
  // Kullanıcının hata ayıklama için istediği log
  console.log("BASE64 IMAGE:", base64Image);

  // Proje bazlı sabitler (supabaseClient.ts ile senkronize)
  const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

  // Base64 verisinin temizlenmesi
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    // Manuel fetch kullanımı, SDK'nın 'invoke' metodundaki bazı ağ kısıtlamalarını aşmamızı sağlar.
    const response = await fetch(`${supabaseUrl}/functions/v1/super-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || anonKey}`,
        // Supabase Edge Function'lara doğrudan fetch yaparken 'apikey' başlığı zorunludur.
        'apikey': anonKey 
      },
      body: JSON.stringify({ imageBase64: cleanBase64 }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Supabase API Yanıt Hatası:", errorData);
      throw new Error(`Servis hatası (${response.status}): Yapay zeka şu an yanıt veremiyor.`);
    }

    const data = await response.json();

    if (!data) {
      console.warn("Servis yanıtı boş.");
      return [];
    }

    // API 'word' anahtarı altında dizi veya tek nesne döndürebilir
    if (data.word) {
      return Array.isArray(data.word) ? data.word : [data.word];
    }
    
    // Eğer doğrudan dizi geliyorsa
    if (Array.isArray(data)) return data;

    return [];
    
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    
    console.error("analyzeImage Genel Hata:", err);
    
    // Ağ seviyesindeki hatalar için daha açıklayıcı mesajlar
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('Edge Function')) {
      throw new Error("Ağ Hatası: Sunucuyla bağlantı kurulamadı. Lütfen internetinizi kontrol edin veya projenin açık olduğundan emin olun.");
    }
    
    throw err;
  }
}
