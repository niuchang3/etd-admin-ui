import type { KnowledgeDocumentDetail, KnowledgeDocumentFolder, KnowledgeDocumentSaveDTO } from '@/apis/ai/document/type'
import { COMMON_STATUS, KNOWLEDGE_UPLOAD_STATUS as UPLOAD } from '@/constant'
import { buildTreeStructure, type TreeNodeItem } from '@/composables/useTreeHelper'

export const canUseFolder = (folder?: KnowledgeDocumentFolder) => Boolean(folder && folder.writable && !folder.navigationOnly && folder.dataStatus !== COMMON_STATUS.DISABLED)
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

/** 移动与编辑仅保留基础信息与分类目录。 */
export function getDocumentSaveDTO(detail: KnowledgeDocumentDetail): KnowledgeDocumentSaveDTO {
  return {
    version: detail.version,
    folderId: detail.folderId,
    documentName: detail.documentName,
    description: detail.description ?? null,
    isPublic: Boolean(detail.isPublic),
  }
}

/**
 * 递归获取指定根目录/父目录及其所有下级子孙目录的 ID 列表
 * @param rootFolderId 当前选中的根目录或父目录 ID
 * @param folders 所有分类目录平铺列表
 */
export function getFolderAndDescendantIds(rootFolderId: string, folders: KnowledgeDocumentFolder[]): string[] {
  if (!rootFolderId) return []
  const result = new Set<string>([rootFolderId])
  let added = true
  while (added) {
    added = false
    for (const folder of folders) {
      const parentId = folder.parentId ? String(folder.parentId) : null
      const selfId = String(folder.id)
      if (parentId && result.has(parentId) && !result.has(selfId)) {
        result.add(selfId)
        added = true
      }
    }
  }
  return Array.from(result)
}

/**
 * 解析并校验知识库上传系统参数 (ai.knowledge.upload)
 * 参数格式需为 JSON: { allowedExtensions: [".pdf", ".docx", ...] }
 */
export interface KnowledgeUploadConfig {
  valid: boolean
  allowedExtensions: string[]
  accept: string
  maxSizeMb?: number
  maxSizeBytes?: number
  error?: string
}

export function parseKnowledgeUploadConfig(raw: string | undefined | null): KnowledgeUploadConfig {
  if (!raw || !raw.trim()) {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '文件上传系统参数 ai.knowledge.upload 缺失',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '文件上传系统参数 JSON 无效',
    }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('allowedExtensions' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).allowedExtensions)
  ) {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '系统参数未配置有效的文件扩展名列表',
    }
  }

  const rawList = (parsed as Record<string, unknown>).allowedExtensions as unknown[]
  if (rawList.length === 0) {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '系统参数允许的文件扩展名列表为空',
    }
  }

  const extensions: string[] = []
  for (const item of rawList) {
    if (typeof item !== 'string' || !item.trim()) {
      return {
        valid: false,
        allowedExtensions: [],
        accept: '',
        error: '系统参数包含无效的扩展名格式',
      }
    }
    let ext = item.trim().toLowerCase()
    if (!ext.startsWith('.')) {
      ext = `.${ext}`
    }
    if (ext === '.' || ext.includes(',')) {
      return {
        valid: false,
        allowedExtensions: [],
        accept: '',
        error: '系统参数包含无效的扩展名格式',
      }
    }
    if (!extensions.includes(ext)) {
      extensions.push(ext)
    }
  }

  if (extensions.length === 0) {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '系统参数允许的文件扩展名列表为空',
    }
  }

  // 校验 maxSizeMb：单文件大小上限，单位 MiB（1024×1024 字节）
  const record = parsed as Record<string, unknown>
  if (!('maxSizeMb' in record)) {
    return {
      valid: false,
      allowedExtensions: extensions,
      accept: extensions.join(','),
      error: '系统参数未配置单文件大小上限 maxSizeMb',
    }
  }

  const numMaxSize = Number(record.maxSizeMb)
  if (!Number.isFinite(numMaxSize) || numMaxSize <= 0) {
    return {
      valid: false,
      allowedExtensions: extensions,
      accept: extensions.join(','),
      error: '系统参数单文件大小上限 maxSizeMb 必须为正数',
    }
  }

  const maxSizeMb = numMaxSize
  const maxSizeBytes = Math.round(maxSizeMb * 1024 * 1024)

  return {
    valid: true,
    allowedExtensions: extensions,
    accept: extensions.join(','),
    maxSizeMb,
    maxSizeBytes,
  }
}

/**
 * 校验文件是否符合知识库允许的扩展名列表（按最后一个扩展名校验，忽略大小写）
 */
export function isAllowedKnowledgeUploadFile(
  filename: string,
  allowedExtensions: string[]
): boolean {
  if (!filename || !allowedExtensions || allowedExtensions.length === 0) return false
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return false
  const ext = filename.slice(lastDot).toLowerCase()
  return allowedExtensions.includes(ext)
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 逐文件校验扩展名与文件大小上限
 * 实际大小限制取系统参数 maxSizeMb（换算为字节）与上传策略 maxFileBytes 两者较小值
 * 等于上限时允许上传，严格大于上限时拒绝
 */
export function validateKnowledgeUploadFile(
  file: File,
  options: {
    allowedExtensions: string[]
    maxSizeMb?: number
    maxFileBytes?: number
  }
): FileValidationResult {
  if (!file) {
    return { valid: false, error: '未选择任何文件' }
  }

  // 1. 扩展名校验
  if (!isAllowedKnowledgeUploadFile(file.name, options.allowedExtensions)) {
    return {
      valid: false,
      error: `文件“${file.name}”格式不受支持，仅支持：${options.allowedExtensions.join('、')}`,
    }
  }

  // 2. 计算实际生效的上限字节数与展示文案
  let effectiveLimitBytes: number | undefined
  let displayLimitText = ''

  if (typeof options.maxSizeMb === 'number' && options.maxSizeMb > 0) {
    effectiveLimitBytes = options.maxSizeMb * 1024 * 1024
    displayLimitText = `${options.maxSizeMb} MiB`
  }

  if (typeof options.maxFileBytes === 'number' && options.maxFileBytes > 0) {
    if (effectiveLimitBytes === undefined || options.maxFileBytes < effectiveLimitBytes) {
      effectiveLimitBytes = options.maxFileBytes
      const mib = options.maxFileBytes / (1024 * 1024)
      displayLimitText = Number.isInteger(mib) ? `${mib} MiB` : `${mib.toFixed(1)} MiB`
    }
  }

  // 3. 文件大小校验：file.size > limitBytes 时拒绝；等于上限时允许
  if (effectiveLimitBytes !== undefined && file.size > effectiveLimitBytes) {
    return {
      valid: false,
      error: `文件“${file.name}”大小超过上限（单个文件不超过 ${displayLimitText}），已拒绝上传`,
    }
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `文件“${file.name}”为空文件（0 字节），不可上传`,
    }
  }

  if (file.name.length > 255) {
    return {
      valid: false,
      error: `文件名“${file.name}”过长（最多允许 255 个字符）`,
    }
  }

  return { valid: true }
}


