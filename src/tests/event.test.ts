import test from 'node:test'
import assert from 'node:assert'
import {
  EVENT_DELIVERY_STATUS,
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
  EVENT_DELIVERY_STATUS_OPTIONS,
  EVENT_MESSAGE_STATUS,
  EVENT_MESSAGE_STATUS_BADGE,
  EVENT_MESSAGE_STATUS_LABEL,
  EVENT_MESSAGE_STATUS_OPTIONS,
  EVENT_PERMISSION_CODE,
} from '../constant/index.ts'

test('事件投递状态常量及中文标签映射', () => {
  assert.strictEqual(EVENT_DELIVERY_STATUS.PENDING, 0)
  assert.strictEqual(EVENT_DELIVERY_STATUS.DELIVERING, 1)
  assert.strictEqual(EVENT_DELIVERY_STATUS.SUCCESS, 2)
  assert.strictEqual(EVENT_DELIVERY_STATUS.RETRYING, 3)
  assert.strictEqual(EVENT_DELIVERY_STATUS.DEAD_LETTER, 4)

  assert.strictEqual(EVENT_DELIVERY_STATUS_LABEL[0], '待投递')
  assert.strictEqual(EVENT_DELIVERY_STATUS_LABEL[1], '投递中')
  assert.strictEqual(EVENT_DELIVERY_STATUS_LABEL[2], '成功')
  assert.strictEqual(EVENT_DELIVERY_STATUS_LABEL[3], '等待重试')
  assert.strictEqual(EVENT_DELIVERY_STATUS_LABEL[4], '死信')

  assert.strictEqual(EVENT_DELIVERY_STATUS_BADGE[2], 'success')
  assert.strictEqual(EVENT_DELIVERY_STATUS_BADGE[3], 'warning')
  assert.strictEqual(EVENT_DELIVERY_STATUS_BADGE[4], 'error')

  assert.strictEqual(EVENT_DELIVERY_STATUS_OPTIONS.length, 5)
})

test('仅状态 3（等待重试）与 4（死信）具备重播资格', () => {
  const isReplayable = (status: number) => {
    return (
      status === EVENT_DELIVERY_STATUS.RETRYING ||
      status === EVENT_DELIVERY_STATUS.DEAD_LETTER
    )
  }

  assert.strictEqual(isReplayable(EVENT_DELIVERY_STATUS.PENDING), false)
  assert.strictEqual(isReplayable(EVENT_DELIVERY_STATUS.DELIVERING), false)
  assert.strictEqual(isReplayable(EVENT_DELIVERY_STATUS.SUCCESS), false)
  assert.strictEqual(isReplayable(EVENT_DELIVERY_STATUS.RETRYING), true)
  assert.strictEqual(isReplayable(EVENT_DELIVERY_STATUS.DEAD_LETTER), true)
})

test('事件类型编码点分格式正则校验（对齐后端 Pattern）', () => {
  const eventCodeRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/

  // 合法格式（小写字母、数字及中划线，点分分隔）
  assert.strictEqual(eventCodeRegex.test('upms.user.created'), true)
  assert.strictEqual(eventCodeRegex.test('order.payment-completed'), true)
  assert.strictEqual(eventCodeRegex.test('order.item-notify'), true)
  assert.strictEqual(eventCodeRegex.test('a.b'), true)

  // 非法格式
  assert.strictEqual(eventCodeRegex.test('Upms.User.Created'), false, '大写字母应拒绝')
  assert.strictEqual(eventCodeRegex.test('userCreated'), false, '无点分应拒绝')
  assert.strictEqual(eventCodeRegex.test('.user.created'), false, '点开头应拒绝')
  assert.strictEqual(eventCodeRegex.test('user.created.'), false, '点结尾应拒绝')
  assert.strictEqual(eventCodeRegex.test('user..created'), false, '连续点应拒绝')
  assert.strictEqual(eventCodeRegex.test('user_created.event'), false, '下划线应拒绝')
})

