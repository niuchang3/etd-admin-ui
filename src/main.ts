import { createApp } from 'vue'
import Antd from 'ant-design-vue';
import App from './App.vue'
import './assets/css/reset.css'
import 'ant-design-vue/dist/reset.css';
import VueCookies from 'vue-cookies'
import router from './router/index'
import { pinia } from './stores';





const app = createApp(App)



app.use(VueCookies)
    .use(router)
    .use(Antd)
    .use(pinia)
    .mount('#app')
