import type { KnowledgeDocumentDetail, KnowledgeDocumentFolder, KnowledgeDocumentSaveDTO } from '@/apis/ai/document/type'
import { COMMON_STATUS, KNOWLEDGE_PROCESSING_STATUS as PROCESSING, KNOWLEDGE_UPLOAD_STATUS as UPLOAD } from '@/constant'
import { buildTreeStructure, type TreeNodeItem } from '@/composables/useTreeHelper'

export const canUseFolder = (folder?: KnowledgeDocumentFolder) => Boolean(folder && folder.writable && !folder.navigationOnly && folder.dataStatus !== COMMON_STATUS.DISABLED)
export const processingBusy = (detail: { processingStatus: string }) =>
  detail.processingStatus === PROCESSING.PARSING || detail.processingStatus === PROCESSING.EMBEDDING
export const canResumeUpload = (detail: { uploadStatus: string }) =>
  detail.uploadStatus === UPLOAD.UPLOADING || detail.uploadStatus === UPLOAD.FAILED

/** 先切断异常父链，再复用公共树构建，避免祖先环导致导航整体丢失。 */
export function getFolderTree(folders: KnowledgeDocumentFolder[], select = false): TreeNodeItem[] {
  const nodeMap = new Map(folders.map((folder) => [folder.id, { ...folder }]))
  nodeMap.forEach((folder) => {
    const visited = new Set([folder.id])
    let parentId = folder.parentId
    while (parentId && nodeMap.has(parentId)) {
      if (visited.has(parentId)) { folder.parentId = null; break }
      visited.add(parentId)
      parentId = nodeMap.get(parentId)!.parentId
    }
  })
  return buildTreeStructure(Array.from(nodeMap.values()), {
    titleKey: 'folderName', sortKey: 'sortOrder',
    transform: (folder) => ({
      key: folder.id, value: folder.id, title: folder.folderName,
      parentId: folder.parentId, sort: folder.sortOrder,
      disabled: select ? !canUseFolder(folder) : false,
      selectable: select ? canUseFolder(folder) : true,
    }),
  })
}

/** 移动必须保留详情中的全部配置，不能提交列表摘要或改变 orgId。 */
export function getDocumentSaveDTO(detail: KnowledgeDocumentDetail): KnowledgeDocumentSaveDTO {
  return {
    version: detail.version, folderId: detail.folderId, documentName: detail.documentName,
    description: detail.description, isPublic: detail.isPublic, retrievalMode: detail.retrievalMode,
    embeddingModelConnectionId: detail.embeddingModelConnectionId, embedding: detail.embedding,
    chunkMaxTokens: detail.chunkMaxTokens, chunkOverlapTokens: detail.chunkOverlapTokens,
    keywordTopK: detail.keywordTopK, vectorTopK: detail.vectorTopK,
    retrievalTopK: detail.retrievalTopK, similarityThreshold: detail.similarityThreshold,
  }
}
