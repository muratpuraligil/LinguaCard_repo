
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
  // Use a fresh instance right before the call to ensure the latest API key from the environment is used.
  // The API key must be obtained exclusively from process.env.API_KEY as per the guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
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

    // Directly access the .text property from the response as per extracting text output guidelines.
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
    
    // Simplified error handling for API key and generic errors.
    const errString = error.message || '';
    if (errString.includes("API_KEY_INVALID") || errString.includes("API key not valid")) {
        throw new Error("API Anahtarı geçersiz. Lütfen ortam değişkenlerini kontrol edin.");
    }
    
    throw new Error(`Yapay zeka görseli okuyamadı: ${error.message || 'Bilinmeyen hata'}`);
  }
};
