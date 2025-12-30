
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
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data.split(',')[1],
            },
          },
          {
            text: `Analyze the text in this image for vocabulary learning. Follow these TWO strict rules for extraction:

            1. **Explicit Lists & Matches:** Extract all English words that are presented with their Turkish meanings (e.g. lists, matching exercises like "Lazy -> Tembel", "Smart -> Zeki").

            2. **Highlighted/Marked Words in Sentences:**
               - Scan sentences for specific words that are **visually highlighted** (e.g. has a colored background like pink/red, underlined, or different text color) while the rest of the sentence is standard text.
               - Extract **ONLY** the highlighted word as the vocabulary item.
               - **Example:** In the sentence "Sorry, I'm a bit late", if the word "bit" has a pink background or is colored differently, extract ONLY "bit".
               - Do NOT extract random words from sentences unless they are visually distinguished/marked.

            For each extracted item, return a JSON object with:
            - 'english': The extracted word.
            - 'turkish': The Turkish meaning (if visible in the image, otherwise translate the word).
            - 'example_sentence': The full sentence where the word was found (or generate a simple one).
            - 'turkish_sentence': Turkish translation of the example sentence.
            
            Return ONLY the JSON array.`,
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