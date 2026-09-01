import { computed } from 'vue'
import { tenantsStore, userStore } from '@/stores/modules/user'
import {
  isPlatformAdminUser,
  isTenantAdminUser,
  getUserAdminProtection,
  isRestrictedAssignRole,
  type UserAdminProtectionInfo,
} from '@/utils/role'
import type { UserRecord } from '@/apis/upms/user/type'
import type { Id } from '@/apis/types'

/**
 * 管理员权限与身份判定 Composable
 */
export const useAdminAuth = () => {
  const currentUser = userStore()
  const tenantModule = tenantsStore()

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
    isPlatformAdmin,
    isTenantAdmin,
    isCurrentLoginTenant,
    getUserProtection,
    isRestrictedAssignRole,
  }
}
