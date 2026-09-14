import type { Id, PageRequest } from '@/apis/types'

/** 事件类型列表分页筛选参数 */
export interface EventTypeQuery extends PageRequest {
  keyword?: string
  sourceApplication?: string
  enabled?: boolean
}

/** 事件类型单条记录数据模型 */
export interface EventTypeRecord {
  id: Id
  eventType: string
  eventName: string
  sourceApplication: string
  latestVersion: number
  description?: string | null
  enabled: boolean
  version: number
  createTime?: string
  updateTime?: string
}

/** 新增事件类型请求体 */
export interface EventTypeCreateForm {
  eventType: string
  eventName: string
  sourceApplication: string
  latestVersion: number
  description?: string | null
}

/** 修改事件类型请求体（乐观锁包装） */
export interface EventTypeUpdateDTO {
  content: {
    eventType: string
    eventName: string
    sourceApplication: string
    latestVersion: number
    description?: string | null
  }
  version: number
}

/** 事件类型下拉选项 */
export interface EventTypeOption {
  id?: Id
  value?: Id
  eventType: string
  eventName: string
  label?: string
  sourceApplication?: string
}
