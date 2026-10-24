import type { PageRequest } from '@/apis/types'
import type { KnowledgeFolderRecord } from '@/apis/ai/folder/type'

export type KnowledgeDocumentFolder = KnowledgeFolderRecord
export type UploadStatus = 'initializing' | 'uploading' | 'completing' | 'completed' | 'failed' | 'cancelled'

export interface KnowledgeDocumentQuery extends PageRequest {
  folderId?: string
  folderIds?: string[]
  keyword?: string
  uploadStatus?: UploadStatus
  chunkStatus?: KnowledgeChunkStatus
}

export interface KnowledgeDocumentRecord {
  id: string
  orgId: string
  folderId: string
  version: string | number
  documentName: string
  originalFilename: string
  fileType?: string
  contentType: string
  fileSize: number | string
  uploadStatus: UploadStatus
  uploadErrorMessage?: string | null
  uploadExpiresAt?: string | null
  chunkStatus?: KnowledgeChunkStatus
  chunkCount?: number
  isPublic: boolean
  writable?: boolean
  createTime?: string | null
  updateTime?: string | null
  builtIn?: boolean
}

export type KnowledgeChunkStatus = 'unprocessed' | 'generating' | 'draft' | 'confirmed' | 'failed'

export interface KnowledgeChunkBasicParameters {
  strategy: 'hierarchical' | 'hybrid' | 'regex'
  firstPage?: number
  lastPage?: number
  maxTokens?: number
  mergePeers?: boolean
  pattern?: string
  ocr?: boolean
  tableStructure?: boolean
  useMarkdownTables?: boolean
  overlapTokens?: number
}

export interface KnowledgeChunkNormalParameters {
  boundaryPlacement?: 'next' | 'previous' | 'discard'
  mergeSmallChunks?: boolean
  minTokens?: number
  ocrPreset?: string
  ocrLanguages?: string[]
  forceOcr?: boolean
  tableMode?: 'fast' | 'accurate'
  doPdfHeadingHierarchy?: boolean
  useMarkdownImages?: boolean
  imagePlaceholder?: string
}

export interface PdfHeadingHierarchyOptions {
  use_bookmarks?: boolean
  use_numbering?: boolean
  use_style?: boolean
  use_font_style?: boolean
  style_size_tolerance?: number
  numbering_schemes?: string[]
  max_level?: number
  bookmark_match_threshold?: number
}

export interface KnowledgeChunkAdvancedParameters {
  tokenizer?: string
  tableCellMatching?: boolean
  pdfHeadingHierarchyOptions?: PdfHeadingHierarchyOptions
  doPictureClassification?: boolean
  includeImages?: boolean
  includePageImages?: boolean
  imageExportMode?: 'placeholder' | 'embedded' | 'referenced'
  imagesScale?: number
  mdPageBreakPlaceholder?: string
  mdCompactTables?: boolean
  abortOnError?: boolean
  documentTimeout: string
}

export interface KnowledgeChunkParameters {
  basic: KnowledgeChunkBasicParameters
  normal: KnowledgeChunkNormalParameters
  advanced: KnowledgeChunkAdvancedParameters
}

export interface KnowledgeChunkState {
  id: string
  documentName: string
  originalFilename: string
  fileType?: string
  version: string | number
  chunkStatus: KnowledgeChunkStatus
  chunkCount: number
  chunkParameters?: KnowledgeChunkParameters | null
  chunkErrorMessage?: string | null
  chunkConfirmedTime?: string | null
  chunkGenerationExpiresAt?: string | null
  tokenCountTokenizer?: string | null
  isPublic?: boolean
  writable?: boolean
}

export interface KnowledgeChunkSource {
  headings?: string[]
  pageNumbers?: number[]
  documentItemRefs?: string[]
}

export interface KnowledgeChunkItem {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  tokenCount: number
  source: KnowledgeChunkSource
}

export interface KnowledgeChunkQuery {
  current?: number
  size?: number
}

export interface KnowledgeChunkGenerateDTO {
  version: string | number
  parameters: KnowledgeChunkParameters
}

export interface KnowledgeChunkSaveItem {
  id: string
  content: string
}

export interface KnowledgeChunkSaveDTO {
  version: string | number
  chunks: KnowledgeChunkSaveItem[]
}

export interface KnowledgeChunkMergeDTO {
  version: string | number
  chunkIds: string[]
}

export interface KnowledgeChunkConfirmDTO {
  version: string | number
}

export interface KnowledgeChunkSplitDTO {
  version: string | number
  firstContent: string
  secondContent: string
}

export interface KnowledgeDocumentSaveDTO {
  version: string | number
  folderId: string
  documentName: string
  description: string | null
  isPublic: boolean
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
  uploadedTime?: string | null
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
  isPublic: boolean
}
