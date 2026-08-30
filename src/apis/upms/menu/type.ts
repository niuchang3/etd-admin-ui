/** 后端菜单类型枚举。 */
export type MenuType = 'DIRECTORY' | 'MENU'

/** 后端菜单响应对象；Long 类型 ID 始终使用字符串接收。 */
export interface SystemMenu {
  id: string
  parentId: string | null
  createTime: string | null
  dataStatus: 0 | 1
  menuName: string | null
  menuPath: string | null
  menuRouter: string | null
  menuIcon: string | null
  menuType: MenuType | null
  sort: number | null
  children?: SystemMenu[]
}

/** 新增和修改共用的完整请求对象，状态由独立 PATCH 接口维护。 */
export interface SaveSystemMenu {
  parentId: string | null
  menuName: string | null
  menuPath: string | null
  menuRouter: string | null
  menuIcon: string | null
  menuType: MenuType | null
  sort: number | null
}
