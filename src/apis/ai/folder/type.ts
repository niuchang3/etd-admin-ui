import type { Id } from '@/apis/types'

/* =========================== 知识库分类目录 (KnowledgeFolder) =========================== */

/** 目录节点记录数据（后端返回平铺数组） */
export interface KnowledgeFolderRecord {
  id: Id
  knowledgeBaseId: string
  version?: string | number | null
  createTime?: string | null
  updateTime?: string | null
  orgId?: string | null
  parentId: string | null
  folderName: string
  description?: string | null
  sortOrder: number
  dataStatus?: number
  writable: boolean
  navigationOnly?: boolean
  /** 前端树形渲染辅助属性 */
  children?: KnowledgeFolderRecord[]
}

/** 目录查询参数（knowledgeBaseId 必传，兼容老调用可选） */
export interface KnowledgeFolderQuery {
  knowledgeBaseId?: string
  orgId?: string
  dataStatus?: number
}

/** 目录保存 DTO（knowledgeBaseId 必填，根目录 parentId 为 null，orgId 兼容可选） */
export interface KnowledgeFolderSaveDTO {
  knowledgeBaseId?: string
  orgId?: string
  parentId: string | null
  folderName: string
  description?: string | null
  sortOrder: number
  version?: string | number
}
