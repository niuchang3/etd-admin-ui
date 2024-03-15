import { defineConfig ,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath,URL} from 'node:url'



// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE')
  console.log("env",env);
  
  return{
    envDir:"env",
    plugins: [vue()],
    base: './',
    resolve:{
      alias:{
        '@':fileURLToPath(new URL('./src',import.meta.url))
      }
    },
    server:{
      host: env.VITE_HOST,
      port: env.VITE_PORT,
      proxy:{
          '/upms/apis':{
            target: env.VITE_BASIC_URL,
            changeOrigin:true
          }
      }
    }
  }
  
})
