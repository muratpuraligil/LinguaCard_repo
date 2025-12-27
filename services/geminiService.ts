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
  // Ortam değişkenlerinden veya globalden anahtarı almayı dene
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.length < 5) {
    throw new Error("MISSING_API_KEY");
  }

  // Her çağrıda yeni instance oluşturarak güncel anahtarın kullanıldığından emin ol
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
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error("JSON parse hatası:", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini OCR Hatası:", error);
    
    const errMsg = error.message || "";
    // API anahtarı hataları: 403, 400 (Invalid Key), "API key not valid", "Requested entity was not found"
    if (
        errMsg.includes("API key not valid") || 
        errMsg.includes("403") || 
        errMsg.includes("400") || 
        errMsg.includes("Requested entity was not found")
    ) {
        throw new Error("INVALID_API_KEY");
    }
    
    throw error;
  }
};