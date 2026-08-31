import type { PageResult, ResultModel } from '@/apis/types'
import request from '@/utils/Request'
import type { SystemConfig, SystemConfigQuery, SystemConfigSaveDTO } from './type'

const CONFIG_API = '/upms/api/v1/config'

/** 分页查询系统参数，keyword 同时匹配参数键和参数名称。 */
export const getSystemConfigPage = (params: SystemConfigQuery) =>
  request.get<ResultModel<PageResult<SystemConfig>>>({ url: CONFIG_API, params })

/** 根据字符串 ID 查询参数详情。 */
export const getSystemConfig = (id: string) =>
  request.get<ResultModel<SystemConfig | null>>({ url: `${CONFIG_API}/${id}` })

/** 业务页面可按参数键直接查询参数配置。 */
export const getSystemConfigByKey = (parameterKey: string) =>
  request.get<ResultModel<SystemConfig | null>>({ url: `${CONFIG_API}/key/${encodeURIComponent(parameterKey)}` })

/** 新增系统参数。 */
export const createSystemConfig = (data: SystemConfigSaveDTO) =>
  request.post<ResultModel<string>>({ url: CONFIG_API, data })

/** 全量修改系统参数表单字段。 */
export const updateSystemConfig = (id: string, data: SystemConfigSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: `${CONFIG_API}/${id}`, data })

/** 删除非内置系统参数。 */
export const deleteSystemConfig = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: `${CONFIG_API}/${id}` })

/** 使用独立接口切换系统参数启用状态。 */
export const changeSystemConfigEnabled = (id: string, enabled: boolean) =>
  request.patch<ResultModel<boolean>>({ url: `${CONFIG_API}/${id}/enabled/${enabled}` })

/** 批量查询启用参数值。 */
export const getSystemConfigValues = (parameterKeys: string[]) =>
  request.get<ResultModel<Record<string, string>>>({
    url: `${CONFIG_API}/values`,
    params: { parameterKeys },
  })
