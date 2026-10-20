import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  SquareConnectionCreateDTO,
  SquareConnectionQuery,
  SquareConnectionRecord,
  SquareConnectionStatusDTO,
  SquareConnectionUpdateDTO,
  SquareModelQuery,
  SquareModelRecord,
} from './type'

const SQUARE_BASE_API = '/ai/api/v1/model-square'

/**
 * 分页查询模型广场模型列表
 * 参数：current, size, providerCode, modelType, keyword, connected
 */
export const getSquareModelPage = async (params: SquareModelQuery) => {
  return await request.get<ResultModel<PageResult<SquareModelRecord>>>({
    url: `${SQUARE_BASE_API}/models`,
    params,
  })
}

/**
 * 查询模型广场指定模型详情
 */
export const getSquareModelDetail = async (id: string) => {
  return await request.get<ResultModel<SquareModelRecord>>({
    url: `${SQUARE_BASE_API}/models/${encodeURIComponent(id)}`,
  })
}

/**
 * 查询指定模型的已有连接列表
 * GET /connections?modelId=xxx
 */
export const getSquareConnections = async (params: SquareConnectionQuery) => {
  return await request.get<ResultModel<SquareConnectionRecord[]>>({
    url: `${SQUARE_BASE_API}/connections`,
    params,
  })
}

/**
 * 查询指定连接详情
 */
export const getSquareConnectionDetail = async (id: string) => {
  return await request.get<ResultModel<SquareConnectionRecord>>({
    url: `${SQUARE_BASE_API}/connections/${encodeURIComponent(id)}`,
  })
}

/**
 * 新增模型连接
 * 锁定当前 modelId，提交 modelId, protocol, baseUrl, authType, apiKey, remark
 */
export const createSquareConnection = async (data: SquareConnectionCreateDTO) => {
  return await request.post<ResultModel<string>>({
    url: `${SQUARE_BASE_API}/connections`,
    data,
  })
}

/**
 * 修改模型连接
 * 携带完整配置和当前 version，API Key 留空保留原密钥
 */
export const updateSquareConnection = async (id: string, data: SquareConnectionUpdateDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `${SQUARE_BASE_API}/connections/${encodeURIComponent(id)}`,
    data,
  })
}

/**
 * 启停模型连接
 * 提交 dataStatus 与 version
 */
export const updateSquareConnectionStatus = async (
  id: string,
  data: SquareConnectionStatusDTO
) => {
  return await request.put<ResultModel<boolean>>({
    url: `${SQUARE_BASE_API}/connections/${encodeURIComponent(id)}/status`,
    data,
  })
}

/**
 * 删除模型连接
 */
export const deleteSquareConnection = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${SQUARE_BASE_API}/connections/${encodeURIComponent(id)}`,
  })
}
