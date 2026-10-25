import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type { KnowledgeFolderQuery } from '@/apis/ai/folder/type'
import type {
  KnowledgeDocumentFolder, KnowledgeDocumentQuery, KnowledgeDocumentRecord,
  KnowledgeDocumentDetail, KnowledgeDocumentSaveDTO, KnowledgeDocumentStatusDTO,
  KnowledgeUploadPolicy, KnowledgeUploadInitDTO,
  KnowledgeChunkState, KnowledgeChunkItem, KnowledgeChunkQuery,
  KnowledgeChunkGenerateDTO, KnowledgeChunkSaveDTO,
  KnowledgeChunkMergeDTO, KnowledgeChunkConfirmDTO, KnowledgeChunkSplitDTO,
} from './type'

const DOCUMENT_API = '/ai/api/v1/knowledge-documents'
// 文件合并允许长请求；请求层必须保留显式指定的超时。
const LONG_TIMEOUT = 300_000
const documentUrl = (id: string) => `${DOCUMENT_API}/${encodeURIComponent(id)}`
const uploadUrl = (id: string) => `${DOCUMENT_API}/uploads/${encodeURIComponent(id)}`

export const getKnowledgeDocumentFolders = (params?: KnowledgeFolderQuery) =>
  request.get<ResultModel<KnowledgeDocumentFolder[]>>({ url: `${DOCUMENT_API}/folders`, params })
export const getKnowledgeDocumentPage = (params: KnowledgeDocumentQuery) =>
  request.get<ResultModel<PageResult<KnowledgeDocumentRecord>>>({ url: DOCUMENT_API, params })
export const getKnowledgeDocument = (id: string) =>
  request.get<ResultModel<KnowledgeDocumentDetail>>({ url: documentUrl(id) })
export const updateKnowledgeDocument = (id: string, data: KnowledgeDocumentSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: documentUrl(id), data })
export const updateKnowledgeDocumentStatus = (id: string, data: KnowledgeDocumentStatusDTO) =>
  request.put<ResultModel<boolean>>({ url: `${documentUrl(id)}/status`, data })
export const getKnowledgeDownloadUrl = (id: string) =>
  request.post<ResultModel<string>>({ url: `${documentUrl(id)}/download-url` })
export const deleteKnowledgeDocument = (id: string) =>
  request.delete<ResultModel<boolean>>({ url: documentUrl(id) })
export const getKnowledgeUploadPolicy = () =>
  request.get<ResultModel<KnowledgeUploadPolicy>>({ url: `${DOCUMENT_API}/uploads/policy` })
export const createKnowledgeUpload = (data: KnowledgeUploadInitDTO) =>
  request.post<ResultModel<KnowledgeDocumentDetail>>({ url: `${DOCUMENT_API}/uploads`, data })
export const getKnowledgePartUrl = (id: string, number: number) =>
  request.post<ResultModel<string>>({ url: `${uploadUrl(id)}/parts/${number}/url` })
export const confirmKnowledgePart = (id: string, number: number, etag: string) =>
  request.put<ResultModel<KnowledgeDocumentDetail>>({ url: `${uploadUrl(id)}/parts/${number}`, data: { etag } })
export const resumeKnowledgeUpload = (id: string, fileSha256: string) =>
  request.post<ResultModel<KnowledgeDocumentDetail>>({ url: `${uploadUrl(id)}/resume`, data: { fileSha256 } })
export const completeKnowledgeUpload = (id: string) =>
  request.post<ResultModel<KnowledgeDocumentDetail>>({ url: `${uploadUrl(id)}/complete`, timeout: LONG_TIMEOUT })
export const cancelKnowledgeUpload = (id: string) =>
  request.post<ResultModel<boolean>>({ url: `${uploadUrl(id)}/cancel` })

export const getChunkState = (id: string) =>
  request.get<ResultModel<KnowledgeChunkState>>({ url: `${documentUrl(id)}/chunks/state` })

export const generateChunks = (id: string, data: KnowledgeChunkGenerateDTO, timeoutMs?: number) =>
  request.post<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks/generate`,
    data,
    timeout: timeoutMs,
  })

export const getChunkPage = (id: string, params: KnowledgeChunkQuery) =>
  request.get<ResultModel<PageResult<KnowledgeChunkItem>>>({
    url: `${documentUrl(id)}/chunks`,
    params,
  })

export const getChunkDetail = (id: string, chunkId: string) =>
  request.get<ResultModel<KnowledgeChunkItem>>({
    url: `${documentUrl(id)}/chunks/${encodeURIComponent(chunkId)}`,
  })

export const updateChunks = (id: string, data: KnowledgeChunkSaveDTO) =>
  request.put<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks`,
    data,
  })

export const mergeChunks = (id: string, data: KnowledgeChunkMergeDTO) =>
  request.post<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks/merge`,
    data,
  })

export const confirmChunks = (id: string, data: KnowledgeChunkConfirmDTO) =>
  request.post<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks/confirm`,
    data,
    timeout: 120000, // 向量/混合模式下同步生成向量耗时较长，配置 120s 超时
  })

export const deleteChunk = (id: string, chunkId: string, version: string | number) =>
  request.delete<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks/${encodeURIComponent(chunkId)}`,
    params: { version },
  })

export const splitChunk = (id: string, chunkId: string, data: KnowledgeChunkSplitDTO) =>
  request.post<ResultModel<KnowledgeChunkState>>({
    url: `${documentUrl(id)}/chunks/${encodeURIComponent(chunkId)}/split`,
    data,
  })


