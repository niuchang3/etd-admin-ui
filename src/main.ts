import { createApp } from 'vue'
import Antd from 'ant-design-vue';
import App from './App.vue'
import './assets/css/reset.css'
import 'ant-design-vue/dist/reset.css';
import VueCookies from 'vue-cookies'
import router from './router/router'
import { createPinia } from 'pinia'
import {createPersistedState} from 'pinia-plugin-persistedstate'




const app = createApp(App)

const pinia = createPinia().use(createPersistedState({
    storage:localStorage,
    auto: true
}));

app.use(VueCookies)
    .use(router)
    .use(Antd)
    .use(pinia)
    .mount('#app')