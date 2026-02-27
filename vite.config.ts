
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      // Aumenta o limite do aviso para 600kB (nosso target pós-split)
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // 1. pdfjs num chunk próprio (~330 kB) - carregado sob demanda
            if (id.includes('pdfjs-dist')) return 'pdfjs';

            // 2. React + React-DOM num chunk vendor estável (cache longo)
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';

            // 3. Dados do blog num chunk separado (só carrega quando usuário abre /blog)
            if (id.includes('blogData')) return 'blog-data';

            // 4. Páginas secundárias (rotas raramente acessadas)
            if (
              id.includes('/Sobre') ||
              id.includes('/Contato') ||
              id.includes('/Privacidade') ||
              id.includes('/Termos')
            ) return 'pages-secondary';

            // 5. Componentes pesados num chunk separado
            if (id.includes('ResumePreview') || id.includes('ATSPanel') || id.includes('PhotoCropModal')) {
              return 'components-heavy';
            }

            // 6. Serviços de IA e PDF
            if (id.includes('/services/')) return 'services';
          },
        },
      },
    },
    // Suprime o aviso do eval do pdfjs (é interno da lib, não podemos corrigir)
    optimizeDeps: {
      exclude: [],
    },
  };
});
