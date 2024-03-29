

export const menuRoutes = [
  {
    path: '/home',
    name:'首页',
    component: () => import('../views/home.vue'),
  },
  {
    path:'/system',
    name :'系统管理',
    children:[
      {
        path: '/system/user',
        name:'用户管理',
        component: () => import('../views/user/index.vue'),
      },
      {
        path: '/system/role',
        name:'角色管理',
        component: () => import('../views/role/index.vue'),
      },
      {
        path: '/system/department',
        name:'部门管理',
        component: () => import('../views/department/index.vue'),
      }
    ]
  }
]


export const routesInfo = [
  { 
    path: '/',
    component: () => import('../views/index.vue'),
    children: menuRoutes

  },
  { path: '/login', component: () => import('../views/login.vue') }
]
