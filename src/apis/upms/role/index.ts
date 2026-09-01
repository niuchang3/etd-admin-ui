import type { Id, PageResult, ResultModel } from '@/apis/types'
import request from '@/utils/Request'
import type {
  SystemRole,
  SystemRoleMenu,
  SystemRoleMenuAssignDTO,
  SystemRoleOrganizationAssignDTO,
  SystemRoleQuery,
  SystemRoleSaveDTO,
} from './type'

const ROLE_API = '/upms/api/v1/role'

/** 分页查询角色，keyword 同时匹配角色名称和角色编码。 */
export const getSystemRolePage = (params: SystemRoleQuery) =>
  request.get<ResultModel<PageResult<SystemRole>>>({ url: ROLE_API, params })

/** 根据字符串 ID 查询角色详情。 */
export const getSystemRole = (id: string) =>
  request.get<ResultModel<SystemRole | null>>({ url: `${ROLE_API}/${id}` })

/** 新增角色。 */
export const createSystemRole = (data: SystemRoleSaveDTO) =>
  request.post<ResultModel<string>>({ url: ROLE_API, data })

/** 全量修改角色表单字段。 */
export const updateSystemRole = (id: string, data: SystemRoleSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: `${ROLE_API}/${id}`, data })

/** 删除非内置且未分配给用户的角色。 */
export const deleteSystemRole = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: `${ROLE_API}/${id}` })

/** 使用独立接口启用或禁用角色。 */
export const changeSystemRoleStatus = (id: string, dataStatus: 0 | 1) =>
  request.patch<ResultModel<boolean>>({ url: `${ROLE_API}/${id}/status/${dataStatus}` })

/** 查询角色当前已经分配的菜单及访问级别。 */
export const getSystemRoleMenus = (id: string) =>
  request.get<ResultModel<SystemRoleMenu[]>>({ url: `${ROLE_API}/${id}/menus` })

/** 全量保存角色菜单授权，menus 为空数组时清空授权。 */
export const assignSystemRoleMenus = (id: string, data: SystemRoleMenuAssignDTO) =>
  request.put<ResultModel<boolean>>({ url: `${ROLE_API}/${id}/menus`, data })

/** 查询角色当前关联的组织 ID 列表（当 permissionType === '5' 时）。 */
export const getSystemRoleOrganizations = (id: string) =>
  request.get<ResultModel<Id[]>>({ url: `${ROLE_API}/${id}/organizations` })

/** 全量保存角色组织数据权限范围（仅在 permissionType === '5' 的非内置角色独立维护时使用）。 */
export const assignSystemRoleOrganizations = (id: string, data: SystemRoleOrganizationAssignDTO) =>
  request.put<ResultModel<boolean>>({ url: `${ROLE_API}/${id}/organizations`, data })

