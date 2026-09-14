import request from '@/utils/Request'
import type { Id, PageResult, ResultModel } from '@/apis/types'
import type { EventDeliveryQuery, EventDeliveryRecord } from './type'

/** 按分页条件查询投递记录列表 */
export const getEventDeliveryPage = async (params: EventDeliveryQuery) => {
  return await request.get<ResultModel<PageResult<EventDeliveryRecord>>>({
    url: '/event/api/v1/event/deliveries',
    params,
  })
}

/**
 * 查询投递记录详情
 * 严禁只传单主键；后端需要 eventId 精确路由物理分表。
 */
export const getEventDeliveryDetail = async (eventId: string, id: Id) => {
  return await request.get<ResultModel<EventDeliveryRecord>>({
    url: `/event/api/v1/event/deliveries/${encodeURIComponent(eventId)}/${encodeURIComponent(id)}`,
  })
}

/**
 * 定向重播失败订阅投递
 * 严禁只传单主键；后端使用 eventId 精确路由物理分表并对指定订阅重播。
 */
export const replayEventDelivery = async (eventId: string, id: Id) => {
  return await request.post<ResultModel<boolean>>({
    url: `/event/api/v1/event/deliveries/${encodeURIComponent(eventId)}/${encodeURIComponent(id)}/replay`,
  })
}
