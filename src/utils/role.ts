import type { Id } from '@/apis/types'
import type { UserInfo, UserRole, Tenant } from '@/apis/upms/login/type'
import type { UserRecord, UserRoleItem } from '@/apis/upms/user/type'
import { SYSTEM_ROLE_CODE } from '@/constant'

/**
 * 提取角色对象或角色编码字符串中的 roleCode（严格保持原始大小写，仅去除首尾空格）。
 */
export const getRoleCode = (role?: { roleCode?: string | null } | string | null): string => {
  if (!role) return ''
  return typeof role === 'string' ? role.trim() : String(role.roleCode || '').trim()
}

/**
 * 判断角色是否为平台管理员
 * 严格依据系统内置角色 roleCode 区分大小写比较（PLATFORM_ADMIN），绝不依赖中文名称
 */
export const isPlatformAdminRole = (role?: { roleCode?: string | null } | string | null): boolean => {
  return getRoleCode(role) === SYSTEM_ROLE_CODE.PLATFORM_ADMIN
}

/**
 * 判断角色是否为租户管理员
 * 严格依据系统内置角色 roleCode 区分大小写比较（TENANT_ADMIN），绝不依赖中文名称
 */
export const isTenantAdminRole = (role?: { roleCode?: string | null } | string | null): boolean => {
  return getRoleCode(role) === SYSTEM_ROLE_CODE.TENANT_ADMIN
}

/**
 * 判断角色是否为普通用户
 * 严格依据系统内置角色 roleCode 区分大小写比较（ORDINARY），绝不依赖中文名称
 */
export const isOrdinaryRole = (role?: { roleCode?: string | null } | string | null): boolean => {
  return getRoleCode(role) === SYSTEM_ROLE_CODE.ORDINARY
}

/**
 * 判断是否为禁止在页面端分配给用户的受限管理员角色（平台管理员、租户管理员）
 * 严格依据系统内置角色 roleCode 判断，绝不依赖中文名称
 */
export const isRestrictedAssignRole = (role?: { roleCode?: string | null } | string | null): boolean => {
  return isPlatformAdminRole(role) || isTenantAdminRole(role)
}

/**
 * 判断用户对象或当前登录用户是否为平台管理员
 * 依据 userInfo.platformAdmin 布尔字段（后端 JSON 字段名）或绑定的 PLATFORM_ADMIN 角色
 */
export const isPlatformAdminUser = (
  userInfo?: (Partial<UserInfo> & Record<string, unknown>) | null,
  roles?: (UserRole | UserRoleItem | { roleCode?: string | null } | string)[] | null
): boolean => {
  if (!userInfo && !roles?.length) return false

  // 保留后端返回的 JSON 布尔字段名 platformAdmin
  if (Boolean((userInfo as Record<string, unknown> | undefined)?.platformAdmin)) {
    return true
  }

  return (roles || []).some((r) => isPlatformAdminRole(r))
}

/**
 * 判断用户对象是否为租户管理员
 * 依据租户绑定的 tenantAdminUser ID（后端 JSON 字段名）或绑定的 TENANT_ADMIN 角色
 */
export const isTenantAdminUser = (
  userRecord?: { id?: Id | string | null; [key: string]: unknown } | null,
  roles?: (UserRole | UserRoleItem | { roleCode?: string | null } | string)[] | null,
  currentTenant?: (Partial<Tenant> & { tenantAdminUser?: Id | null }) | null
): boolean => {
  if (!userRecord && !roles?.length) return false

  // 1. 租户绑定管理员 ID 判断（保留后端 JSON 字段名 tenantAdminUser）
  const currentTenantAdminId = currentTenant?.tenantAdminUser ? String(currentTenant.tenantAdminUser) : ''
  const userId = userRecord?.id ? String(userRecord.id) : ''
  if (currentTenantAdminId && userId && currentTenantAdminId === userId) {
    return true
  }

  // 2. 角色编码判断
  return (roles || []).some((r) => isTenantAdminRole(r))
}

/**
 * 判断用户是否具备普通用户系统角色 (ORDINARY)
 */
export const isOrdinaryUser = (
  roles?: (UserRole | UserRoleItem | { roleCode?: string | null } | string)[] | null
): boolean => {
  if (!roles?.length) return false
  return (roles || []).some((r) => isOrdinaryRole(r))
}

/**
 * 账号受保护状态信息接口
 */
export interface UserAdminProtectionInfo {
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  isBuiltIn: boolean
  isProtected: boolean
  label: string
}

/**
 * 获取单条用户记录的保护状态（用于列表操作权限与 Tooltip 提示）
 */
export const getUserAdminProtection = (
  record: UserRecord,
  currentTenant?: (Partial<Tenant> & { tenantAdminUser?: Id | null }) | null
): UserAdminProtectionInfo => {
  const isPlatform = isPlatformAdminUser(record as unknown as Record<string, unknown>, record.roles)
  const isTenant = isTenantAdminUser(record as unknown as Record<string, unknown>, record.roles, currentTenant)
  const isBuiltIn = Boolean((record as unknown as Record<string, unknown>).builtIn)

  const isProtected = isPlatform || isTenant || isBuiltIn
  const label = isPlatform ? '平台管理员' : isTenant ? '租户管理员' : isBuiltIn ? '系统内置' : ''

  return {
    isPlatformAdmin: isPlatform,
    isTenantAdmin: isTenant,
    isBuiltIn,
    isProtected,
    label,
  }
}
