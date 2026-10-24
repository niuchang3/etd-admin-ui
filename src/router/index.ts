import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { UserMenu } from '@/apis/upms/login/type'
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth'
const NotFoundView = () => import('@/views/404.vue')
const AdminView = () => import('@/views/index.vue')
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
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue'),
          meta: { title: '首页', menuCode: 'ai:model-square' },
        },
        {
          path: 'ai/knowledge-documents/:id/chunks',
          name: 'knowledge-document-chunks',
          component: () => import('@/views/ai/knowledge-document/chunks/index.vue'),
          meta: {
            title: '文档分片管理',
            breadcrumb: [
              { label: '知识库资料', path: '/ai/knowledge-documents' },
            ],
          },
        },
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
  if (to.name === 'login') return hasSession ? { path: '/dashboard' } : true
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
      const firstPath = menusStore().firstReadablePath() || '/dashboard'
      if (!menus.length && !firstPath) return { name: 'no-permission', replace: true }
      if (to.name === 'no-permission' || to.name === 'not-found' || to.path === '/' || to.name === 'admin') {
        const target = firstPath.startsWith('/') ? firstPath : `/${firstPath}`
        return { path: target, replace: true }
      }
      return { path: to.fullPath, replace: true }
    } catch {
      return true
    }
  }

  // 动态路由就绪后，访问根路径 / 或 admin 时，默认进入首页 /dashboard
  if (to.path === '/' || to.name === 'admin') {
    const { menusStore } = await import('@/stores/modules/user')
    const firstPath = menusStore().firstReadablePath() || '/dashboard'
    const target = firstPath.startsWith('/') ? firstPath : `/${firstPath}`
    return { path: target, replace: true }
  }

  return true
})

export default router
