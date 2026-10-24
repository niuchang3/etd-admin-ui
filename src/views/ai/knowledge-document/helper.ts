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
export function parseKnowledgeUploadConfig(raw: string | undefined | null): {
  valid: boolean
  allowedExtensions: string[]
  accept: string
  error?: string
} {
  if (!raw || !raw.trim()) {
    return {
      valid: false,
      allowedExtensions: [],
      accept: '',
      error: '文件上传格式系统参数缺失',
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
      error: '文件上传格式系统参数 JSON 无效',
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

  return {
    valid: true,
    allowedExtensions: extensions,
    accept: extensions.join(','),
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

