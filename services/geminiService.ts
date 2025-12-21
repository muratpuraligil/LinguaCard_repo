
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
  // Use a fresh instance right before the call to ensure latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
            text: "Bu görseldeki İngilizce kelimeleri ve anlamlarını analiz et. Eğer bir liste veya tablo varsa her satırı bir kelime olarak al. Kelime, Türkçe karşılığı, İngilizce örnek cümle ve o cümlenin Türkçe çevirisi olacak şekilde JSON formatında dön.",
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
              english: {
                type: Type.STRING,
                description: "İngilizce kelime",
              },
              turkish: {
                type: Type.STRING,
                description: "Türkçe karşılığı",
              },
              example_sentence: {
                type: Type.STRING,
                description: "İngilizce örnek cümle",
              },
              turkish_sentence: {
                type: Type.STRING,
                description: "Örnek cümlenin Türkçe çevirisi",
              },
            },
            required: ["english", "turkish", "example_sentence", "turkish_sentence"],
          },
        },
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("Model boş yanıt döndürdü.");
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      console.log("Başarıyla çıkarılan kelime sayısı:", parsed.length);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error("JSON parse hatası (Gemini yanıtı):", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini OCR API Hatası:", error);
    throw new Error(`Yapay zeka görseli okuyamadı: ${error.message || 'Bilinmeyen hata'}`);
  }
};