import type {
  KnowledgeChunkParameters,
  KnowledgeChunkBasicParameters,
  KnowledgeChunkNormalParameters,
  KnowledgeChunkAdvancedParameters,
  PdfHeadingHierarchyOptions,
} from '@/apis/ai/document/type'

/**
 * PDF 与图片扩展名集合
 */
const PDF_AND_IMAGE_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'tif',
  'tiff',
])

/**
 * 判断文件是否为适用的 PDF 或图片格式
 */
export function isPdfOrImageDocument(fileType?: string | null): boolean {
  if (!fileType) return false
  const cleanType = String(fileType).trim().toLowerCase().replace(/^\./, '')
  return PDF_AND_IMAGE_EXTENSIONS.has(cleanType)
}

/**
 * 将秒数转换为 ISO 8601 Duration 字符串（例如 90 -> "PT90S"）
 */
export function formatSecondsToIsoDuration(seconds: number): string {
  const num = typeof seconds === 'number' && !Number.isNaN(seconds) ? seconds : 90
  const safeSeconds = Math.max(1, Math.round(num))
  return `PT${safeSeconds}S`
}

/**
 * 解析 ISO 8601 Duration 字符串为秒数（例如 "PT90S" -> 90, "PT1M30S" -> 90, "PT2M" -> 120）
 */
export function parseIsoDurationToSeconds(duration?: string | null): number {
  if (!duration || typeof duration !== 'string') return 90
  const trimmed = duration.trim()
  if (!trimmed) return 90

  // 纯数字字符串兜底
  if (/^\d+$/.test(trimmed)) {
    return Math.max(1, Number(trimmed))
  }

  // ISO 8601 Duration 解析: P[n]D T [n]H [n]M [n]S
  const regex = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  const match = trimmed.match(regex)
  if (!match) return 90

  const days = parseFloat(match[1] || '0')
  const hours = parseFloat(match[2] || '0')
  const minutes = parseFloat(match[3] || '0')
  const seconds = parseFloat(match[4] || '0')

  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds
  return Math.max(1, Math.round(total)) || 90
}

/**
 * 从分片正文中截取单行平滑摘要
 */
export function getChunkSummary(content?: string | null, maxLength = 80): string {
  if (!content) return ''
  const flattened = content.replace(/\s+/g, ' ').trim()
  if (flattened.length <= maxLength) return flattened
  return `${flattened.slice(0, maxLength)}...`
}

/**
 * 相邻分片校验
 * 必须只能合并连续相邻分片，数量 2 至 200
 */
export function checkAdjacentChunks(
  allOrderedIds: string[],
  selectedIds: string[]
): { valid: boolean; error?: string; orderedSelectedIds: string[] } {
  if (!selectedIds || selectedIds.length < 2) {
    return { valid: false, error: '请至少选择 2 个连续分片进行合并', orderedSelectedIds: [] }
  }
  if (selectedIds.length > 200) {
    return { valid: false, error: '单次最多允许合并 200 个相邻分片', orderedSelectedIds: [] }
  }

  const selectedSet = new Set(selectedIds)
  // 获取选中项在全量有序列表中的索引
  const indices: number[] = []
  allOrderedIds.forEach((id, idx) => {
    if (selectedSet.has(id)) {
      indices.push(idx)
    }
  })

  if (indices.length !== selectedIds.length) {
    return { valid: false, error: '所选分片不存在于当前列表中', orderedSelectedIds: [] }
  }

  // 严格检查索引是否完全连续
  const startIdx = indices[0]
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== startIdx + i) {
      return { valid: false, error: '只能合并连续相邻分片', orderedSelectedIds: [] }
    }
  }

  // 按照列表中先后顺序排列的 ID 列表
  const orderedSelectedIds = indices.map((idx) => allOrderedIds[idx])
  return { valid: true, orderedSelectedIds }
}

/**
 * 分片表单数据状态模型
 */
export interface ChunkFormState {
  // 基础参数
  strategy: 'hierarchical' | 'hybrid' | 'regex'
  firstPage?: number | null
  lastPage?: number | null
  maxTokens?: number | null
  mergePeers?: boolean
  pattern?: string
  ocr?: boolean
  tableStructure?: boolean
  useMarkdownTables?: boolean
  overlapTokens: number

