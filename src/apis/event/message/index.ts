import request from '@/utils/Request'
import type { Id, PageResult, ResultModel } from '@/apis/types'
import type { EventMessageDetail, EventMessageQuery, EventMessageRecord } from './type'

/**
 * 清洗消息查询参数：
 * 严格过滤空字符串、null、undefined，避免向后端发送无效参数
 */
export function sanitizeMessageQueryParams<T extends Record<string, any>>(params: T): Record<string, any> {
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) {
      clean[key] = value
    }
  }
  return clean
}

/** 按分页条件查询事件消息列表 */
export const getEventMessagePage = async (params: EventMessageQuery) => {
  return await request.get<ResultModel<PageResult<EventMessageRecord>>>({
    url: '/event/api/v1/event/messages',
    params: sanitizeMessageQueryParams(params),
  })
}

/**
 * 查询事件消息聚合详情
 * 严禁只传单主键；后端需要 eventId 精确路由物理分表。
 */
export const getEventMessageDetail = async (eventId: string, id: Id | number) => {
  return await request.get<ResultModel<EventMessageDetail>>({
    url: `/event/api/v1/event/messages/${encodeURIComponent(String(eventId))}/${encodeURIComponent(String(id))}`,
  })
}
