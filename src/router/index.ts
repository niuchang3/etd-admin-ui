
import { getAccessToken } from '@/stores/modules/oauth';
import { createRouter, createWebHistory } from 'vue-router';

import { routesInfo } from './router';


import breadcrumbStore from '@/stores/modules/breadcrumb';




const router = createRouter({
  history: createWebHistory(),
  routes:routesInfo, // `routes: routes` 的缩写
})



router.beforeEach((to, from, next) => {
    const breadcrumb = breadcrumbStore();
    breadcrumb.reset()
    to.matched.forEach((item,index) =>{
        console.log(index)
        if(index===0){
            return;
        }
        breadcrumb.add(item.name as string)
    })

    const token = getAccessToken();
    if(!token  && to.path !=='/login'){
        next('/login')
        return;
    }
    if(token && to.path =='/login'){
        next('/')
    }
  
    next();
})



export default router;