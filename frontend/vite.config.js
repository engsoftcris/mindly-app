import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: true,
      port: 5173,
    },
    build: {
      // Ativa o Terser apenas em produção para limpar os console.logs
      minify: isProduction ? 'terser' : 'esbuild',
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : {},
    },
  }
})