
import { createRouter, createWebHistory } from 'vue-router';
import { getAccessToken } from '@/stores/oauth2/Oauth';


const routes = [
  { path: '/', component: () => import('../App.vue') },
  { path: '/login', component: () => import('../views/login/Login.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes, // `routes: routes` 的缩写
})



router.beforeEach((to, from, next) => {
  if(getAccessToken() ===null && to.path !=='/login'){
    next('/login')
    return;
  }
  next();
})



export default router;