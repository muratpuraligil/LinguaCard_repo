import { supabase } from './supabaseClient';

/**
 * Görseli analiz etmek için Supabase Edge Function'ı (super-handler) çağırır.
 */
export async function analyzeImage(
  base64Image: string,
  session: any,
  signal?: AbortSignal,
  analysisType: 'general' | 'document' = 'general'
) {
  // KESİN VE DOĞRU ÇÖZÜM: Prefix'i ayır ve mimeType'ı dinamik yakala
  const [meta, pureBase64] = base64Image.split(",");
  const mimeType = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg"; // Fallback olarak jpeg

  try {
    // raw fetch yerine supabase client kullanıyoruz.
    // Bu sayede Auth headerları ve token yönetimi otomatik yapılıyor.
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: {
        imageBase64: pureBase64,
        mimeType: mimeType,
        analysisType: analysisType
      },
      headers: {
        // Ekstra header gerekirse buraya eklenebilir ama invoke() auth header'ı otomatik ekler.
      }
    });

    if (error) {
      console.error("Edge Function Error:", error);

      // Supabase FunctionsHttpError objesi dönebilir
      const contextMsg = error instanceof Error ? error.message : "Bilinmeyen hata";

      if (contextMsg.includes("Unauthorized") || contextMsg.includes("Jwt")) {
        throw new Error("Oturum süreniz dolmuş olabilir. Lütfen sayfayı yenileyip tekrar giriş yapın (401).");
      }

      throw new Error(contextMsg || "Servis hatası");
    }

    if (!data) {
      throw new Error("Servisten boş yanıt döndü.");
    }

    // Edge Function başarı durumunda { word: [...] } veya { error: ... } dönebilir.
    // Ancak invoke(), fonksiyon 2xx dönse bile body'yi 'data' içine koyar.
    // Eğer fonksiyonumuz catch bloğuna girip 500 dönerse, invoke() bunu 'error' olarak döndürür.

    // Fonksiyon başarılı çalıştı ama mantıksal hata döndürdüyse (örn. AI analiz edemedi):
    if (data.error) {
      if (data.error === "AI processing failed") {
        throw new Error("Yapay zeka görseli anlamlandıramadı. Lütfen yazının daha net olduğu farklı bir görsel deneyin.");
      }
      throw new Error(data.error);
    }

    if (data.word) {
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
