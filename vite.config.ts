
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages URL yapısı: kullanıcıadı.github.io/RepoAdi/
  // Ekran görüntüsüne göre repo adınız "LinguaCard"
  base: '/LinguaCard/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || '')
  }
});
