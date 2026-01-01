
import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedWord {
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
}

/**
 * Görselden kelimeleri yapılandırılmış şema kullanarak çıkarır.
 */
export const extractWordsFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedWord[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Daha kararlı sürüm kullanıldı
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
            
            Strictly follow these extraction rules:

            1. **NUMBERED LISTS & SENTENCES (CRITICAL):** 
               - If the image contains a numbered list of sentences (e.g., 1 to 30), you MUST extract EVERY SINGLE LINE. 
               - **DO NOT** summarize, **DO NOT** pick a sample. Extract ALL items found.
               - **REMOVE NUMBERS:** You MUST remove the leading numbering (e.g., "1.", "2)", "19-") and any immediate whitespace from the start of the sentence.
               - Example: If the image shows "19. Bugün hava güzel.", extract ONLY "Bugün hava güzel." (without the "19.").
               - Use the CLEANED sentence (without number) as both the 'english' word and the 'example_sentence'.

            2. **Vocabulary Lists:**
               - Extract matching pairs (e.g., "Word -> Meaning").

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
    });

    const text = response.text;
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error("JSON parse hatası:", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini API Hatası Detayı:", error);
    const errMsg = error.message || "";
    
    // Kota aşımı kontrolü (429 Hatası)
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
