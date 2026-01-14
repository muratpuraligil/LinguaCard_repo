
import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedWord {
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractWordsFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedWord[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");
  
  const ai = new GoogleGenAI({ apiKey });
  
  // Base64 verisi 'data:image/jpeg;base64,' prefix'ini içeriyorsa temizle, içermiyorsa olduğu gibi kullan.
  const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const promptContent = {
    contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Content } },
          {
            text: `Analyze the text in this image. Extract vocabulary items or sentences.
            
            STRICT RULES:
            1. Extract items in EXACT reading order.
            2. If an item is just a single word, YOU MUST GENERATE A CREATIVE AND RELEVANT English example sentence for it. 
               DO NOT repeat the word as the sentence.
            3. Translate the word and your generated (or extracted) sentence into Turkish.
            4. If the image already contains a sentence, use it and translate it.

            Output Format (JSON Array):
            - 'english': The vocabulary word.
            - 'turkish': Turkish meaning.
            - 'example_sentence': A full, meaningful English sentence (MUST BE DIFFERENT FROM THE WORD).
            - 'turkish_sentence': Turkish translation of that sentence.`,
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

  const callApi = async (modelName: string) => {
      const response = await ai.models.generateContent({ model: modelName, ...promptContent });
      return response.text || "";
  };

  const isQuotaError = (error: any) => {
      const msg = (error.message || "").toLowerCase();
      return msg.includes("429") || msg.includes("exhausted") || msg.includes("quota") || msg.includes("resource");
  };

  // Helper to clean Markdown code blocks if the model adds them despite config
  const cleanJsonText = (text: string) => {
      return text.replace(/```json/g, '').replace(/```/g, '').trim();
  };

  try {
    let text = "";
    try {
        // Ana model: gemini-3-pro-preview
        text = await callApi('gemini-3-pro-preview');
    } catch (err1: any) {
        if (isQuotaError(err1)) {
            console.warn("Gemini 3 Pro Quota Hit, retrying...");
            await delay(3000);
            try {
                text = await callApi('gemini-3-pro-preview');
            } catch (err2: any) {
                if (isQuotaError(err2)) {
                    console.warn("Falling back to Flash...");
                    await delay(1000);
                    // Fallback model: Hızlı ve kararlı
                    text = await callApi('gemini-2.5-flash-latest');
                } else throw err2;
            }
        } else {
             // Model bulunamadı veya başka hata durumunda Flash'a düş
             console.warn("Primary model error, failing over to Flash:", err1);
             text = await callApi('gemini-2.5-flash-latest');
        }
    }

    if (!text) return [];

    try {
      const cleanedText = cleanJsonText(text);
      const parsed = JSON.parse(cleanedText);
      if (!Array.isArray(parsed)) return [];
      
      return parsed.filter((item: ExtractedWord) => {
          if (!item.english || !item.turkish) return false;
          const eng = item.english.trim();
          // Basit validasyon: Kelime en az 2 karakter olmalı ve tamamen sembollerden oluşmamalı
          if (eng.length < 2 || /^[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s]+$/.test(eng)) return false;
          return true;
      });
    } catch (e) { 
        console.error("JSON Parse Error:", e);
        return []; 
    }
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    if (isQuotaError(error)) throw new Error("QUOTA_EXCEEDED");
    throw new Error("Görsel analiz edilemedi.");
  }
};