test('事件中心权限资源码合规性', () => {
  assert.strictEqual(EVENT_PERMISSION_CODE.TYPE, 'event:type')
  assert.strictEqual(EVENT_PERMISSION_CODE.SUBSCRIPTION, 'event:subscription')
  assert.strictEqual(EVENT_PERMISSION_CODE.MESSAGE, 'event:message')
  assert.strictEqual(EVENT_PERMISSION_CODE.DELIVERY, 'event:delivery')
})

test('事件消息状态常量及中文标签映射', () => {
  assert.strictEqual(EVENT_MESSAGE_STATUS.NORMAL, 'NORMAL')
  assert.strictEqual(EVENT_MESSAGE_STATUS.ERROR, 'ERROR')

  assert.strictEqual(EVENT_MESSAGE_STATUS_LABEL['NORMAL'], '正常')
  assert.strictEqual(EVENT_MESSAGE_STATUS_LABEL['ERROR'], '异常')

  assert.strictEqual(EVENT_MESSAGE_STATUS_BADGE['NORMAL'], 'success')
  assert.strictEqual(EVENT_MESSAGE_STATUS_BADGE['ERROR'], 'error')

  assert.strictEqual(EVENT_MESSAGE_STATUS_OPTIONS.length, 2)
  assert.strictEqual(EVENT_MESSAGE_STATUS_OPTIONS[0].value, 'NORMAL')
  assert.strictEqual(EVENT_MESSAGE_STATUS_OPTIONS[1].value, 'ERROR')
})

test('消息分页查询参数清洗（空字符串、null、undefined 过滤，保留大写 NORMAL/ERROR）', () => {
  // 模拟清洗逻辑
  const sanitize = (params: Record<string, any>) => {
    const clean: Record<string, any> = {}
    for (const [key, value] of Object.entries(params)) {
      if (value !== '' && value !== null && value !== undefined) {
        clean[key] = value
      }
    }
    return clean
  }

  const rawQuery = {
    current: 1,
    size: 10,
    eventId: '',
    eventType: 'order.created',
    eventTypeId: undefined,
    messageStatus: 'NORMAL',
    sourceApplication: null,
    startTime: '2026-09-17T12:00:00.000Z',
    endTime: '',
  }

  const cleaned = sanitize(rawQuery)

  assert.deepStrictEqual(cleaned, {
    current: 1,
    size: 10,
    eventType: 'order.created',
    messageStatus: 'NORMAL',
    startTime: '2026-09-17T12:00:00.000Z',
  })
  assert.strictEqual('eventId' in cleaned, false)
  assert.strictEqual('eventTypeId' in cleaned, false)
  assert.strictEqual('sourceApplication' in cleaned, false)
  assert.strictEqual('endTime' in cleaned, false)
})

test('消息状态业务规则：ERROR 消息不可重播且未进入投递流程', () => {
  const canReplayDelivery = (messageStatus: string, deliveryStatus: number) => {
    // 异常消息未进入投递流程，绝对不提供投递重试或重放
    if (messageStatus === EVENT_MESSAGE_STATUS.ERROR) {
      return false
    }
    // 正常消息仅等待重试(3)与死信(4)可重播
    return (
      deliveryStatus === EVENT_DELIVERY_STATUS.RETRYING ||
      deliveryStatus === EVENT_DELIVERY_STATUS.DEAD_LETTER
    )
  }

  // 正常消息
  assert.strictEqual(canReplayDelivery('NORMAL', EVENT_DELIVERY_STATUS.PENDING), false)
  assert.strictEqual(canReplayDelivery('NORMAL', EVENT_DELIVERY_STATUS.DELIVERING), false)
  assert.strictEqual(canReplayDelivery('NORMAL', EVENT_DELIVERY_STATUS.SUCCESS), false)
  assert.strictEqual(canReplayDelivery('NORMAL', EVENT_DELIVERY_STATUS.RETRYING), true)
  assert.strictEqual(canReplayDelivery('NORMAL', EVENT_DELIVERY_STATUS.DEAD_LETTER), true)

  // 异常消息：即使传入重试/死信状态也一律拒绝重播
  assert.strictEqual(canReplayDelivery('ERROR', EVENT_DELIVERY_STATUS.RETRYING), false)
  assert.strictEqual(canReplayDelivery('ERROR', EVENT_DELIVERY_STATUS.DEAD_LETTER), false)
})
