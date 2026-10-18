import type { Id, PageRequest } from '@/apis/types'

/** 模型连接记录数据 */
export interface ModelConnectionRecord {
  id: Id
  version: string | number
  createTime: string
  updateTime: string
  connectionName: string
  provider: string
  baseUrl: string
  authType: string
  credentialConfigured: boolean
  remark?: string | null
  dataStatus?: number
}

/** 模型连接查询参数 */
export interface ModelConnectionQuery extends PageRequest {
  keyword?: string
  dataStatus?: number
}

/** 模型连接新增/更新保存 DTO */
export interface ModelConnectionSaveDTO {
  connectionName: string
  provider: string
  baseUrl: string
  authType: string
  apiKey?: string
  remark?: string | null
  version?: string | number
}

