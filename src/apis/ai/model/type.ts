import type { Id, PageRequest } from '@/apis/types'

/**
 * 模型目录记录对象
 */
export interface ModelRecord {
  id: Id
  version?: string | number
  providerCode: string
  modelName: string
  modelCode: string
  modelType: string
  sort: number
  logoPath?: string | null
  description?: string | null
  apiKeyUrl?: string | null
  setupGuideUrl?: string | null
  baseUrlHelp?: string | null
  embedding?: number[] | null
  dataStatus: number
  createTime?: string
  updateTime?: string
}

/**
 * 模型目录分页查询参数
 * size 最大支持 200
 */
export interface ModelQuery extends PageRequest {
  providerCode?: string
  modelType?: string
  dataStatus?: number
}

/**
 * 新增模型 DTO
 */
export interface ModelCreateDTO {
  providerCode: string
  modelName: string
  modelCode: string
  modelType: string
  sort: number
  logoPath?: string | null
  description?: string | null
  apiKeyUrl?: string | null
  setupGuideUrl?: string | null
  baseUrlHelp?: string | null
  embedding?: number[] | null
  dataStatus: number
}

/**
 * 修改模型 DTO（包含启停更新，提交完整表单及当前 version）
 */
export interface ModelUpdateDTO {
  providerCode: string
  modelName: string
  modelCode: string
  modelType: string
  sort: number
  logoPath?: string | null
  description?: string | null
  apiKeyUrl?: string | null
  setupGuideUrl?: string | null
  baseUrlHelp?: string | null
  embedding?: number[] | null
  dataStatus: number
  version: string | number
}
