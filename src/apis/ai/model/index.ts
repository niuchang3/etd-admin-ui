import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  ModelCreateDTO,
  ModelQuery,
  ModelRecord,
  ModelUpdateDTO,
} from './type'

const MODEL_API = '/ai/api/v1/models'

/**
 * 按分页与筛选条件查询模型目录列表
 */
export const getModelPage = async (params: ModelQuery) => {
  return await request.get<ResultModel<PageResult<ModelRecord>>>({
    url: MODEL_API,
    params,
  })
}

/**
 * 查询指定模型的详细信息（含 version、modelCode、apiKeyUrl、setupGuideUrl、baseUrlHelp 等）
 */
export const getModel = async (id: string) => {
  return await request.get<ResultModel<ModelRecord>>({
    url: `${MODEL_API}/${encodeURIComponent(id)}`,
  })
}

/**
 * 新增模型
 */
export const createModel = async (data: ModelCreateDTO) => {
  return await request.post<ResultModel<string>>({
    url: MODEL_API,
    data,
  })
}

/**
 * 修改模型（编辑及启停统一使用此接口，提交完整表单及当前 version）
 */
export const updateModel = async (id: string, data: ModelUpdateDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `${MODEL_API}/${encodeURIComponent(id)}`,
    data,
  })
}

/**
 * 逻辑删除模型
 */
export const deleteModel = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${MODEL_API}/${encodeURIComponent(id)}`,
  })
}
