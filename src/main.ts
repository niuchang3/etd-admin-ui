import { createApp } from 'vue'
import Antd from 'ant-design-vue';
import App from './App.vue'
import './assets/css/reset.css'
import './assets/css/tokens.css'
import './assets/css/global.css'
import 'ant-design-vue/dist/reset.css';
import VueCookies from 'vue-cookies'
import pinia from './stores';
import router from './router/index'


// 创建 Vue 根应用。
const app = createApp(App)

// 按顺序注册 Cookie、状态管理、Ant Design Vue 和路由。
app.use(VueCookies)
    .use(pinia)
    .use(Antd)
    .use(router)
    .mount('#app')
