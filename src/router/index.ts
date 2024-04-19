
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth';
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';

import { publicRouter } from './router';
import breadcrumbStore from '@/stores/modules/breadcrumb';

import { menusStore } from '@/stores/modules/user';

import { close, start } from '@/utils/nporgress'



const router = createRouter({
    history: createWebHistory(),
    routes: publicRouter, // `routes: routes` 的缩写
})


let registerRouteFresh =true;


router.beforeEach((to, from, next) => {
    start()
    if(registerRouteFresh){
        resetRouter();
        registerRouteFresh = false
    }





    const breadcrumb = breadcrumbStore();
    breadcrumb.reset()
    to.matched.forEach((item, index) => {
        if (index === 0) {
            return;
        }
        breadcrumb.add(item.name as string)
    })

    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!token && !refreshToken && to.path !== '/login') {
        console.log('登录')
        next('/login')
        return;
    }

    if (token && to.path == '/login') {
        console.log('进入系统')
        next('/')
        return
    }
    next();
})

router.afterEach(() => {
    close()
})



export const resetRouter = async () => {

    let routers = router.getRoutes()
    routers.map((item) => {
        if (!item.name) {
            return
        }
        if (item.path === '/login') {
            return
        }
        router.removeRoute(item.name);
    })

    menusStore().menus.forEach((item: RouteRecordRaw) => {
        router.addRoute(item)
    });
}





export default router;