  // 普通参数
  boundaryPlacement?: 'next' | 'previous' | 'discard'
  mergeSmallChunks?: boolean
  minTokens?: number | null
  ocrPreset?: string
  ocrLanguages?: string[]
  forceOcr?: boolean
  tableMode?: 'fast' | 'accurate'
  doPdfHeadingHierarchy?: boolean
  useMarkdownImages?: boolean
  imagePlaceholder?: string

  // 高级参数
  tokenizer?: string
  tableCellMatching?: boolean
  pdfHeadingHierarchyOptions?: PdfHeadingHierarchyOptions
  doPictureClassification?: boolean
  includeImages?: boolean
  includePageImages?: boolean
  imageExportMode?: 'placeholder' | 'embedded' | 'referenced'
  imagesScale?: number | null
  mdPageBreakPlaceholder?: string
  mdCompactTables?: boolean
  abortOnError?: boolean
  documentTimeoutSeconds: number
}

/**
 * 初始化表单默认值或从历史 chunkParameters 还原
 */
export function initializeChunkForm(
  existing?: KnowledgeChunkParameters | null,
  fileType?: string | null
): ChunkFormState {
  const isPdfOrImg = isPdfOrImageDocument(fileType)

  if (existing) {
    const basic = existing.basic || {}
    const normal = existing.normal || {}
    const advanced = existing.advanced || {}

    return {
      strategy: basic.strategy || 'hybrid',
      firstPage: basic.firstPage ?? null,
      lastPage: basic.lastPage ?? null,
      maxTokens: basic.maxTokens ?? 512,
      mergePeers: basic.mergePeers ?? true,
      pattern: basic.pattern || '',
      ocr: isPdfOrImg ? Boolean(basic.ocr) : false,
      tableStructure: basic.tableStructure !== false,
      useMarkdownTables: basic.useMarkdownTables !== false,
      overlapTokens: Math.max(0, Number(basic.overlapTokens ?? 0)),

      boundaryPlacement: normal.boundaryPlacement || 'next',
      mergeSmallChunks: Boolean(normal.mergeSmallChunks),
      minTokens: normal.minTokens ?? 50,
      ocrPreset: normal.ocrPreset || '',
      ocrLanguages: Array.isArray(normal.ocrLanguages) ? [...normal.ocrLanguages] : [],
      forceOcr: Boolean(normal.forceOcr),
      tableMode: normal.tableMode || 'fast',
      doPdfHeadingHierarchy: Boolean(normal.doPdfHeadingHierarchy),
      useMarkdownImages: Boolean(normal.useMarkdownImages),
      imagePlaceholder: normal.imagePlaceholder ?? '',

      tokenizer: advanced.tokenizer || '',
      tableCellMatching: Boolean(advanced.tableCellMatching),
      pdfHeadingHierarchyOptions: advanced.pdfHeadingHierarchyOptions
        ? { ...advanced.pdfHeadingHierarchyOptions }
        : undefined,
      doPictureClassification: Boolean(advanced.doPictureClassification),
      includeImages: Boolean(advanced.includeImages),
      includePageImages: Boolean(advanced.includePageImages),
      imageExportMode: advanced.imageExportMode || 'placeholder',
      imagesScale: advanced.imagesScale ?? 1,
      mdPageBreakPlaceholder: advanced.mdPageBreakPlaceholder ?? '',
      mdCompactTables: Boolean(advanced.mdCompactTables),
      abortOnError: Boolean(advanced.abortOnError),
      documentTimeoutSeconds: parseIsoDurationToSeconds(advanced.documentTimeout),
    }
  }

  // 默认首次生成表单参数
  return {
    strategy: 'hybrid',
    firstPage: null,
    lastPage: null,
    maxTokens: 512,
    mergePeers: true,
    pattern: '',
    ocr: false,
    tableStructure: true,
    useMarkdownTables: true,
    overlapTokens: 0,

    boundaryPlacement: 'next',
    mergeSmallChunks: false,
    minTokens: 50,
    ocrPreset: '',
    ocrLanguages: [],
    forceOcr: false,
    tableMode: 'fast',
    doPdfHeadingHierarchy: false,
    useMarkdownImages: false,
    imagePlaceholder: '',

    tokenizer: '',
    tableCellMatching: false,
    pdfHeadingHierarchyOptions: undefined,
    doPictureClassification: false,
    includeImages: false,
    includePageImages: false,
    imageExportMode: 'placeholder',
    imagesScale: 1,
    mdPageBreakPlaceholder: '',
    mdCompactTables: false,
    abortOnError: false,
    documentTimeoutSeconds: 90,
  }
}

