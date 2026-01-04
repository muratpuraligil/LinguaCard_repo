
import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedWord {
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
}

/**
 * Görselden kelimeleri yapılandırılmış şema kullanarak çıkarır.
 * Fallback Stratejisi: Önce Flash modelini dener, limit aşılırsa Pro modeline geçer.
 */
export const extractWordsFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedWord[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Ortak Prompt ve Konfigürasyon
  const promptContent = {
    contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data.split(',')[1],
            },
          },
          {
            text: `Analyze the text in this image. Your GOAL is to extract ALL vocabulary items or sentences found.
            
            CRITICAL: PRESERVE ORDER / SIRALAMAYI KORU
            1. You MUST output the items in the EXACT order they appear in the image (reading from top to bottom).
            2. If the items are numbered (1., 2., 3...), the output array MUST follow this numerical sequence exactly. 
            3. DO NOT reorder, DO NOT shuffle, and DO NOT skip numbers. Start from the first number and go down.

            Strictly follow these extraction rules:

            1. **NUMBERED LISTS & SENTENCES (CRITICAL):** 
               - If the image contains a numbered list of sentences (e.g., 1 to 30), you MUST extract EVERY SINGLE LINE in the correct order.
               - **REMOVE NUMBERS:** You MUST remove the leading numbering (e.g., "1.", "2)", "19-") and any immediate whitespace from the start of the sentence.
               - Example: If the image shows "19. Bugün hava güzel.", extract ONLY "Bugün hava güzel." (without the "19.").
               - Use the CLEANED sentence (without number) as both the 'english' word and the 'example_sentence'.

            2. **IGNORE HEADERS & TITLES (VERY IMPORTANT):**
               - DO NOT extract grammar titles, headers, or rule summaries.
               - IGNORE items like: "AM / IS / ARE", "DO / DOES", "HAVE / HAS", "Present Simple", "Unit 1", "Section A".
               - IGNORE strings that contain forward slashes "/" intended as grammar alternatives (e.g., "was/were").
               - Only extract actual sentences or vocabulary words.

            3. **Highlighted Words:**
               - If a specific word is highlighted in a sentence, extract that word as 'english' and the full sentence as 'example_sentence'.

            For each extracted item, return a JSON object with:
            - 'english': The word OR the full sentence found in the image (CLEANED of numbers).
            - 'turkish': The Turkish translation found in the image (or translate it if missing).
            - 'example_sentence': The full sentence containing the word (if it's a sentence list, repeat the 'english' field here).
            - 'turkish_sentence': Turkish translation of the example sentence.
            
            Return ONLY the JSON array. Ensure the array contains ALL items found in the image.`,
          },
        ],
    },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              turkish: { type: Type.STRING },
              example_sentence: { type: Type.STRING },
              turkish_sentence: { type: Type.STRING },
            },
            required: ["english", "turkish", "example_sentence", "turkish_sentence"],
          },
        },
    }
  };

  try {
    let text = "";
    
    // --- FALLBACK MEKANİZMASI ---
    // 1. Önce Hızlı ve Ucuz olan FLASH modelini dene (gemini-2.0-flash)
    try {
        console.log("Attempting with Flash model...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', 
            ...promptContent
        });
        text = response.text || "";
    } catch (error: any) {
        const errMsg = error.message || "";
        
        // Hata Quota/Limit kaynaklı mı kontrol et
        const isQuotaError = errMsg.includes("429") || 
                             errMsg.toLowerCase().includes("exhausted") || 
                             errMsg.toLowerCase().includes("quota");

        if (isQuotaError) {
            // 2. Limit hatası ise PRO modeline geç (gemini-3-pro-preview)
            console.warn("⚠️ Flash model quota exceeded. Switching to PRO model fallback...");
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                ...promptContent
            });
            text = response.text || "";
        } else {
            // Başka bir hataysa (örn: görsel bozuk, ağ hatası) direkt fırlat
            throw error;
        }
    }

    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];

      // --- AKILLI FİLTRELEME (POST-PROCESSING) ---
      // AI bazen prompt'u dinlemeyebilir, kod tarafında kesin temizlik yapıyoruz.
      const filtered = parsed.filter((item: ExtractedWord) => {
          const eng = item.english.trim();
          
          // 1. "AM / IS / ARE" gibi slash içeren başlıkları temizle
          if (eng.includes('/') || eng.includes('\\')) {
              // Eğer içinde slash var ve cümle değilse (kısa ve büyük harfliyse)
              if (eng.length < 20 && eng.toUpperCase() === eng) return false;
              // Sadece "Kelime / Kelime" formatındaysa at
              if (eng.split('/').length > 1 && !eng.includes(' ')) return false;
          }

          // 2. Çok kısa anlamsız şeyleri temizle (örn: "A", "1.")
          if (eng.length < 2) return false;

          // 3. Sadece sayı veya özel karakter olanları temizle
          if (/^[^a-zA-ZğüşıöçĞÜŞİÖÇ]+$/.test(eng)) return false;

          return true;
      });

      return filtered;

    } catch (parseError) {
      console.error("JSON parse hatası:", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini API Hatası Detayı:", error);
    const errMsg = error.message || "";
    
    // Eğer Pro modeli de hata verirse buraya düşer
    if (errMsg.includes("429") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("quota")) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    // Geçersiz key kontrolü
    if (errMsg.includes("API key not valid") || errMsg.includes("403") || errMsg.includes("400")) {
        throw new Error("INVALID_API_KEY");
    }
    
    throw new Error("Görsel analiz edilemedi. Lütfen bağlantınızı kontrol edin.");
  }
};
