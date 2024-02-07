import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/reset.css'
import VueCookies from 'vue-cookies'
import router from './router/router'




const app = createApp(App)
app.use(VueCookies)
app.use(router)


app.mount('#app')
