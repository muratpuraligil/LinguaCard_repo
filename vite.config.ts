
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // process.env.API_KEY tanımlaması güvenlik için kaldırıldı.
  // Anahtar artık aistudio köprüsü üzerinden dinamik olarak alınacak.
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
