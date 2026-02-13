
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo (ex: .env)
  // O cast (process as any) evita erros de tipagem caso @types/node não esteja perfeito
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
             pdfjs: ['pdfjs-dist']
          }
        }
      }
    }
  }
})
