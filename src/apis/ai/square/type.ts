import type { Id, PageRequest } from '@/apis/types'

/**
 * 模型广场模型记录对象
 * 每一个对象对应平台登记的具体模型
 */
export interface SquareModelRecord {
  id: Id
  version?: string | number
  providerCode: string
  modelName: string
  modelCode: string
  modelType: string
  sort?: number
  logo?: string | null
  logoPath?: string | null
  description?: string | null
  apiKeyUrl?: string | null
  setupGuideUrl?: string | null
  baseUrlHelp?: string | null
  embedding?: number[] | null
  dataStatus: number
  createTime?: string
  updateTime?: string

  // 模型广场聚合连接计数
  connectionCount: number
  enabledConnectionCount: number
}

/**
 * 模型广场模型分页查询参数
 * size 默认 12，最大 200
 * connected: 省略为全部，true 已接入，false 未接入
 */
export interface SquareModelQuery extends PageRequest {
  providerCode?: string
  modelType?: string
  keyword?: string
  connected?: boolean
}

/**
 * 模型广场连接记录对象
 * 绑定具体的单个模型
 */
export interface SquareConnectionRecord {
  id: Id
  version: string | number
  modelId: Id
  protocol: string
  baseUrl: string
  authType: string
  credentialConfigured: boolean
  remark?: string | null
  dataStatus: number
  createTime: string
  updateTime: string

  // 冗余的模型信息（若后端返回）
  modelName?: string
  modelCode?: string
  modelType?: string
  providerCode?: string
}

/**
 * 查询指定模型的连接参数
 */
export interface SquareConnectionQuery {
  modelId?: string
  dataStatus?: number
}

/**
 * 新增连接 DTO（锁定具体 modelId，不共用连接器）
 */
export interface SquareConnectionCreateDTO {
  modelId: string
  protocol: string
  baseUrl: string
  authType: string
  apiKey?: string
}

/**
 * 修改连接 DTO（携带完整配置与当前 version，编辑留空保留原密钥）
 * 提交字段为：modelId、protocol、baseUrl、authType、version；apiKey 按需提交
 */
export interface SquareConnectionUpdateDTO {
  modelId: string
  protocol: string
  baseUrl: string
  authType: string
  apiKey?: string
  version: string | number
}

/**
 * 启停连接 DTO
 */
export interface SquareConnectionStatusDTO {
  dataStatus: number
  version: string | number
}
