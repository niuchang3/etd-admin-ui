import type { Id } from '@/apis/types'

/** 角色数据权限：不限制、本人、当前组织、当前及下级组织、自定义跨组织。 */
export type RolePermissionType = '1' | '2' | '3' | '4' | '5'

/** 菜单访问级别枚举：READ_ONLY 只读，READ_WRITE 读写。 */
export enum AccessLevelEnum {
  READ_ONLY = 'READ_ONLY',
  READ_WRITE = 'READ_WRITE',
}

/** 菜单访问级别：READ_ONLY 只读，READ_WRITE 读写。 */
export type MenuAccessLevel = 'READ_ONLY' | 'READ_WRITE'

/** 角色列表及详情接口返回的数据。 */
export interface SystemRole {
  id: Id
  createTime: string
  updateTime: string
  dataStatus: 0 | 1
  builtIn: boolean
  roleName: string
  roleCode: string
  roleDesc: string | null
  permissionType: RolePermissionType
}

/** 角色新增、编辑共用的完整表单数据。 */
export interface SystemRoleSaveDTO {
  roleName: string
  roleCode: string
  roleDesc: string | null
  permissionType: RolePermissionType
}

/** 单个角色菜单授权项，menuId 按字符串传递。 */
export interface SystemRoleMenu {
  menuId: Id
  accessLevel: MenuAccessLevel
}

/** 角色菜单全量授权请求；空数组表示清空全部菜单权限。 */
export interface SystemRoleMenuAssignDTO {
  menus: SystemRoleMenu[]
}

/** 角色分页查询条件。dataStatus 不传表示查询全部状态。 */
export interface SystemRoleQuery {
  current: number
  size: number
  keyword?: string
  dataStatus?: 0 | 1
}
