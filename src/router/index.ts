
import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth'
import AdminView from '@/views/index.vue'

// 当前模拟菜单统一进入 404 页面，后续开发时再逐个替换为真实页面。
const NotFoundView = () => import('@/views/404.vue')

// 应用由独立登录页和共享管理平台外壳组成。
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: AdminView,
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: NotFoundView,
          meta: { title: '运营总览', description: '运营总览页面将在这里接入。' },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: NotFoundView,
          meta: { title: '任务中心', description: '任务管理页面将在这里接入。' },
        },
        {
          path: 'alerts',
          name: 'alerts',
          component: NotFoundView,
          meta: { title: '告警与事件', description: '告警与事件页面将在这里接入。' },
        },
        {
          path: 'tenants',
          name: 'tenants',
          component: NotFoundView,
          meta: { title: '账户与租户', description: '账户与租户管理页面将在这里接入。' },
        },
        {
          path: 'resources',
          name: 'resources',
          component: NotFoundView,
          meta: { title: '资源目录', description: '资源目录页面将在这里接入。' },
        },
        {
          path: 'permissions',
          name: 'permissions',
          component: NotFoundView,
          meta: { title: '权限策略', description: '权限策略页面将在这里接入。' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: NotFoundView,
          meta: { title: '系统设置', description: '系统设置页面将在这里接入。' },
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

// 路由守卫：根据本地令牌判断是否允许进入受保护页面。
router.beforeEach((to) => {
  const hasSession = Boolean(getAccessToken() || getRefreshToken())

  // 未登录时跳转登录页，并记录原始目标地址。
  if (!to.meta.public && !hasSession) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 已登录用户无需重复进入登录页。
  if (to.name === 'login' && hasSession) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
