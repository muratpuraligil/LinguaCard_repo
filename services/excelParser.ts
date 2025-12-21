import { read, utils } from 'xlsx';
import { Word } from '../types';

export const parseExcelFile = async (file: File): Promise<Omit<Word, 'id' | 'created_at'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Dosyayı oku
        const workbook = read(data, { type: 'array' });
        
        // İlk sayfayı al
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSON'a çevir (başlık satırı olmadan array of arrays olarak alıyoruz ki kontrol edebilelim)
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Boş veya çok kısa dosyaları ele
        if (jsonData.length < 1) {
            resolve([]);
            return;
        }

        const words: Omit<Word, 'id' | 'created_at'>[] = [];

        // Başlık satırı kontrolü (Header Row Heuristic)
        // Eğer ilk satırda "english", "ingilizce", "kelime" gibi ifadeler varsa ilk satırı atla
        let startIndex = 0;
        const headerRow = jsonData[0].map(cell => cell?.toString().toLowerCase() || '');
        if (headerRow.some(h => h.includes('english') || h.includes('ingilizce') || h.includes('türkçe') || h.includes('turkish'))) {
            startIndex = 1;
        }

        for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            // En azından İngilizce ve Türkçe karşılığı olmalı
            if (row[0] && row[1]) {
                words.push({
                    english: row[0].toString().trim(),
                    turkish: row[1].toString().trim(),
                    // 3. sütun örnek cümle, 4. sütun Türkçe çevirisi (varsa)
                    example_sentence: row[2]?.toString().trim() || '',
                    turkish_sentence: row[3]?.toString().trim() || ''
                });
            }
        }
        resolve(words);
      } catch (error) {
        console.error("Excel parse error:", error);
        reject(new Error("Dosya formatı hatalı veya okunamadı."));
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};