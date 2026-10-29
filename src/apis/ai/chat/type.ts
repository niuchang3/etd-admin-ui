import type { Id } from '@/apis/types'

/** 会话类型：正式聊天或草稿调试 */
export type ConversationType = 'chat' | 'debug'

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 消息状态 */
export type MessageStatus = 'generating' | 'completed' | 'interrupted' | 'failed'

/** 运行终态与状态 */
export type RunStatus = 'running' | 'cancel_requested' | 'succeeded' | 'failed' | 'cancelled'

/** 知识分片结构来源 */
export interface KnowledgeChunkSource {
  headings?: string[]
  pageNumbers?: number[]
  documentItemRefs?: string[]
}

/** 实际提供给模型的引用来源 */
export interface AgentCitation {
  /** 从 1 开始的引用编号，对应 [1]、[2] */
  number: number
  /** 知识库 ID */
  knowledgeBaseId: Id
  /** 资料 ID */
  documentId: Id
  /** 中心分片 ID */
  chunkId: Id
  /** 资料展示名称 */
  documentName: string
  /** 来源页码、标题及结构位置 */
  source?: KnowledgeChunkSource
}

/** 聊天页面展示配置（不暴露内部系统提示词与模型连接凭证） */
export interface AgentChatProfileVO {
  agentId: Id
  name: string
  description?: string
  avatarPath?: string
  openingMessage?: string
  suggestedQuestions?: string[]
  citationEnabled?: boolean
}

/** 创建会话请求 DTO */
export interface AgentChatSessionDTO {
  agentId: Id
  conversationType: ConversationType
  title: string
}

/** 聊天会话响应 VO */
export interface AgentChatSessionVO {
  id: Id
  agentId: Id
  title: string
  conversationType: ConversationType
  lastMessageTime?: string
  createTime: string
}

/** 聊天消息响应 VO */
export interface AgentChatMessageVO {
  id: Id
  runId?: Id
  sequenceNo: number
  role: MessageRole
  content: string
  messageStatus: MessageStatus
  citations?: AgentCitation[]
  createTime: string
  inputTokens?: number
  outputTokens?: number
  errorCode?: string
  errorMessage?: string
}

/** 运行状态响应 VO */
export interface AgentChatRunVO {
  id: Id
  conversationId: Id
  requestId: string
  runStatus: RunStatus
  startedTime?: string
  finishedTime?: string
  inputTokens?: number
  outputTokens?: number
  errorCode?: string
  errorMessage?: string
}

/** SSE 统一事件数据结构 */
export interface AgentChatEvent {
  sessionId: Id
  runId: Id
  messageId: Id
  sequence: number
  text?: string
  references?: AgentCitation[]
  runStatus?: RunStatus
  inputTokens?: number
  outputTokens?: number
  errorCode?: string
  errorMessage?: string
}

/** 流式请求提交 DTO */
export interface AgentChatStreamRequest {
  requestId: string
  content: string
}

/** 会话列表查询参数 */
export interface AgentChatSessionQuery {
  agentId?: Id
  beforeId?: Id
  size?: number
}

/** 消息历史查询参数 */
export interface AgentChatMessageQuery {
  beforeSequence?: number
  size?: number
}
