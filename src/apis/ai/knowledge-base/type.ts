import type { Id, PageRequest } from '@/apis/types'

/** 知识库检索模式：全文、向量、混合 */
export type RetrievalMode = 'keyword' | 'vector' | 'hybrid'

/** 知识库列表及详情记录 */
export interface KnowledgeBaseRecord {
  id: Id
  version: string | number
  name: string
  description?: string | null
  orgId: string
  dataStatus: number
  isPublic: boolean
  documentCount: number

  // 检索配置
  retrievalMode: RetrievalMode
  keywordRecallSize?: number | null
  vectorRecallSize?: number | null
  topK?: number | null
  similarityThreshold?: number | null

  // 向量与重排模型配置
  embeddingConnectionId?: string | null
  dimensions?: number | null
  rerankEnabled?: boolean
  rerankConnectionId?: string | null
  rerankThreshold?: number | null

  writable?: boolean
  createTime?: string | null
  updateTime?: string | null
}

export type KnowledgeBaseDetail = KnowledgeBaseRecord

/** 知识库分页查询参数 */
export interface KnowledgeBaseQuery extends PageRequest {
  keyword?: string
}

/** 新增知识库 DTO */
export interface KnowledgeBaseCreateDTO {
  name: string
  description?: string | null
  orgId: string
  dataStatus: number
  isPublic: boolean
  retrievalMode: RetrievalMode
  keywordRecallSize?: number | null
  vectorRecallSize?: number | null
  topK?: number | null
  similarityThreshold?: number | null
  embeddingConnectionId?: string | null
  dimensions?: number | null
  rerankEnabled?: boolean
  rerankConnectionId?: string | null
  rerankThreshold?: number | null
}

/** 修改知识库 DTO（orgId 创建后不可修改，提交最新 version） */
export interface KnowledgeBaseUpdateDTO {
  version: string | number
  name: string
  description?: string | null
  dataStatus: number
  isPublic: boolean
  retrievalMode: RetrievalMode
  keywordRecallSize?: number | null
  vectorRecallSize?: number | null
  topK?: number | null
  similarityThreshold?: number | null
  embeddingConnectionId?: string | null
  dimensions?: number | null
  rerankEnabled?: boolean
  rerankConnectionId?: string | null
  rerankThreshold?: number | null
}
