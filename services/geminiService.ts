
import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedWord {
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
}

// Bekleme yardımcı fonksiyonu
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Görselden kelimeleri yapılandırılmış şema kullanarak çıkarır.
 * Strateji: 
 * 1. gemini-2.0-flash dene.
 * 2. Hata (429) alırsa 3 saniye bekle ve tekrar gemini-2.0-flash dene.
 * 3. Yine hata alırsa gemini-2.0-flash-lite-preview-02-05 dene.
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

  // API Çağrısını yapan yardımcı fonksiyon
  const callApi = async (modelName: string) => {
      const response = await ai.models.generateContent({
          model: modelName,
          ...promptContent
      });
      return response.text || "";
  };

  // Hata türünü kontrol eden yardımcı fonksiyon
  const isQuotaError = (error: any) => {
      const msg = (error.message || "").toLowerCase();
      return msg.includes("429") || msg.includes("exhausted") || msg.includes("quota");
  };

  try {
    let text = "";
    
    // --- AKILLI RETRY MEKANİZMASI ---
    
    // DENEME 1: Hızlı Model (gemini-2.0-flash)
    try {
        console.log("Attempt 1: Gemini 2.0 Flash");
        text = await callApi('gemini-2.0-flash');
    } catch (err1: any) {
        if (isQuotaError(err1)) {
            console.warn("⚠️ Limit hit on Attempt 1. Waiting 3s...");
            // 3 Saniye bekle (Rate Limit'in sıfırlanması için)
            await delay(3000);
            
            // DENEME 2: Aynı model ile tekrar dene (Genellikle transient hatadır)
            try {
                console.log("Attempt 2: Gemini 2.0 Flash (Retry)");
                text = await callApi('gemini-2.0-flash');
            } catch (err2: any) {
                if (isQuotaError(err2)) {
                    console.warn("⚠️ Limit hit on Attempt 2. Switching to Flash Lite...");
                    await delay(1000); // Kısa bir bekleme daha
                    
                    // DENEME 3: Daha hafif model (Flash Lite)
                    try {
                        console.log("Attempt 3: Gemini Flash Lite");
                        text = await callApi('gemini-2.0-flash-lite-preview-02-05');
                    } catch (err3) {
                        // Artık hepsi başarısız olduysa pes et
                        throw err3;
                    }
                } else {
                    throw err2;
                }
            }
        } else {
            // Quota hatası değilse (örn: Bad Request) direkt fırlat
            throw err1;
        }
    }

    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];

      // --- AKILLI FİLTRELEME (POST-PROCESSING) ---
      const filtered = parsed.filter((item: ExtractedWord) => {
          const eng = item.english.trim();
          
          if (eng.includes('/') || eng.includes('\\')) {
              if (eng.length < 20 && eng.toUpperCase() === eng) return false;
              if (eng.split('/').length > 1 && !eng.includes(' ')) return false;
          }

          if (eng.length < 2) return false;
          if (/^[^a-zA-ZğüşıöçĞÜŞİÖÇ]+$/.test(eng)) return false;

          return true;
      });

      return filtered;

    } catch (parseError) {
      console.error("JSON parse hatası:", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini API Final Error:", error);
    const errMsg = error.message || "";
    
    if (isQuotaError(error)) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    if (errMsg.includes("API key not valid") || errMsg.includes("403") || errMsg.includes("400")) {
        throw new Error("INVALID_API_KEY");
    }
    
    throw new Error("Görsel analiz edilemedi. Lütfen bağlantınızı kontrol edin.");
  }
};
