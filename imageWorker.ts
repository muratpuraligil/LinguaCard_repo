
// Bu dosya Main Thread'den bağımsız çalışır.
// UI bloklanmasını %100 önler.

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;

  try {
    // 1. Görseli Bitmap olarak arka planda decode et (Çok hızlıdır)
    const bitmap = await createImageBitmap(file);
    
    // 2. Boyutlandırma Hesabı
    let { width, height } = bitmap;
    const MAX_DIMENSION = 800; // OCR için optimum boyut

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }

    // 3. OffscreenCanvas oluştur (DOM'dan bağımsız canvas)
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Worker: Canvas context oluşturulamadı.");
    }

    // 4. Çizim ve Sıkıştırma
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Blob olarak çıktı ver (JPEG, 0.7 kalite)
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.7
    });

    // 5. Sonucu ana thread'e geri gönder
    self.postMessage(blob);

  } catch (error) {
    console.error("Worker Hatası:", error);
    // Hata durumunda null dön
    self.postMessage(null);
  }
};
