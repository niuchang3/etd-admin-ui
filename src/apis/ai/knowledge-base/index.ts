import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type {
  KnowledgeBaseCreateDTO,
  KnowledgeBaseDetail,
  KnowledgeBaseQuery,
  KnowledgeBaseRecord,
  KnowledgeBaseUpdateDTO,
  RecallTestHit,
  RecallTestRequest,
} from './type'

const KB_API = '/ai/api/v1/knowledge-bases'
const kbUrl = (id: string) => `${KB_API}/${encodeURIComponent(id)}`

/**
 * 分页查询知识库列表
 * GET /v1/knowledge-bases?current=1&size=12&keyword=
 */
export const getKnowledgeBasePage = async (params: KnowledgeBaseQuery) => {
  return await request.get<ResultModel<PageResult<KnowledgeBaseRecord>>>({
    url: KB_API,
    params,
  })
}

/**
 * 获取知识库详情
 * GET /v1/knowledge-bases/{id}
 */
export const getKnowledgeBaseDetail = async (id: string) => {
  return await request.get<ResultModel<KnowledgeBaseDetail>>({
    url: kbUrl(id),
  })
}

/**
 * 新增知识库
 * POST /v1/knowledge-bases
 */
export const createKnowledgeBase = async (data: KnowledgeBaseCreateDTO) => {
  return await request.post<ResultModel<string>>({
    url: KB_API,
    data,
  })
}

/**
 * 修改知识库设置（提交最新 version）
 * PUT /v1/knowledge-bases/{id}
 */
export const updateKnowledgeBase = async (id: string, data: KnowledgeBaseUpdateDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: kbUrl(id),
    data,
  })
}

/**
 * 删除知识库
 * DELETE /v1/knowledge-bases/{id}
 */
export const deleteKnowledgeBase = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: kbUrl(id),
  })
}

/**
 * 召回测试
 * POST /v1/knowledge-bases/{id}/recall-test
 */
export const testRecall = async (id: string, data: RecallTestRequest) => {
  return await request.post<ResultModel<RecallTestHit[]>>({
    url: `${kbUrl(id)}/recall-test`,
    data,
    timeout: 60000, // 包含向量生成和重排，耗时较长，预留 60s
  })
}
