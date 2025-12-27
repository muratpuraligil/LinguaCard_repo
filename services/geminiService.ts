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
  // Netlify/Vite ortamında değişkenlere erişim için tüm olasılıklar:
  const apiKey = 
    // @ts-ignore
    (import.meta as any).env?.VITE_API_KEY || 
    // @ts-ignore
    (import.meta as any).env?.API_KEY || 
    // @ts-ignore
    (typeof process !== 'undefined' ? process.env?.VITE_API_KEY : null) ||
    // @ts-ignore
    (typeof process !== 'undefined' ? process.env?.API_KEY : null);

  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    console.error("KRITIK HATA: API Anahtarı (VITE_API_KEY) bulunamadı.");
    console.info("ÇÖZÜM: Netlify panelinde değişken ismini 'VITE_API_KEY' olarak değiştirin ve 'Clear cache and deploy' yapın.");
    throw new Error("MISSING_API_KEY");
  }

  // Her istekte temiz bir instance (SDK kuralı)
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
            text: "Analyze the English words and meanings in this image. Convert to JSON format: english, turkish, example_sentence, turkish_sentence. Only return the JSON array.",
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
    console.error("Gemini API Hatası:", error);
    
    const errMsg = error.message || "";
    if (errMsg.includes("API key not valid") || errMsg.includes("403") || errMsg.includes("400")) {
        throw new Error("INVALID_API_KEY");
    }
    
    throw new Error("Görsel analiz edilemedi. Lütfen internet bağlantınızı veya API anahtarınızı kontrol edin.");
  }
};
