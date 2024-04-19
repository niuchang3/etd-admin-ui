

export const systemRouter = [
  {
    path: '/home',
    name:'首页',
    icon:'HomeOutlined',
    component: () => import('@/views/home.vue'),
  },
  {
    path:'/system',
    name :'系统管理',
    icon:'SettingOutlined',
    children:[
      {
        path: '/system/tenant',
        name:'租户管理',
        component: () => import('@/views/tenant/index.vue'),
      },
      {
        path: '/system/user',
        name:'用户管理',
        icon:'UserOutlined',
        component: () => import('@/views/user/index.vue'),
      },
      {
        path: '/system/role',
        name:'角色管理',
        component: () => import('@/views/role/index.vue'),
      },
      {
        path: '/system/department',
        name:'部门管理',
        component: () => import('@/views/department/index.vue'),
      }
    ]
  }
]

export const routesMenu = {
  path:'/',
  name:'ETD-后端演示平台',
  component: () => import('@/views/index.vue'),
  children:systemRouter
}


export const publicRouter = [
  { path: '/login',name:'ETD-登录页', component: () => import('@/views/login.vue') },
]



