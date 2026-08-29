
import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth'
import AppShell from '@/components/layout/AppShell.vue'

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
      component: AppShell,
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue'),
          meta: { title: '运营总览' },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '任务中心', description: '任务管理页面将在这里接入。' },
        },
        {
          path: 'alerts',
          name: 'alerts',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '告警与事件', description: '告警与事件页面将在这里接入。' },
        },
        {
          path: 'tenants',
          name: 'tenants',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '账户与租户', description: '账户与租户管理页面将在这里接入。' },
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '资源目录', description: '资源目录页面将在这里接入。' },
        },
        {
          path: 'permissions',
          name: 'permissions',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '权限策略', description: '权限策略页面将在这里接入。' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/placeholder/index.vue'),
          meta: { title: '系统设置', description: '系统设置页面将在这里接入。' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
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
