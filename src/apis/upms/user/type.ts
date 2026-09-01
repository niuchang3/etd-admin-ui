import type { Id, PageRequest } from '@/apis/types'

/** 用户角色关联对象 */
export interface UserRoleItem {
  id: Id
  tenantId: Id
  userId: Id
  roleId: Id
  roleCode: string
  roleName: string
  permissionType?: string
}

/** 用户组织关联对象 */
export interface UserOrganizationItem {
  id: Id
  tenantId: Id
  userId: Id
  organizationId: Id
  organizationName: string
  primaryOrganization: boolean
}

/** 用户分页及详情记录 */
export interface UserRecord {
  id: Id
  createTime?: string
  updateTime?: string
  account: string
  mobile?: string
  userName: string
  birthday?: string
  gender?: number
  avatar?: string
  nickName?: string
  locked: boolean
  enabled: boolean
  dataStatus?: number
  roleNames?: string
  organizationNames?: string
  roles?: UserRoleItem[]
  organizations?: UserOrganizationItem[]
}

/** 分页查询参数 */
export interface UserQueryParams extends PageRequest {
  keyword?: string
  organizationId?: Id
  enabled?: boolean
  locked?: boolean
}

/** 新增用户请求体 */
export interface UserCreatePayload {
  account: string
  password: string
  userName: string
  mobile?: string
  birthday?: string
  gender?: number
  avatar?: string
  nickName?: string
  roleIds?: Id[]
  organizationIds?: Id[]
  primaryOrganizationId?: Id | null
}

/** 修改用户基础资料请求体（不包含密码、角色和组织） */
export interface UserUpdatePayload {
  account: string
  userName: string
  mobile?: string
  birthday?: string
  gender?: number
  avatar?: string
  nickName?: string
}

/** 全量替换用户角色请求体 */
export interface UserRoleAssignPayload {
  roleIds: Id[]
}

/** 全量替换用户组织请求体 */
export interface UserOrganizationAssignPayload {
  organizationIds: Id[]
  primaryOrganizationId?: Id | null
}
