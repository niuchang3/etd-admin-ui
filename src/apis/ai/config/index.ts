import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  ModelConfigQuery,
  ModelConfigRecord,
  ModelConfigSaveDTO,
} from './type'

const CONFIG_API = '/ai/api/v1/model-configs'

/** 按分页条件查询模型配置列表 */
export const getModelConfigPage = async (params: ModelConfigQuery) => {
  return await request.get<ResultModel<PageResult<ModelConfigRecord>>>({
    url: CONFIG_API,
    params,
  })
}

/** 查询模型配置详情 */
export const getModelConfig = async (id: string) => {
  return await request.get<ResultModel<ModelConfigRecord>>({
    url: `${CONFIG_API}/${encodeURIComponent(id)}`,
  })
}

/** 新增模型配置草稿 */
export const createModelConfig = async (data: ModelConfigSaveDTO) => {
  return await request.post<ResultModel<string>>({
    url: CONFIG_API,
    data,
  })
}

/** 更新模型配置草稿 */
export const updateModelConfig = async (id: string, data: ModelConfigSaveDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `${CONFIG_API}/${encodeURIComponent(id)}`,
    data,
  })
}

/** 删除模型配置 */
export const deleteModelConfig = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${CONFIG_API}/${encodeURIComponent(id)}`,
  })
}
