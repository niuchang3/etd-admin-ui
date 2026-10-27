import type { PageRequest } from '@/apis/types'

/**
 * Agent 概要信息（列表与基本详情）
 */
export interface AgentSummary {
  /** Agent 业务唯一 ID（Long 序列化为字符串） */
  id: string
  /** 所属组织 ID（Long 序列化为字符串） */
  orgId: string
  /** Agent 名称（最长 100） */
  name: string
  /** Agent 简介描述（最长 1000） */
  description: string | null
  /** 头像路径/URL（最长 1000） */
  avatarPath: string | null
  /** 是否租户公开 */
  isPublic: boolean
  /** 数据启停状态：0 停用，1 启用 */
  dataStatus: 0 | 1
  /** 乐观锁版本号（始终以字符串处理） */
  version: string
  /** 是否已发布配置 */
  published: boolean
  /** 草稿配置相对于发布配置是否有未发布的变更 */
  unpublishedChanges: boolean
  /** 当前用户是否对该记录拥有数据维护资格 */
  writable: boolean
  /** 最近一次发布时间（格式 yyyy-MM-dd HH:mm:ss） */
  publishedTime: string | null
  /** 创建时间（格式 yyyy-MM-dd HH:mm:ss） */
  createTime: string
  /** 更新时间（格式 yyyy-MM-dd HH:mm:ss） */
  updateTime: string
}

/**
 * 模型生成与推理参数
 */
export interface AgentModelOptions {
  /** 温度：0 ~ 2（可空，0 为合法数值，不可被默认值覆盖） */
  temperature?: number | null
  /** 最大生成 Token 数（可空，正整数） */
  maxTokens?: number | null
}

/**
 * Agent 运行时与提示词配置（草稿与发布配置共享此结构）
 */
export interface AgentConfiguration {
  /** 聊天模型连接 ID（发布必填，来自模型选择接口） */
  modelConnectionId?: string | null
  /** 系统角色指令/提示词（最长 32000，发布时非空白） */
  systemPrompt?: string | null
  /** 模型生成参数 */
  modelOptions?: AgentModelOptions | null
  /** 绑定的知识库 ID 列表（最多 100 个，不能重复） */
  knowledgeBaseIds?: string[] | null
  /** 携带历史消息数（0 ~ 100，0 表示不携带历史） */
  historyMessageLimit?: number | null
  /** 对话开场白（最长 2000） */
  openingMessage?: string | null
  /** 引导问题列表（最多 10 条，每条非空白且最长 500） */
  suggestedQuestions?: string[] | null
  /** 是否开启引用来源展示（显式 false 必须保留） */
  citationEnabled?: boolean | null
}

/**
 * Agent 编辑配置详情（草稿与发布配置对比）
 */
export interface AgentConfigurationDetail {
  /** Agent ID */
  id: string
  /** 乐观锁版本号 */
  version: string
  /** 当前草稿配置 */
  draftConfig: AgentConfiguration
  /** 当前生效的发布配置（若从未发布过则为 null） */
  publishedConfig: AgentConfiguration | null
  /** 发布时间 */
  publishedTime: string | null
  /** 发布人账号/ID */
  publishedBy: string | null
}

/**
 * 创建 Agent 请求入参 DTO
 */
export interface AgentCreateDTO {
  /** 所属组织 ID（用户选择，不可硬编码） */
  orgId: string
  /** Agent 名称（最长 100） */
  name: string
  /** 简介描述（可空，最长 1000） */
  description?: string | null
  /** 头像路径/URL（可空，最长 1000） */
  avatarPath?: string | null
  /** 是否租户公开 */
  isPublic: boolean
  /** 初始草稿配置（允许为空对象，允许不选模型不填提示词） */
  draftConfig?: AgentConfiguration
}

/**
 * 编辑 Agent 完整保存入参 DTO（全量提交，非 PATCH）
 */
export interface AgentUpdateDTO {
  /** 所属组织 ID（创建后不可修改，提交原值） */
  orgId: string
  /** Agent 名称（最长 100） */
  name: string
  /** 简介描述（清空时提交 null） */
  description: string | null
  /** 头像路径/URL（清空时提交 null） */
  avatarPath: string | null
  /** 是否租户公开 */
  isPublic: boolean
  /** 提交时的基准乐观锁版本号 */
  version: string
  /** 完整的草稿配置 */
  draftConfig: AgentConfiguration
}

/**
 * 发布配置请求入参 DTO
 */
export interface AgentPublishDTO {
  /** 当前版本号 */
  version: string
}

/**
 * 启停状态请求入参 DTO
 */
export interface AgentStatusDTO {
  /** 数据状态：0 停用，1 启用 */
  dataStatus: 0 | 1
  /** 当前版本号 */
  version: string
}

/**
 * 写操作返回结果（创建、修改、发布、启停成功均返回）
 */
export interface AgentMutationResult {
  /** Agent ID */
  id: string
  /** 更新后的最新版本号 */
  version: string
}

/**
 * Agent 分页列表查询参数
 */
export interface AgentQuery extends PageRequest {
  /** Agent 名称模糊搜索（最长 100） */
  keyword?: string
  /** 数据状态：0 停用，1 启用 */
  dataStatus?: 0 | 1
  /** 发布状态：true 已发布，false 未发布；全部时不传 */
  published?: boolean
}

/**
 * 模型选择项（来自 GET /v1/agents/options/models）
 */
export interface AgentModelOption {
  /** 模型连接 ID（写入 AgentConfiguration.modelConnectionId） */
  id: string
  /** 模型 ID */
  modelId: string
  /** 模型显示名称 */
  modelName: string
  /** 服务商编码 */
  providerCode: string
  /** 图标路径 */
  logoPath: string | null
}

/**
 * 知识库选择项（来自 GET /v1/agents/options/knowledge-bases）
 */
export interface AgentKnowledgeBaseOption {
  /** 知识库唯一 ID */
  id: string
  /** 知识库名称 */
  name: string
  /** 知识库简介 */
  description: string | null
  /** 所属组织 ID */
  orgId: string
  /** 是否公开 */
  isPublic: boolean
}

/**
 * 下拉选择项通用分页查询参数
 */
export interface AgentOptionsQuery extends PageRequest {
  /** 搜索关键词 */
  keyword?: string
}
