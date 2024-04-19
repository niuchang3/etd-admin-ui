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
      host: '0.0.0.0',
      port: Number(env.VITE_SERVER_PORT),
      proxy:{
        [env.VITE_SERVER_BASE_API]:{
            target: env.VITE_SERVER_PROXY_TARGET,
            changeOrigin:true,
            rewrite: (path) => path.replace(new RegExp('^' + env.VITE_SERVER_BASE_API), '')
          }
      }
    }
  }
  
})
