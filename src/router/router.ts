
import { getAccessToken } from '@/stores/modules/oauth';
import { createRouter, createWebHistory } from 'vue-router';
// import { getAccessToken } from '@/stores/modules/oauth';


const routes = [
  { path: '/', component: () => import('../App.vue') },
  { path: '/login', component: () => import('../views/login.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes, // `routes: routes` 的缩写
})



router.beforeEach((to, from, next) => {
  const token = getAccessToken();
  if(!token  && to.path !=='/login'){
    next('/login')
    return;
  }
  next();
})



export default router;