import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],


    server: {
    proxy: {
      '/fm': {
        target: 'https://fm.idiosol.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

