import type { PageResult, ResultModel } from '@/apis/types'
import request from '@/utils/Request'
import type {
  SystemDictData,
  SystemDictDataQuery,
  SystemDictDataSaveDTO,
  SystemDictType,
  SystemDictTypeQuery,
  SystemDictTypeSaveDTO,
} from './type'

const DICT_TYPE_API = '/upms/api/v1/dict/type'
const DICT_DATA_API = '/upms/api/v1/dict/data'

/** 分页查询字典类型。 */
export const getSystemDictTypePage = (params: SystemDictTypeQuery) =>
  request.get<ResultModel<PageResult<SystemDictType>>>({ url: DICT_TYPE_API, params })

/** 查询字典类型详情。 */
export const getSystemDictType = (id: string) =>
  request.get<ResultModel<SystemDictType | null>>({ url: `${DICT_TYPE_API}/${id}` })

/** 新增字典类型。 */
export const createSystemDictType = (data: SystemDictTypeSaveDTO) =>
  request.post<ResultModel<string>>({ url: DICT_TYPE_API, data })

/** 全量修改字典类型表单字段。 */
export const updateSystemDictType = (id: string, data: SystemDictTypeSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: `${DICT_TYPE_API}/${id}`, data })

/** 删除非内置且没有字典项的字典类型。 */
export const deleteSystemDictType = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: `${DICT_TYPE_API}/${id}` })

/** 切换字典类型启用状态。 */
export const changeSystemDictTypeEnabled = (id: string, enabled: boolean) =>
  request.patch<ResultModel<boolean>>({ url: `${DICT_TYPE_API}/${id}/enabled/${enabled}` })

/** 查询指定字典类型下的字典项分页数据。 */
export const getSystemDictDataPage = (params: SystemDictDataQuery) =>
  request.get<ResultModel<PageResult<SystemDictData>>>({ url: DICT_DATA_API, params })

/** 查询字典项详情。 */
export const getSystemDictData = (id: string) =>
  request.get<ResultModel<SystemDictData | null>>({ url: `${DICT_DATA_API}/${id}` })

/** 新增字典项。 */
export const createSystemDictData = (data: SystemDictDataSaveDTO) =>
  request.post<ResultModel<string>>({ url: DICT_DATA_API, data })

/** 全量修改字典项表单字段。 */
export const updateSystemDictData = (id: string, data: SystemDictDataSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: `${DICT_DATA_API}/${id}`, data })

/** 删除字典项。 */
export const deleteSystemDictData = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: `${DICT_DATA_API}/${id}` })

/** 切换字典项启用状态。 */
export const changeSystemDictDataEnabled = (id: string, enabled: boolean) =>
  request.patch<ResultModel<boolean>>({ url: `${DICT_DATA_API}/${id}/enabled/${enabled}` })

/** 业务页面按类型编码查询启用字典项的复用方法。 */
export const getEnabledDictData = (typeCode: string) =>
  request.get<ResultModel<SystemDictData[]>>({
    url: `${DICT_TYPE_API}/code/${encodeURIComponent(typeCode)}/data`,
  })
