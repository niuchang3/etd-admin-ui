import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  AgentConfigurationDetail,
  AgentCreateDTO,
  AgentKnowledgeBaseOption,
  AgentModelOption,
  AgentMutationResult,
  AgentOptionsQuery,
  AgentPublishDTO,
  AgentQuery,
  AgentStatusDTO,
  AgentSummary,
  AgentUpdateDTO,
} from './type'

const AGENT_API = '/ai/api/v1/agents'
const agentUrl = (id: string) => `${AGENT_API}/${encodeURIComponent(id)}`

/**
 * 分页查询 Agent 列表
 * GET /ai/api/v1/agents
 */
export const getAgentPage = async (params: AgentQuery) => {
  return await request.get<ResultModel<PageResult<AgentSummary>>>({
    url: AGENT_API,
    params,
  })
}

/**
 * 查询 Agent 基本详情（只读接口，不包含系统提示词与内部配置）
 * GET /ai/api/v1/agents/{id}
 */
export const getAgent = async (id: string) => {
  return await request.get<ResultModel<AgentSummary>>({
    url: agentUrl(id),
  })
}

/**
 * 读取 Agent 完整编辑配置（要求菜单写权限和数据维护资格）
 * GET /ai/api/v1/agents/{id}/configuration
 */
export const getAgentConfiguration = async (id: string) => {
  return await request.get<ResultModel<AgentConfigurationDetail>>({
    url: `${agentUrl(id)}/configuration`,
  })
}

/**
 * 创建 Agent（初始状态由后端决定）
 * POST /ai/api/v1/agents
 */
export const createAgent = async (data: AgentCreateDTO) => {
  return await request.post<ResultModel<AgentMutationResult>>({
    url: AGENT_API,
    data,
  })
}

/**
 * 编辑草稿配置及基本信息（全量提交）
 * PUT /ai/api/v1/agents/{id}
 */
export const updateAgent = async (id: string, data: AgentUpdateDTO) => {
  return await request.put<ResultModel<AgentMutationResult>>({
    url: agentUrl(id),
    data,
  })
}

/**
 * 发布 Agent 服务端已保存草稿
 * POST /ai/api/v1/agents/{id}/publish
 */
export const publishAgent = async (id: string, data: AgentPublishDTO) => {
  return await request.post<ResultModel<AgentMutationResult>>({
    url: `${agentUrl(id)}/publish`,
    data,
  })
}

/**
 * 修改 Agent 启停状态
 * PUT /ai/api/v1/agents/{id}/status
 */
export const updateAgentStatus = async (id: string, data: AgentStatusDTO) => {
  return await request.put<ResultModel<AgentMutationResult>>({
    url: `${agentUrl(id)}/status`,
    data,
  })
}

/**
 * 逻辑删除 Agent
 * DELETE /ai/api/v1/agents/{id}?version=xxx
 */
export const deleteAgent = async (id: string, version: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: agentUrl(id),
    params: { version },
  })
}

/**
 * 远程分页查询可用聊天模型连接选项（要求写权限）
 * GET /ai/api/v1/agents/options/models
 */
export const getModelOptions = async (params: AgentOptionsQuery) => {
  return await request.get<ResultModel<PageResult<AgentModelOption>>>({
    url: `${AGENT_API}/options/models`,
    params,
  })
}

/**
 * 远程分页查询可用知识库选项（要求写权限）
 * GET /ai/api/v1/agents/options/knowledge-bases
 */
export const getKnowledgeBaseOptions = async (params: AgentOptionsQuery) => {
  return await request.get<ResultModel<PageResult<AgentKnowledgeBaseOption>>>({
    url: `${AGENT_API}/options/knowledge-bases`,
    params,
  })
}
