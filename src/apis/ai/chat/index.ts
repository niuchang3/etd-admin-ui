import request from '@/utils/Request'
import type { ResultModel } from '@/apis/types'
import { getAccessToken } from '@/stores/modules/oauth'
import { tenantsStore } from '@/stores/modules/user'
import { APP_NAME, APP_VERSION, getDeviceId, getDeviceFingerprint } from '@/utils/device'
import { AUTH_TOKEN_PREFIX, HTTP_HEADER } from '@/constant'
import type {
  AgentChatMessageQuery,
  AgentChatMessageVO,
  AgentChatProfileVO,
  AgentChatRunVO,
  AgentChatSessionDTO,
  AgentChatSessionQuery,
  AgentChatSessionVO,
  AgentChatStreamRequest,
  AgentChatEvent,
  ConversationType,
} from './type'

const CHAT_BASE_API = '/ai/api/agent/chat'

/**
 * 获取请求所需的完整公共认证与设备上下文请求头
 * 原生 fetch 与普通请求保持 100% 相同头集
 */
export const getAiChatHeaders = (customHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': navigator.language || 'zh-CN',
    [HTTP_HEADER.APPLICATION]: APP_NAME,
    [HTTP_HEADER.VERSION]: APP_VERSION,
    [HTTP_HEADER.DEVICE_ID]: getDeviceId(),
    [HTTP_HEADER.DEVICE_FINGERPRINT]: getDeviceFingerprint(),
    'trace-id': crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }

  const token = getAccessToken()
  if (token) {
    headers[HTTP_HEADER.AUTHORIZATION] = AUTH_TOKEN_PREFIX + token
  }

  const tenantId = tenantsStore().userTenant.currentTenant?.id
  if (tenantId) {
    headers[HTTP_HEADER.TENANT_CODE] = String(tenantId)
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders)
  }

  return headers
}

/**
 * 1. 查询 Agent 聊天展示配置
 * GET /agent/chat/agents/{agentId}?conversationType=chat|debug
 */
export const getAgentChatProfile = async (agentId: string, conversationType: ConversationType = 'chat') => {
  return await request.get<ResultModel<AgentChatProfileVO>>({
    url: `${CHAT_BASE_API}/agents/${encodeURIComponent(agentId)}`,
    params: { conversationType },
  })
}

/**
 * 2. 创建 Agent 聊天会话
 * POST /agent/chat/sessions
 */
export const createChatSession = async (data: AgentChatSessionDTO) => {
  return await request.post<ResultModel<AgentChatSessionVO>>({
    url: `${CHAT_BASE_API}/sessions`,
    data,
  })
}

/**
 * 3. 分页查询个人会话列表
 * GET /agent/chat/sessions?agentId=...&beforeId=...&size=20
 */
export const getChatSessionList = async (params: AgentChatSessionQuery = {}) => {
  return await request.get<ResultModel<AgentChatSessionVO[]>>({
    url: `${CHAT_BASE_API}/sessions`,
    params,
  })
}

/**
 * 3.1 删除 Agent 聊天会话
 * DELETE /agent/chat/sessions/{sessionId}
 * 无需请求体，sessionId 为字符串
 */
