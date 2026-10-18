import request from '@/utils/Request'
import type { ResultModel } from '@/apis/types'
import type {
  KnowledgeFolderQuery,
  KnowledgeFolderRecord,
  KnowledgeFolderSaveDTO,
} from './type'

const FOLDER_API = '/ai/api/v1/knowledge-folders'

/* =========================== 独立分类目录 API =========================== */

/** 按部门或权限范围返回平铺目录数组（orgId 可选） */
export const getKnowledgeFolderList = async (params?: KnowledgeFolderQuery) => {
  return await request.get<ResultModel<KnowledgeFolderRecord[]>>({
    url: FOLDER_API,
    params,
  })
}

/** 新建分类目录（data 为新目录 ID） */
export const createKnowledgeFolder = async (data: KnowledgeFolderSaveDTO) => {
  return await request.post<ResultModel<string>>({
    url: FOLDER_API,
    data,
  })
}

/** 编辑分类目录（更新名称、描述、排序、父目录，data 为 true） */
export const updateKnowledgeFolder = async (id: string, data: KnowledgeFolderSaveDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `${FOLDER_API}/${encodeURIComponent(id)}`,
    data,
  })
}

/** 删除空分类目录（data 为 true） */
export const deleteKnowledgeFolder = async (id: string) => {
  return await request.delete<ResultModel<boolean>>({
    url: `${FOLDER_API}/${encodeURIComponent(id)}`,
  })
}
