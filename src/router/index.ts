
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth';
import { RouteLocationNormalized, createRouter, createWebHistory } from 'vue-router';

import { publicRouter } from './router';
import breadcrumbStore from '@/stores/modules/breadcrumb';

import { menusStore } from '@/stores/modules/user';

import NProgress from '@/utils/nporgress'
import { UserMenus } from '@/apis/upms/login/type';

const modules = import.meta.glob('../views/**/*.vue')

const router = createRouter({
    history: createWebHistory(),
    routes: publicRouter, 
})


let refresh = true
router.beforeEach((to, from, next) => {
    NProgress.start()
    addBreadcrumb(to)

    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!token && !refreshToken && to.path !== '/login'){
        next('/login')
        return;
    }

    if (token && to.path == '/login'){
        next('/')
        return
    }
    if (refresh) {
        refresh = false
        resetRouter()
        // to.fullPath
        next(to)
        return
    }

    next();
})

router.afterEach(() => {
    NProgress.done();
})


/**
 * 路由重置
 */
export const resetRouter = () => {
    let routers = router.getRoutes()
    routers.map((item) => {
        if (!item.name) {
            return;
        }
        if (item.path === '/login') {
            return;
        }
        router.removeRoute(item.name);
    })
    generateMenu()
}



const generateMenu = () => {
    menusStore().menus?.forEach((item: UserMenus) => {

        let childrens = children(item)
        let route = {
            path: `${item.menuPath}`,
            name: `${item.menuName}`,
            meta: {
                keepAlive: true,
            },
            component: modules[`../views/${item.menuRouter}`],
            children: childrens
        }
        router.addRoute(route)
    });
}



const children = (userMenu: UserMenus): any => {
    let menu: { path: string; name: string; component: () => Promise<any>; children: any; }[] = [];

    if (!userMenu.children) {
        return menu;
    }

    userMenu.children.forEach((item: any) => {
        let childrens = children(item)
        let route = {
            path: `${item.menuPath}`,
            name: `${item.menuName}`,
            meta: {
                keepAlive: true,
            },
            component: modules[`../views/${item.menuRouter}`],
            children: childrens
        }
        menu.push(route)

    });
    return menu;
}




/**
 * 添加面包屑
 * @param to 
 */
const addBreadcrumb = async (to: RouteLocationNormalized,) => {
    const breadcrumb = breadcrumbStore();
    breadcrumb.reset()
    to.matched.forEach((item, index) => {
        if (index === 0) {
            return;
        }
        breadcrumb.add(item.name as string)
    })

}


export default router;