/**
 * 构建并过滤生成接口所需参数对象
 * 严格按照互斥规则剔除不适用、未填写的字段，杜绝传递空字符串或默认无用字段
 */
export function buildChunkParameters(
  form: ChunkFormState,
  fileType?: string | null
): KnowledgeChunkParameters {
  const isPdfOrImg = isPdfOrImageDocument(fileType)
  const strategy = form.strategy || 'hybrid'

  // 1. 构建 basic
  const basic: KnowledgeChunkBasicParameters = {
    strategy,
  }

  // 页码范围仅 PDF/图片适用
  if (isPdfOrImg) {
    if (form.firstPage && form.firstPage >= 1) {
      basic.firstPage = Number(form.firstPage)
    }
    if (form.lastPage && form.lastPage >= 1) {
      basic.lastPage = Number(form.lastPage)
    }
    basic.ocr = Boolean(form.ocr)
  }

  // maxTokens 仅 hybrid 和 regex
  if (strategy === 'hybrid' || strategy === 'regex') {
    basic.maxTokens = Number(form.maxTokens) > 0 ? Number(form.maxTokens) : 512
  }

  // mergePeers 仅 hybrid
  if (strategy === 'hybrid') {
    basic.mergePeers = Boolean(form.mergePeers)
  }

  // pattern 仅 regex 必填
  if (strategy === 'regex') {
    basic.pattern = String(form.pattern || '').trim()
  }

  if (form.tableStructure !== undefined) {
    basic.tableStructure = Boolean(form.tableStructure)
  }
  if (form.useMarkdownTables !== undefined) {
    basic.useMarkdownTables = Boolean(form.useMarkdownTables)
  }

  // 最多重叠 Token 数：基础参数，默认值 0，最小值 0；0 表示关闭
  if (form.overlapTokens !== undefined && form.overlapTokens !== null) {
    basic.overlapTokens = Math.max(0, Number(form.overlapTokens))
  }

  // 2. 构建 normal
  const normal: KnowledgeChunkNormalParameters = {}

  // 正则专属
  if (strategy === 'regex') {
    normal.boundaryPlacement = form.boundaryPlacement || 'next'
    if (form.mergeSmallChunks) {
      normal.mergeSmallChunks = true
      if (form.minTokens && Number(form.minTokens) > 0) {
        normal.minTokens = Number(form.minTokens)
      }
    }
  }

  // OCR 专属：仅适用的 PDF/图片且 OCR 开启时才发送
  if (isPdfOrImg && form.ocr) {
    if (form.ocrPreset && form.ocrPreset.trim()) {
      normal.ocrPreset = form.ocrPreset.trim()
    }
    normal.ocrLanguages = Array.isArray(form.ocrLanguages) ? form.ocrLanguages : []
    if (form.forceOcr) {
      normal.forceOcr = true
    }
  }

  // PDF 流水线专属：仅在适用的 PDF/图片文档中显示和提交
  if (isPdfOrImg) {
    if (form.tableMode) {
      normal.tableMode = form.tableMode
    }
    if (form.doPdfHeadingHierarchy) {
      normal.doPdfHeadingHierarchy = true
    }
  }

  // regex 策略不支持 useMarkdownImages=true
  if (strategy !== 'regex' && form.useMarkdownImages) {
    normal.useMarkdownImages = true
  }

  if (typeof form.imagePlaceholder === 'string') {
    normal.imagePlaceholder = form.imagePlaceholder
  }

  // 3. 构建 advanced
  const advanced: KnowledgeChunkAdvancedParameters = {
    documentTimeout: formatSecondsToIsoDuration(form.documentTimeoutSeconds || 90),
  }

  // 分词器互斥规则
  if (strategy === 'hybrid') {
    if (form.tokenizer && form.tokenizer.trim()) {
      advanced.tokenizer = form.tokenizer.trim()
    }
  } else if (strategy === 'regex') {
    if (form.tokenizer === 'cl100k_base') {
      advanced.tokenizer = 'cl100k_base'
    }
  }

  // PDF 流水线专属高级参数
  if (isPdfOrImg) {
    if (form.tableCellMatching) {
      advanced.tableCellMatching = true
    }
    if (form.doPictureClassification) {
      advanced.doPictureClassification = true
    }
    // 只有启用 doPdfHeadingHierarchy 时才提交细项
    if (form.doPdfHeadingHierarchy && form.pdfHeadingHierarchyOptions) {
      const opts: PdfHeadingHierarchyOptions = {}
      const src = form.pdfHeadingHierarchyOptions
      if (src.use_bookmarks !== undefined) opts.use_bookmarks = Boolean(src.use_bookmarks)
      if (src.use_numbering !== undefined) opts.use_numbering = Boolean(src.use_numbering)
      if (src.use_style !== undefined) opts.use_style = Boolean(src.use_style)
      if (src.use_font_style !== undefined) opts.use_font_style = Boolean(src.use_font_style)
      if (typeof src.style_size_tolerance === 'number') opts.style_size_tolerance = src.style_size_tolerance
      if (Array.isArray(src.numbering_schemes) && src.numbering_schemes.length) {
        opts.numbering_schemes = src.numbering_schemes
      }
      if (typeof src.max_level === 'number') opts.max_level = src.max_level
      if (typeof src.bookmark_match_threshold === 'number') {
        opts.bookmark_match_threshold = src.bookmark_match_threshold
      }
      advanced.pdfHeadingHierarchyOptions = opts
    }
  }

  if (form.includeImages) advanced.includeImages = true
  if (form.includePageImages) advanced.includePageImages = true
  if (form.imageExportMode) advanced.imageExportMode = form.imageExportMode
  if (form.imagesScale && Number(form.imagesScale) > 0) advanced.imagesScale = Number(form.imagesScale)
  if (typeof form.mdPageBreakPlaceholder === 'string') {
    advanced.mdPageBreakPlaceholder = form.mdPageBreakPlaceholder
  }
  if (form.mdCompactTables) advanced.mdCompactTables = true
  if (form.abortOnError) advanced.abortOnError = true

  return {
    basic,
    normal,
    advanced,
  }
}