export const deleteChatSession = async (sessionId: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${CHAT_BASE_API}/sessions/${encodeURIComponent(sessionId)}`,
  })
}

/**
 * 4. 查询消息历史记录（向前翻页使用 beforeSequence，本页升序）
 * GET /agent/chat/sessions/{sessionId}/messages?beforeSequence=...&size=50
 */
export const getChatMessageList = async (sessionId: string, params: AgentChatMessageQuery = {}) => {
  return await request.get<ResultModel<AgentChatMessageVO[]>>({
    url: `${CHAT_BASE_API}/sessions/${encodeURIComponent(sessionId)}/messages`,
    params,
  })
}

/**
 * 6. 查询 Run 执行状态及已知 Token 用量
 * GET /agent/chat/runs/{runId}
 */
export const getChatRun = async (runId: string) => {
  return await request.get<ResultModel<AgentChatRunVO>>({
    url: `${CHAT_BASE_API}/runs/${encodeURIComponent(runId)}`,
  })
}

/**
 * 7. 按请求标识查询 Agent 执行状态（断线后未收到 start 时查找原 Run）
 * GET /agent/chat/sessions/{sessionId}/runs?requestId=...
 */
export const getChatRunByRequest = async (sessionId: string, requestId: string) => {
  return await request.get<ResultModel<AgentChatRunVO>>({
    url: `${CHAT_BASE_API}/sessions/${encodeURIComponent(sessionId)}/runs`,
    params: { requestId },
  })
}

/**
 * 8. 停止生成 Agent 回答
 * POST /agent/chat/runs/{runId}/cancel
 */
export const cancelChatRun = async (runId: string) => {
  return await request.post<ResultModel<AgentChatRunVO>>({
    url: `${CHAT_BASE_API}/runs/${encodeURIComponent(runId)}/cancel`,
    data: {},
  })
}

/** 流式事件回调配置 */
export interface StreamChatCallbacks {
  onStart?: (event: AgentChatEvent) => void
  onReferences?: (event: AgentChatEvent) => void
  onDelta?: (event: AgentChatEvent) => void
  onDone?: (event: AgentChatEvent) => void
  onError?: (event: AgentChatEvent) => void
  onHttpError?: (status: number, message: string, raw?: any) => void
}

/**
 * 5. 发起流式对话请求（POST + SSE + ReadableStream 增量解析）
 * POST /agent/chat/sessions/{sessionId}/stream
 */
export const streamAgentChat = async (
  sessionId: string,
  body: AgentChatStreamRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> => {
  const url = `${CHAT_BASE_API}/sessions/${encodeURIComponent(sessionId)}/stream`
  const headers = getAiChatHeaders({
    Accept: 'text/event-stream',
  })

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (error: any) {
    if (signal?.aborted) {
      // 外部主动中止
      return
    }
    callbacks.onHttpError?.(0, error?.message || '网络连接异常，无法发起对话')
    throw error
  }

  // 检查 HTTP 状态与 Content-Type
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || !contentType.includes('text/event-stream')) {
    let errorMsg = `请求失败 (${response.status})`
    let errorBody: any = null
    try {
      errorBody = await response.json()
      if (errorBody && typeof errorBody === 'object') {
        errorMsg = errorBody.message || errorBody.devMessage || errorMsg
      }
    } catch {
      try {
        errorMsg = (await response.text()) || errorMsg
      } catch {
        // 静默
      }
    }
    callbacks.onHttpError?.(response.status, errorMsg, errorBody)
    throw new Error(errorMsg)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const errorMsg = '浏览器不支持读取流式响应流'
    callbacks.onHttpError?.(response.status, errorMsg)
    throw new Error(errorMsg)
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentEventName = 'message'
  let currentEventId = ''
  const seenSequences = new Set<number>()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 按行切分处理 CRLF 和 LF
      let lineEndIndex: number
      while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, lineEndIndex)
        buffer = buffer.slice(lineEndIndex + 1)

        // 去除末尾回车
        if (line.endsWith('\r')) {
          line = line.slice(0, -1)
        }

        // 注释行或心跳行：以 : 开头，安全忽略
        if (line.startsWith(':')) {
          continue
        }

        // 空行：代表一个完整事件分发结束
        if (line === '') {
          currentEventName = 'message'
          currentEventId = ''
          continue
        }

        // 字段解析
        if (line.startsWith('event:')) {
          currentEventName = line.slice(6).trim()
        } else if (line.startsWith('id:')) {
          currentEventId = line.slice(3).trim()
        } else if (line.startsWith('data:')) {
          const rawData = line.slice(5).trim()
          if (!rawData) continue

          try {
            const eventData = JSON.parse(rawData) as AgentChatEvent

            // 当前流内去重校验（优先使用 event.sequence，备选使用 SSE id）
            const seq = typeof eventData.sequence === 'number'
              ? eventData.sequence
              : currentEventId ? Number(currentEventId) : null

            if (seq !== null && !isNaN(seq)) {
              if (seenSequences.has(seq)) {
                continue
              }
              seenSequences.add(seq)
            }

            // 根据事件类型分发
            switch (currentEventName) {
              case 'start':
                callbacks.onStart?.(eventData)
                break
              case 'references':
                callbacks.onReferences?.(eventData)
                break
              case 'delta':
                callbacks.onDelta?.(eventData)
                break
              case 'done':
                callbacks.onDone?.(eventData)
                break
              case 'error':
                callbacks.onError?.(eventData)
                break
              default:
                // 未知事件类型安全忽略
                break
            }
          } catch (parseError) {
            console.warn('[SSE] JSON parse error for event data:', rawData, parseError)
          }
        }
      }
    }
  } catch (readError: any) {
    if (signal?.aborted) {
      return
    }
    throw readError
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // 忽略
    }
  }
}
