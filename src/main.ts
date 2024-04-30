import { Component, createApp } from 'vue'
import Antd from 'ant-design-vue';
import App from './App.vue'
import './assets/css/reset.css'
import 'ant-design-vue/dist/reset.css';
import * as Icons  from '@ant-design/icons-vue'
import VueCookies from 'vue-cookies'
import pinia from './stores';
import router from './router/index'


const app = createApp(App)

const IConData:Record<string,Component> = Icons;
Object.keys(IConData).forEach(key => {
    app.component(key, IConData[key])
})

app.use(VueCookies)
    .use(pinia)
    .use(Antd)
    .use(router)
    .mount('#app')
