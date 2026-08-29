import { defineConfig ,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath,URL} from 'node:url'

/**
 * Vite 构建与开发服务器配置。
 * mode 表示当前运行模式，例如 development 或 production。
 */
export default defineConfig(({mode}) => {
  // 从项目根目录读取以 VITE 开头的环境变量。
  const env = loadEnv(mode, process.cwd(), 'VITE')
  // 启动时在终端输出环境配置，便于排查代理与端口问题。
  console.log("env",env);
  
  return{
    // Vite 客户端环境文件目录；本配置中 loadEnv 仍显式从项目根目录读取。
    envDir:"env",
    // 让 Vite 能够解析和编译 .vue 单文件组件。
    plugins: [vue()],
    // 使用相对路径生成静态资源，方便部署到非根路径。
    base: './',
    resolve:{
      alias:{
        // 将 @ 映射到 src 目录，可以使用 @/components 代替多层相对路径。
        '@':fileURLToPath(new URL('./src',import.meta.url))
      }
    },
    // 仅在 npm run dev 开发环境中生效的服务器配置。
    server:{
      // 0.0.0.0 允许局域网内的其他设备访问开发服务器。
      host: '0.0.0.0',
      // 开发服务器端口来自环境变量。
      port: Number(env.VITE_SERVER_PORT),
      // 将指定前缀的前端请求转发到后端，避免本地开发跨域问题。
      proxy:{
        [env.VITE_SERVER_BASE_API]:{
            // 真实后端服务地址。
            target: env.VITE_SERVER_PROXY_TARGET,
            // 将转发请求的 Host 改为后端目标地址。
            changeOrigin:true,
            // 转发前移除公共代理前缀，避免后端路径重复。
            rewrite: (path) => path.replace(new RegExp('^' + env.VITE_SERVER_BASE_API), '')
          }
      }
    }
  }
  
})
