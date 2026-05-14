import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://vteen.shop',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path,
        headers: {
          'Referer': 'https://vteen.shop/',
          'Origin': 'https://vteen.shop',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
      '/__vteen': {
        target: 'https://vteen.shop',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path.replace(/^\/__vteen/, ''),
        headers: {
          'Referer': 'https://vteen.shop/',
          'Origin': 'https://vteen.shop',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
      '/f': {
        target: 'https://vteen.shop',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path,
        headers: {
          'Referer': 'https://vteen.shop/',
          'Origin': 'https://vteen.shop',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
      '/google-img': {
        target: 'https://lh3.googleusercontent.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/google-img/, ''),
        headers: {
          'Referer': 'https://drive.google.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
      },
    },
  },
})
