import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath,URL} from 'node:url'




// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve:{
    alias:{
      '@':fileURLToPath(new URL('./src',import.meta.url))
    }
  },
  server:{
    host: '127.0.0.1',
    port: 7000,
    proxy:{

    }
  }
  
})
