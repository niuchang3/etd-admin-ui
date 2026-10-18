import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  ModelConnectionQuery,
  ModelConnectionRecord,
  ModelConnectionSaveDTO,
} from './type'

const CONNECTION_API = '/ai/api/v1/model-connections'

/** 按分页条件查询模型连接列表 */
export const getModelConnectionPage = async (params: ModelConnectionQuery) => {
  return await request.get<ResultModel<PageResult<ModelConnectionRecord>>>({
    url: CONNECTION_API,
    params,
  })
}

/** 查询模型连接详情 */
export const getModelConnection = async (id: string) => {
  return await request.get<ResultModel<ModelConnectionRecord>>({
    url: `${CONNECTION_API}/${encodeURIComponent(id)}`,
  })
}

/** 新增模型连接 */
export const createModelConnection = async (data: ModelConnectionSaveDTO) => {
  return await request.post<ResultModel<string>>({
    url: CONNECTION_API,
    data,
  })
}

/** 更新模型连接 */
export const updateModelConnection = async (id: string, data: ModelConnectionSaveDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `${CONNECTION_API}/${encodeURIComponent(id)}`,
    data,
  })
}

/** 删除模型连接（若仍有关联模型配置，后端将拒绝删除） */
export const deleteModelConnection = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${CONNECTION_API}/${encodeURIComponent(id)}`,
  })
}
