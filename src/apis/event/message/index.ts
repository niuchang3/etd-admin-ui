import request from '@/utils/Request'
import type { Id, PageResult, ResultModel } from '@/apis/types'
import type { EventMessageDetail, EventMessageQuery, EventMessageRecord } from './type'

/** 按分页条件查询事件消息列表 */
export const getEventMessagePage = async (params: EventMessageQuery) => {
  return await request.get<ResultModel<PageResult<EventMessageRecord>>>({
    url: '/event/api/v1/event/messages',
    params,
  })
}

/**
 * 查询事件消息聚合详情
 * 严禁只传单主键；后端需要 eventId 精确路由物理分表。
 */
export const getEventMessageDetail = async (eventId: string, id: Id) => {
  return await request.get<ResultModel<EventMessageDetail>>({
    url: `/event/api/v1/event/messages/${encodeURIComponent(eventId)}/${encodeURIComponent(id)}`,
  })
}
