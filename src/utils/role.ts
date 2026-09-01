import type { Id } from '@/apis/types'
import type { UserInfo, UserRole, Tenant } from '@/apis/upms/login/type'
import type { UserRecord, UserRoleItem } from '@/apis/upms/user/type'

/**
 * 角色编码规范化：去除空格、下划线、短横线并统一转为小写。
 * 例如：'platform_admin' -> 'platformadmin', 'PLATFORM-ADMIN' -> 'platformadmin'
 */
export const normalizeRoleCode = (roleCode?: string | null): string => {
  return String(roleCode || '').trim().toLowerCase().replace(/[-_]/g, '')
}

/**
 * 判断角色是否为平台管理员
 * 严格依据系统内置角色 roleCode 判断，绝不依赖中文名称
 */
export const isPlatformAdminRole = (role?: { roleCode?: string | null } | null): boolean => {
  if (!role) return false
  return normalizeRoleCode(role.roleCode) === 'platformadmin'
}

/**
 * 判断角色是否为租户管理员
 * 严格依据系统内置角色 roleCode 判断，绝不依赖中文名称
 */
export const isTenantAdminRole = (role?: { roleCode?: string | null } | null): boolean => {
  if (!role) return false
  return normalizeRoleCode(role.roleCode) === 'tenantadmin'
}

/**
 * 判断是否为禁止在页面端分配给用户的受限管理员角色（平台管理员、租户管理员）
 * 严格依据系统内置角色 roleCode 判断，绝不依赖中文名称
 */
export const isRestrictedAssignRole = (role?: { roleCode?: string | null } | null): boolean => {
  return isPlatformAdminRole(role) || isTenantAdminRole(role)
}

/**
 * 判断用户对象或当前登录用户是否为平台管理员
 * 依据 userInfo.platformAdmin 字段或绑定的 platformadmin 角色
 */
export const isPlatformAdminUser = (
  userInfo?: (Partial<UserInfo> & Record<string, unknown>) | null,
  roles?: (UserRole | UserRoleItem | { roleCode?: string | null })[] | null
): boolean => {
  if (!userInfo && !roles?.length) return false

  const pAdmin = (userInfo as Record<string, unknown> | undefined)?.platformAdmin
  if (pAdmin === true || (pAdmin as unknown) === 1 || String(pAdmin) === 'true') {
    return true
  }

  return (roles || []).some((r) => isPlatformAdminRole(r))
}

/**
 * 判断用户对象是否为租户管理员
 * 依据 tenantAdmin 字段、租户绑定的 tenantAdminUser ID、或绑定的 tenantadmin 角色
 */
export const isTenantAdminUser = (
  userRecord?: { id?: Id | string | null; tenantAdmin?: boolean | number | string | null; [key: string]: unknown } | null,
  roles?: (UserRole | UserRoleItem | { roleCode?: string | null })[] | null,
  currentTenant?: (Partial<Tenant> & { tenantAdminUser?: Id | null }) | null
): boolean => {
  if (!userRecord && !roles?.length) return false

  // 1. 字段标识判断
  const tAdmin = (userRecord as Record<string, unknown> | undefined)?.tenantAdmin
  if (tAdmin === true || (tAdmin as unknown) === 1 || String(tAdmin) === 'true') {
    return true
  }

  // 2. 租户绑定管理员 ID 判断
  const currentTenantAdminId = currentTenant?.tenantAdminUser ? String(currentTenant.tenantAdminUser) : ''
  const userId = userRecord?.id ? String(userRecord.id) : ''
  if (currentTenantAdminId && userId && currentTenantAdminId === userId) {
    return true
  }

  // 3. 角色编码判断
  return (roles || []).some((r) => isTenantAdminRole(r))
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
