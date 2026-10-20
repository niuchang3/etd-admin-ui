import request from '@/utils/Request'
import type { PageResult, ResultModel } from '@/apis/types'
import type { KnowledgeFolderQuery } from '@/apis/ai/folder/type'
import type {
  KnowledgeDocumentFolder, KnowledgeDocumentQuery, KnowledgeDocumentRecord,
  KnowledgeDocumentDetail, KnowledgeDocumentSaveDTO, KnowledgeModelOption,
  KnowledgeChunk, KnowledgeUploadPolicy, KnowledgeUploadInitDTO,
} from './type'

const DOCUMENT_API = '/ai/api/v1/knowledge-documents'
// 合并、解析、模型索引分别允许长请求；请求层必须保留显式指定的超时。
const LONG_TIMEOUT = 300_000
const documentUrl = (id: string) => `${DOCUMENT_API}/${encodeURIComponent(id)}`
const uploadUrl = (id: string) => `${DOCUMENT_API}/uploads/${encodeURIComponent(id)}`
export const getKnowledgeDocumentFolders = (params?: KnowledgeFolderQuery) =>
  request.get<ResultModel<KnowledgeDocumentFolder[]>>({ url: `${DOCUMENT_API}/folders`, params })
export const getKnowledgeDocumentPage = (params: KnowledgeDocumentQuery) =>
  request.get<ResultModel<PageResult<KnowledgeDocumentRecord>>>({ url: DOCUMENT_API, params })
export const getKnowledgeDocument = (id: string) =>
  request.get<ResultModel<KnowledgeDocumentDetail>>({ url: documentUrl(id) })
export const getKnowledgeModelOptions = () =>
  request.get<ResultModel<KnowledgeModelOption[]>>({ url: `${DOCUMENT_API}/model-options` })
export const updateKnowledgeDocument = (id: string, data: KnowledgeDocumentSaveDTO) =>
  request.put<ResultModel<boolean>>({ url: documentUrl(id), data })
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
export const parseKnowledgeDocument = (id: string) =>
  request.post<ResultModel<KnowledgeDocumentDetail>>({ url: `${documentUrl(id)}/parse`, timeout: LONG_TIMEOUT })
export const getKnowledgeChunks = (id: string, params: { current: number; size: number }) =>
  request.get<ResultModel<PageResult<KnowledgeChunk>>>({ url: `${documentUrl(id)}/chunks`, params })
export const confirmKnowledgeDocument = (id: string) =>
  request.post<ResultModel<KnowledgeDocumentDetail>>({ url: `${documentUrl(id)}/confirm`, timeout: LONG_TIMEOUT })
