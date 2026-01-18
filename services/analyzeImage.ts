
/**
 * Görseli analiz etmek için Supabase Edge Function'ı (super-handler) çağırır.
 */
export async function analyzeImage(base64Image: string, session: any, signal?: AbortSignal) {
  const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

  // Kullanıcının talep ettiği şekilde base64 verisinden prefix'i ayırıyoruz
  const pureBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/super-handler`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || anonKey}`,
        'Content-Type': 'application/json',
        'apikey': anonKey 
      },
      body: JSON.stringify({
        imageBase64: pureBase64
      }),
      signal
    });

    // Yanıtın JSON olup olmadığını kontrol ederek oku
    const data = await response.json();

    if (!response.ok) {
      // Hata detayını konsola nesne olarak yazdır (Daha kolay incelenir)
      console.error("Edge Function Error:", data);
      
      if (data.error === "AI processing failed") {
        throw new Error("Yapay zeka görseli anlamlandıramadı. Lütfen yazının daha net olduğu farklı bir görsel deneyin.");
      }
      
      throw new Error(data.error || `Servis hatası (${response.status})`);
    }

    // Gelen veriyi uygulama için dizi formatına getir
    if (data && data.word) {
      return Array.isArray(data.word) ? data.word : [data.word];
    }
    
    if (Array.isArray(data)) return data;

    return [];
    
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error("analyzeImage hatası:", err.message);
    throw err;
  }
}
