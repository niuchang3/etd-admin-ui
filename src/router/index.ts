
import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken, getRefreshToken } from '@/stores/modules/oauth'
import AdminView from '@/views/index.vue'

// 当前模拟菜单统一进入 404 页面，后续开发时再逐个替换为真实页面。
const NotFoundView = () => import('@/views/404.vue')
const systemBreadcrumb = [{ label: '系统管理', path: '/system' }]

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
          meta: { title: '首页', description: '首页正在建设中。' },
        },
        {
          path: 'tenants',
          name: 'tenants',
          component: NotFoundView,
          meta: { title: '租户管理', description: '租户管理页面将在这里接入。' },
        },
        {
          path: 'users',
          name: 'users',
          component: NotFoundView,
          meta: { title: '用户中心', description: '用户中心页面将在这里接入。' },
        },
        {
          path: 'system',
          name: 'system',
          component: NotFoundView,
          meta: { title: '系统管理', description: '请选择系统管理下的具体功能。' },
        },
        {
          path: 'system/dictionaries',
          name: 'system-dictionaries',
          component: NotFoundView,
          meta: { title: '系统字典', description: '系统字典页面将在这里接入。', breadcrumb: systemBreadcrumb },
        },
        {
          path: 'system/roles',
          name: 'system-roles',
          component: NotFoundView,
          meta: { title: '角色管理', description: '角色管理页面将在这里接入。', breadcrumb: systemBreadcrumb },
        },
        {
          path: 'system/menus',
          name: 'system-menus',
          component: () => import('@/views/menu/index.vue'),
          meta: { title: '菜单管理', breadcrumb: systemBreadcrumb },
        },
        {
          path: 'system/departments',
          name: 'system-departments',
          component: NotFoundView,
          meta: { title: '部门管理', description: '部门管理页面将在这里接入。', breadcrumb: systemBreadcrumb },
        },
        {
          path: 'system/parameters',
          name: 'system-parameters',
          component: NotFoundView,
          meta: { title: '系统参数', description: '系统参数页面将在这里接入。', breadcrumb: systemBreadcrumb },
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
