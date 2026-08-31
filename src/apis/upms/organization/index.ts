import type { ResultModel } from '@/apis/types'
import request from '@/utils/Request'
import type { Organization, OrganizationSaveRequest } from './type'

const ORG_API = '/upms/api/v1/organization'

/** 查询组织树 */
export const getOrganizationTree = (params?: { keyword?: string; enabled?: boolean }) =>
  request.get<ResultModel<Organization[]>>({ url: `${ORG_API}/tree`, params })

/** 查询组织详情 */
export const getOrganizationDetail = (id: string) =>
  request.get<ResultModel<Organization | null>>({ url: `${ORG_API}/${id}` })

/** 新增组织 */
export const createOrganization = (data: OrganizationSaveRequest) =>
  request.post<ResultModel<string>>({ url: ORG_API, data })

/** 修改组织 */
export const updateOrganization = (id: string, data: OrganizationSaveRequest) =>
  request.put<ResultModel<boolean>>({ url: `${ORG_API}/${id}`, data })

/** 删除组织 */
export const deleteOrganization = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: `${ORG_API}/${id}` })

/** 启用或停用组织 */
export const changeOrganizationStatus = (id: string, enabled: boolean) =>
  request.patch<ResultModel<boolean>>({ url: `${ORG_API}/${id}/enabled/${enabled}` })
