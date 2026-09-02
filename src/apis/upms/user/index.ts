import type { Id, PageResult, ResultModel } from '@/apis/types'
import request from '@/utils/Request'
import type {
  UserCreatePayload,
  UserOrganizationAssignPayload,
  UserOrganizationItem,
  UserQueryParams,
  UserRecord,
  UserRoleAssignPayload,
  UserRoleItem,
  UserUpdatePayload,
} from './type'

const USER_API = '/upms/api/v1/user'

/** 分页查询用户列表 */
export const getUserPage = async (params: UserQueryParams) => {
  return await request.get<ResultModel<PageResult<UserRecord>>>({
    url: USER_API,
    params,
  })
}

/** 查询用户详情（用于编辑回显） */
export const getUserDetail = async (id: Id) => {
  return await request.get<ResultModel<UserRecord>>({
    url: `${USER_API}/${encodeURIComponent(id)}`,
  })
}

/** 新增用户 */
export const createUser = async (data: UserCreatePayload) => {
  return await request.post<ResultModel<Id>>({
    url: USER_API,
    data,
  })
}

/** 修改用户基础资料 */
export const updateUser = async (id: Id, data: UserUpdatePayload) => {
  return await request.put<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}`,
    data,
  })
}

/** 删除用户 */
export const deleteUser = async (id: Id) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}`,
  })
}

/** 启用或停用用户 */
export const changeUserEnabled = async (id: Id, enabled: boolean) => {
  return await request.patch<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}/enabled/${enabled}`,
  })
}

/** 锁定或解锁用户 */
export const changeUserLocked = async (id: Id, locked: boolean) => {
  return await request.patch<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}/locked/${locked}`,
  })
}

/** 查询用户已绑定角色列表 */
export const getUserRoles = async (id: Id) => {
  return await request.get<ResultModel<UserRoleItem[]>>({
    url: `${USER_API}/${encodeURIComponent(id)}/roles`,
  })
}

/** 全量替换用户角色绑定 */
export const replaceUserRoles = async (id: Id, data: UserRoleAssignPayload) => {
  return await request.put<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}/roles`,
    data,
  })
}

/** 查询用户已绑定组织列表 */
export const getUserOrganizations = async (id: Id) => {
  return await request.get<ResultModel<UserOrganizationItem[]>>({
    url: `${USER_API}/${encodeURIComponent(id)}/organizations`,
  })
}

/** 全量替换用户组织绑定 */
export const replaceUserOrganizations = async (id: Id, data: UserOrganizationAssignPayload) => {
  return await request.put<ResultModel<boolean>>({
    url: `${USER_API}/${encodeURIComponent(id)}/organizations`,
    data,
  })
}
