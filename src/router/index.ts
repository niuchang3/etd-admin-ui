import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { UserMenu } from '@/apis/upms/login/type'
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth'
import AdminView from '@/views/index.vue'

const NotFoundView = () => import('@/views/404.vue')
const viewModules = import.meta.glob(['../views/**/*.vue', '!../views/index.vue'])
const dynamicRouteRemovers: Array<() => void> = []
let dynamicRoutesReady = false

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/login/index.vue'), meta: { public: true } },
    {
      path: '/',
      name: 'admin',
      component: AdminView,
      redirect: '/no-permission',
      children: [
        {
          path: 'no-permission',
          name: 'no-permission',
          component: NotFoundView,
          meta: { title: '暂无权限', description: '当前租户下暂无可访问的菜单。' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: NotFoundView,
          meta: { title: '功能页面', description: '该功能正在建设中。' },
        },
      ],
    },
  ],
})

const normalizePath = (path: string) => path.trim().replace(/^\/+/, '')

const resolveView = (menuRouter: string | null) => {
  if (!menuRouter) return NotFoundView
  let path = menuRouter.trim().replace(/^@\//, '../').replace(/^\/src\//, '../').replace(/^src\//, '../')
  if (!path.endsWith('.vue')) path = `${path}.vue`
  return viewModules[path] || NotFoundView
}

export const clearDynamicRoutes = () => {
  dynamicRouteRemovers.splice(0).forEach((removeRoute) => removeRoute())
  dynamicRoutesReady = false
}

/** 用当前用户菜单全量替换路由，避免租户切换后残留旧权限。 */
export const syncDynamicRoutes = (menus: UserMenu[]) => {
  clearDynamicRoutes()
  const usedPaths = new Set<string>()
  const menuMap = new Map(menus.map((menu) => [menu.id, menu]))
  menus.forEach((menu) => {
    const path = menu.menuPath ? normalizePath(menu.menuPath) : ''
    if (!path || /^https?:\/\//i.test(menu.menuPath || '') || usedPaths.has(path)) return
    usedPaths.add(path)
    const breadcrumb: Array<{ label: string, path?: string }> = []
    const visited = new Set([menu.id])
    let parentId = menu.parentId
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = menuMap.get(parentId)
      if (!parent) break
      breadcrumb.unshift({
        label: parent.menuName || '未命名菜单',
        path: parent.menuPath ? `/${normalizePath(parent.menuPath)}` : undefined,
      })
      parentId = parent.parentId
    }
    const route: RouteRecordRaw = {
      path,
      name: `menu-${menu.id}`,
      component: resolveView(menu.menuRouter),
      meta: { title: menu.menuName || '未命名菜单', menuId: menu.id, accessLevel: menu.accessLevel, breadcrumb },
    }
    dynamicRouteRemovers.push(router.addRoute('admin', route))
  })
  dynamicRoutesReady = true
}

router.beforeEach(async (to) => {
  const hasSession = Boolean(getAccessToken() || getRefreshToken())
  if (!to.meta.public && !hasSession) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login') return hasSession ? { path: '/' } : true
  if (!hasSession) return true

  if (!dynamicRoutesReady) {
    try {
      const { menusStore, tenantsStore, userStore } = await import('@/stores/modules/user')
      const tenants = tenantsStore()
      if (!tenants.userTenant.currentTenant?.id) await tenants.initializeTenant()
      const [menus] = await Promise.all([
        menusStore().getUserMenus(),
        userStore().getUserInfo(),
        userStore().getUserRoles(),
      ])
      const firstPath = menusStore().firstReadablePath()
      if (!menus.length || !firstPath) return { name: 'no-permission', replace: true }
      if (to.name === 'no-permission' || to.name === 'not-found') {
        const target = firstPath.startsWith('/') ? firstPath : `/${firstPath}`
        return { path: target, replace: true }
      }
      return { path: to.fullPath, replace: true }
    } catch {
      return true
    }
  }
  return true
})

export default router
