import type { PageRequest } from '@/apis/types'
import type { KnowledgeFolderRecord } from '@/apis/ai/folder/type'

export type KnowledgeDocumentFolder = KnowledgeFolderRecord
export type UploadStatus = 'initializing' | 'uploading' | 'completing' | 'completed' | 'failed' | 'cancelled'
export type ProcessingStatus = 'uploaded' | 'pending' | 'parsing' | 'preview' | 'embedding' | 'ready' | 'failed'
export type RetrievalMode = 'keyword' | 'vector' | 'hybrid'
export interface KnowledgeDocumentQuery extends PageRequest {
  folderId?: string
  folderIds?: string[]
  keyword?: string
  uploadStatus?: UploadStatus
  processingStatus?: ProcessingStatus
}
export interface KnowledgeDocumentRecord {
  id: string
  orgId: string
  folderId: string
  version: string | number
  documentName: string
  originalFilename: string
  contentType: string
  fileSize: number | string
  uploadStatus: UploadStatus
  processingStatus: ProcessingStatus
  uploadErrorMessage?: string | null
  errorMessage?: string | null
  uploadExpiresAt?: string | null
  createTime?: string | null
  updateTime?: string | null
  builtIn?: boolean
}
export interface KnowledgeDocumentSaveDTO {
  version: string | number
  folderId: string
  documentName: string
  description: string | null
  isPublic: boolean
  retrievalMode: RetrievalMode
  embeddingModelConnectionId: string | null
  embedding: number | null
  chunkMaxTokens: number
  chunkOverlapTokens: number
  keywordTopK: number
  vectorTopK: number
  retrievalTopK: number
  similarityThreshold: number | null
}
export interface UploadPart {
  partNumber: number
  etag: string
  size: number | string
}
export interface KnowledgeDocumentDetail extends KnowledgeDocumentRecord, KnowledgeDocumentSaveDTO {
  fileSha256: string
  partSizeBytes: number | string
  partCount: number
  uploadParts: UploadPart[]
  processingVersion: string | number
  uploadedTime?: string | null
  processedTime?: string | null
}
export interface KnowledgeModelOption {
  id: string
  modelId: string
  modelName: string
  providerCode: string
  embedding: number[]
}
export interface KnowledgeChunk {
  id: string
  documentId: string
  processingVersion: string | number
  chunkIndex: number
  title: string | null
  content: string
  tokenCount: number
  embeddingStatus: string
}
export interface KnowledgeUploadPolicy {
  maxFileBytes: number | string
  partSizeBytes: number | string
  sessionSeconds: number
  urlSeconds: number
}
export interface KnowledgeUploadInitDTO {
  folderId: string
  orgId: string
  originalFilename: string
  contentType: string
  fileSize: number
  fileSha256: string
}