/**
 * 分片参数校验规则：
 * 1. 设置 maxTokens 时，overlapTokens 必须小于 maxTokens。
 * 2. 混合策略开启重叠时，必须填写 maxTokens。
 * 3. 正则短片段阈值 minTokens 不能超过 maxTokens - overlapTokens。
 */
export function validateChunkParameters(form: ChunkFormState): string | null {
  const strategy = form.strategy || 'hybrid'
  const overlapTokens = Math.max(0, Number(form.overlapTokens ?? 0))

  // 1. 设置 maxTokens 时，overlapTokens 必须小于 maxTokens
  if (form.maxTokens !== undefined && form.maxTokens !== null && Number(form.maxTokens) > 0) {
    const maxTokens = Number(form.maxTokens)
    if (overlapTokens >= maxTokens) {
      return `最多重叠 Token 数 (${overlapTokens}) 必须小于单片 Token 上限 (${maxTokens})`
    }
  }

  // 2. 混合策略开启重叠时，必须填写 maxTokens
  if (strategy === 'hybrid') {
    if (overlapTokens > 0) {
      if (!form.maxTokens || Number(form.maxTokens) <= 0) {
        return '混合策略开启重叠时，必须填写单片 Token 上限'
      }
    }
  }

  // 3. 正则短片段阈值 minTokens 不能超过 maxTokens - overlapTokens
  if (strategy === 'regex') {
    if (!form.pattern?.trim()) {
      return '正则表达式策略下，切分正则表达式不能为空'
    }
    if (form.mergeSmallChunks && form.minTokens && Number(form.minTokens) > 0) {
      const minTokens = Number(form.minTokens)
      const maxTokens = Number(form.maxTokens || 512)
      const effectiveLimit = maxTokens - overlapTokens
      if (minTokens > effectiveLimit) {
        return `短片段 Token 阈值 (${minTokens}) 不能超过单片 Token 上限与重叠数之差 (${effectiveLimit})`
      }
    }
  }

  return null
}
