import { computed } from 'vue'
import { tenantsStore, userStore } from '@/stores/modules/user'
import {
  isPlatformAdminUser,
  isTenantAdminUser,
  isOrdinaryUser,
  getUserAdminProtection,
  isRestrictedAssignRole,
  type UserAdminProtectionInfo,
} from '@/utils/role'
import type { UserRecord } from '@/apis/upms/user/type'
import type { Id } from '@/apis/types'

/**
 * 管理员与系统角色身份判定 Composable
 */
export const useAdminAuth = () => {
  const currentUser = userStore()
  const tenantModule = tenantsStore()

  /**
   * 当前登录用户拥有的所有角色编码集合（大写下划线格式）
   */
  const roleCodes = computed<string[]>(() => {
    return (currentUser.roles || []).map((r) => r.roleCode).filter(Boolean) as string[]
  })

  /**
   * 检查当前用户是否包含指定角色码（如 hasRole(SystemRole.PLATFORM_ADMIN)）
   */
  const hasRole = (roleCode: string): boolean => {
    return roleCodes.value.includes(roleCode)
  }

  /**
   * 当前登录用户是否为平台管理员（拥有最高平台权限）
   */
  const isPlatformAdmin = computed<boolean>(() => {
    return isPlatformAdminUser(currentUser.userInfo, currentUser.roles)
  })

  /**
   * 当前登录用户是否为当前租户的租户管理员
   */
  const isTenantAdmin = computed<boolean>(() => {
    const currentTenant = tenantModule.userTenant.currentTenant
    return isTenantAdminUser(currentUser.userInfo, currentUser.roles, currentTenant)
  })

  /**
   * 当前登录用户是否具备普通用户角色 (ORDINARY)
   */
  const isOrdinary = computed<boolean>(() => {
    return isOrdinaryUser(currentUser.roles)
  })

  /**
   * 判断某个租户 ID 是否为当前用户正在登录工作的租户
   */
  const isCurrentLoginTenant = (tenantId: Id | null | undefined): boolean => {
    if (!tenantId) return false
    const currentId = tenantModule.userTenant.currentTenant?.id
    return Boolean(currentId && String(currentId) === String(tenantId))
  }

  /**
   * 获取单行用户记录的受保护信息（用于禁用特定操作按钮与悬浮提示）
   */
  const getUserProtection = (record: UserRecord): UserAdminProtectionInfo => {
    return getUserAdminProtection(record, tenantModule.userTenant.currentTenant)
  }

  return {
    roleCodes,
    hasRole,
    isPlatformAdmin,
    isTenantAdmin,
    isOrdinary,
    isCurrentLoginTenant,
    getUserProtection,
    isRestrictedAssignRole,
  }
}
