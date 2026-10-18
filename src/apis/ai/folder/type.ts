import type { Id } from '@/apis/types'

/* =========================== 独立分类目录 (KnowledgeFolder) =========================== */

/** 目录节点记录数据（后端返回平铺数组） */
export interface KnowledgeFolderRecord {
  id: Id
  version?: string | number | null
  createTime?: string | null
  updateTime?: string | null
  orgId: string
  parentId: string | null
  folderName: string
  description?: string | null
  sortOrder: number
  dataStatus?: number
  writable: boolean
  navigationOnly: boolean
  /** 前端树形渲染辅助属性 */
  children?: KnowledgeFolderRecord[]
}

/** 目录查询参数（orgId 可选，不传查询权限范围内全部目录） */
export interface KnowledgeFolderQuery {
  orgId?: string
  dataStatus?: number
}

/** 目录保存 DTO（orgId 必填） */
export interface KnowledgeFolderSaveDTO {
  orgId: string
  parentId: string | null
  folderName: string
  description?: string | null
  sortOrder: number
  version?: string | number
}

