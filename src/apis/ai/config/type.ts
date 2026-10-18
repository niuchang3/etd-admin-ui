import type { Id, PageRequest } from '@/apis/types'

/** 模型配置记录数据（草稿维护） */
export interface ModelConfigRecord {
  id: Id
  version: string | number
  createTime: string
  updateTime: string
  connectionId: string
  connectionName?: string
  modelName: string
  modelType: string
  modelCode: string
  remark?: string | null
  embeddingDimensions?: number | null
  verified: boolean
  dataStatus?: number
}

/** 模型配置查询参数 */
export interface ModelConfigQuery extends PageRequest {
  keyword?: string
  modelType?: string
  dataStatus?: number
}

/** 模型配置新增/更新保存 DTO（不得提交 embeddingDimensions 或能力扩展参数） */
export interface ModelConfigSaveDTO {
  connectionId: string
  modelName: string
  modelType: string
  modelCode: string
  remark?: string | null
  version?: string | number
}

