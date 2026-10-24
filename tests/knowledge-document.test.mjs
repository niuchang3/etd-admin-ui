import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const base = 'src/views/ai/knowledge-document/'
// 使用项目已有 TypeScript 编译器和 Node 测试运行器，不增加依赖或应用构建入口。
function loadTs(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replaceAll('import.meta.url', JSON.stringify(import.meta.url))
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => imports[name] ?? require(name), Uint8Array, Uint32Array, DataView, Map, Set, DOMException, AbortController, URL, setTimeout, clearTimeout, ...globals }, { filename: path })
  return exports
}
const { Sha256 } = loadTs(`${base}upload/sha256.ts`)
const constants = loadTs('src/constant/index.ts')
const treeHelper = loadTs('src/composables/useTreeHelper.ts')
const helper = loadTs(`${base}helper.ts`, { '@/constant': constants, '@/composables/useTreeHelper': treeHelper })

test('incremental SHA-256 matches Node crypto across padding, block, read boundaries and Unicode', () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 127, 128, 129, 4097, 4 * 1024 * 1024 + 17]) {
    const bytes = randomBytes(length)
    const expected = createHash('sha256').update(bytes).digest('hex')
    for (const readSize of length > 10000 ? [4 * 1024 * 1024] : [1, 7, 64, 511]) {
      const hash = new Sha256()
      for (let offset = 0; offset < bytes.length; offset += readSize) hash.update(bytes.subarray(offset, offset + readSize))
      assert.equal(hash.digest(), expected, `length=${length}, read=${readSize}`)
    }
  }
  const hash = new Sha256()
  hash.update(new TextEncoder().encode('知识库📚\r\n正文'))
  assert.equal(hash.digest(), createHash('sha256').update('知识库📚\r\n正文').digest('hex'))
})

test('worker hashes the entire file with bounded reads and reports completion', async () => {
  const bytes = randomBytes(4 * 1024 * 1024 + 301)
  const output = []
  const self = { postMessage: (value) => output.push(value) }
  loadTs(`${base}upload/hash.worker.ts`, { './sha256': { Sha256 } }, { self })
  let largestRead = 0
  await self.onmessage({ data: { size: bytes.length, slice: (start, end) => {
    const slice = bytes.subarray(start, Math.min(end, bytes.length))
    largestRead = Math.max(largestRead, slice.length)
    return { arrayBuffer: async () => slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.length) }
  } } })
  assert.ok(largestRead <= 4 * 1024 * 1024)
  assert.equal(output.at(-1).digest, createHash('sha256').update(bytes).digest('hex'))
  assert.equal(output.at(-2).progress, 100)
})

test('folder tree keeps missing ancestors, same names, duplicate IDs and cycles safe without numeric ID conversion', () => {
  const folders = [
    { id: '90071992547409931', parentId: '90071992547409932', folderName: '同名', sortOrder: 0 },
    { id: '90071992547409932', parentId: '90071992547409931', folderName: '同名', sortOrder: 0 },
    { id: '90071992547409933', parentId: 'missing', folderName: '其他', sortOrder: 1 },
    { id: '90071992547409933', parentId: 'missing', folderName: '其他', sortOrder: 1 },
  ]
  const tree = helper.getFolderTree(folders)
  const ids = []
  const walk = (nodes) => nodes.forEach((node) => { ids.push(node.key); if (node.children) walk(node.children) })
  walk(tree)
  assert.equal(new Set(ids).size, 3)
  assert.equal(ids.length, 3)
  assert.equal(helper.canUseFolder({ writable: true, navigationOnly: true, dataStatus: 1 }), false)
  assert.equal(helper.canUseFolder({ writable: true, navigationOnly: false, dataStatus: 0 }), false)
})

test('move DTO preserves basic info and excludes department and upload internals', () => {
  const detail = {
    version: '90071992547409939', folderId: '90071992547409938', documentName: '资料', description: '说明',
    orgId: '90071992547409936', uploadParts: [{ partNumber: 1 }], isPublic: true,
  }
  const dto = helper.getDocumentSaveDTO(detail)
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), {
    version: '90071992547409939', folderId: '90071992547409938', documentName: '资料', description: '说明', isPublic: true,
  })
})

function transferHarness({ failFirst = false, etag = true, onUrl, onConfirm } = {}) {
  let active = 0, maxActive = 0
  const calls = [], confirmations = [], urls = []
  const transfer = loadTs(`${base}upload/transfer.ts`, { '@/apis/ai/document': {
    getKnowledgePartUrl: async (id, number) => { urls.push(number); await onUrl?.(number); return { data: `https://minio.example/${number}` } },
    confirmKnowledgePart: async (id, number, value) => { confirmations.push([number, value]); onConfirm?.(number); return { data: {} } },
  } }, {
    fetch: async (url, options) => {
      const number = Number(url.split('/').at(-1))
      calls.push({ number, options })
      active++; maxActive = Math.max(active, maxActive)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active--
      if (failFirst && number === 2 && calls.filter((call) => call.number === 2).length === 1) return { ok: false, status: 403 }
      return { ok: true, headers: { get: () => etag ? `"etag-${number}"` : null } }
    },
  })
  return { ...transfer, calls, confirmations, urls, maxActive: () => maxActive }
}
const file = new Blob([new Uint8Array(14)])
const detail = { id: '90071992547409932', fileSize: '14', partSizeBytes: '4', partCount: 4, uploadParts: [{ partNumber: 1, etag: 'saved', size: '4' }] }

test('resume skips confirmed parts, caps concurrency, retries expired URL and transfers exact byte sizes without JWT', async () => {
  const harness = transferHarness({ failFirst: true })
  let progress
  await harness.uploadMissingParts(file, detail, new AbortController().signal, () => true, (parts) => { progress = parts })
  assert.equal(harness.maxActive(), 2)
  assert.deepEqual(harness.calls.map((call) => call.number).sort(), [2, 2, 3, 4])
  assert.equal(harness.urls.filter((number) => number === 2).length, 2)
  assert.equal(progress.length, 4)
  for (const call of harness.calls) {
    assert.equal(call.options.method, 'PUT')
    assert.equal(call.options.credentials, 'omit')
    assert.equal(call.options.headers, undefined)
    assert.equal(call.options.body.size, call.number === 4 ? 2 : 4)
  }
  assert.ok(harness.confirmations.every(([number, value]) => value === `"etag-${number}"`))
})

test('missing CORS ETag fails without confirming the part and supports retry on later resume', async () => {
  const harness = transferHarness({ etag: false })
  await assert.rejects(harness.uploadMissingParts(file, detail, new AbortController().signal, () => true, () => {}), /ETag/)
  assert.equal(harness.confirmations.length, 0)
  assert.ok(harness.urls.length <= 6)
})

test('pause after URL acquisition prevents PUT and confirmation; read-only prevents all writes', async () => {
  const controller = new AbortController()
  const harness = transferHarness({ onUrl: () => controller.abort() })
  await assert.rejects(harness.uploadMissingParts(file, detail, controller.signal, () => true, () => {}), { name: 'AbortError' })
  assert.equal(harness.calls.length, 0)
  assert.equal(harness.confirmations.length, 0)
  const readOnly = transferHarness()
  await assert.rejects(readOnly.uploadMissingParts(file, detail, new AbortController().signal, () => false, () => {}), { name: 'AbortError' })
  assert.equal(readOnly.urls.length, 0)
})

test('global request timeout still applies to normal calls and preserves explicit long operations', async () => {
  let beforeRequest
  const instance = Object.assign(async (options) => ({ data: beforeRequest({ timeout: 5000, ...options }) }), {
    defaults: { timeout: 5000 },
    interceptors: { request: { use: (callback) => { beforeRequest = callback } }, response: { use: () => {} } },
  })
  const axios = { defaults: { headers: { post: {} } }, create: () => instance }
  const request = loadTs('src/utils/Request.ts', {
    axios: { default: axios }, qs: { default: { stringify: () => '' } },
    'ant-design-vue': { message: { error: () => {} } },
    '@/stores/modules/oauth': { getAccessToken: () => null },
    '@/stores/modules/user': { tenantsStore: () => ({ userTenant: {} }) },
    '@/stores/modules/config': { useSystemConfigStore: () => ({ network: { request: { timeoutMs: 8000 } } }) },
    '@/router/index': { default: {} }, '@/constant': constants,
    './device': { APP_NAME: 'test', APP_VERSION: 'test', getDeviceId: () => 'test', getDeviceFingerprint: () => 'test' },
  }).default
  assert.equal((await request.get({ url: '/read' })).timeout, 8000)
  assert.equal((await request.post({ url: '/complete', timeout: 300000 })).timeout, 300000)
})

test('file type mapping correctly matches extensions, normalizes input, and gracefully falls back to default', () => {
  const { getFileTypeMeta, DEFAULT_FILE_META } = loadTs(`${base}components/fileType.ts`, {
    '@ant-design/icons-vue': require('@ant-design/icons-vue'),
  })

  // 核心格式测试
  assert.equal(getFileTypeMeta('pdf').label, 'PDF')
  assert.equal(getFileTypeMeta('doc').label, 'Word')
  assert.equal(getFileTypeMeta('docx').label, 'Word')
  assert.equal(getFileTypeMeta('xls').label, 'Excel')
  assert.equal(getFileTypeMeta('xlsx').label, 'Excel')
  assert.equal(getFileTypeMeta('ppt').label, 'PPT')
  assert.equal(getFileTypeMeta('pptx').label, 'PPT')
  assert.equal(getFileTypeMeta('txt').label, 'TXT')
  assert.equal(getFileTypeMeta('md').label, 'Markdown')
  assert.equal(getFileTypeMeta('markdown').label, 'Markdown')
  assert.equal(getFileTypeMeta('csv').label, 'CSV')

  // 图片、压缩包、音视频格式测试
  assert.equal(getFileTypeMeta('png').label, 'PNG')
  assert.equal(getFileTypeMeta('jpg').label, 'JPG')
  assert.equal(getFileTypeMeta('zip').label, 'ZIP')
  assert.equal(getFileTypeMeta('mp3').label, 'MP3')
  assert.equal(getFileTypeMeta('mp4').label, 'MP4')

  // 健壮性测试：大小写、前导点、首尾空格
  assert.equal(getFileTypeMeta(' PDF ').label, 'PDF')
  assert.equal(getFileTypeMeta('.docx').label, 'Word')

  // 未知、空值与未知扩展名优雅降级
  assert.equal(getFileTypeMeta('unknown'), DEFAULT_FILE_META)
  assert.equal(getFileTypeMeta(''), DEFAULT_FILE_META)
  assert.equal(getFileTypeMeta(null), DEFAULT_FILE_META)
  assert.equal(getFileTypeMeta(undefined), DEFAULT_FILE_META)
  assert.equal(getFileTypeMeta('xyz_custom_bin'), DEFAULT_FILE_META)
  assert.ok(DEFAULT_FILE_META.icon)
})

test('chunk helpers: duration conversion, adjacent chunk validation, and parameter sanitization', () => {
  const chunkHelper = loadTs(`${base}chunks/helper.ts`)

  // 1. Duration 转换测试
  assert.equal(chunkHelper.formatSecondsToIsoDuration(90), 'PT90S')
  assert.equal(chunkHelper.formatSecondsToIsoDuration(0), 'PT1S')
  assert.equal(chunkHelper.parseIsoDurationToSeconds('PT90S'), 90)
  assert.equal(chunkHelper.parseIsoDurationToSeconds('PT1M30S'), 90)
  assert.equal(chunkHelper.parseIsoDurationToSeconds('PT2M'), 120)
  assert.equal(chunkHelper.parseIsoDurationToSeconds('PT1H'), 3600)
  assert.equal(chunkHelper.parseIsoDurationToSeconds('P1DT2H'), 93600)
  assert.equal(chunkHelper.parseIsoDurationToSeconds(''), 90)
  assert.equal(chunkHelper.parseIsoDurationToSeconds(null), 90)

  // 2. 格式判断
  assert.equal(chunkHelper.isPdfOrImageDocument('pdf'), true)
  assert.equal(chunkHelper.isPdfOrImageDocument('PNG'), true)
  assert.equal(chunkHelper.isPdfOrImageDocument('docx'), false)
  assert.equal(chunkHelper.isPdfOrImageDocument('txt'), false)

  // 3. 相邻分片合并顺序与连续性
  const orderedIds = ['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4', 'chunk-5']
  // 连续选中的两个分片
  const res1 = chunkHelper.checkAdjacentChunks(orderedIds, ['chunk-2', 'chunk-3'])
  assert.equal(res1.valid, true)
  assert.deepEqual(JSON.parse(JSON.stringify(res1.orderedSelectedIds)), ['chunk-2', 'chunk-3'])

  // 乱序勾选但属于连续分片 -> 应按原文顺序规范化返回
  const res2 = chunkHelper.checkAdjacentChunks(orderedIds, ['chunk-3', 'chunk-2'])
  assert.equal(res2.valid, true)
  assert.deepEqual(JSON.parse(JSON.stringify(res2.orderedSelectedIds)), ['chunk-2', 'chunk-3'])

  // 不连续的两个分片
  const res3 = chunkHelper.checkAdjacentChunks(orderedIds, ['chunk-1', 'chunk-3'])
  assert.equal(res3.valid, false)
  assert.match(res3.error, /连续相邻分片/)

  // 仅选一个分片
  const res4 = chunkHelper.checkAdjacentChunks(orderedIds, ['chunk-1'])
  assert.equal(res4.valid, false)

  // 4. 参数构建与互斥过滤
  // 4.1 hierarchical 策略测试：maxTokens、mergePeers、tokenizer 及正则参数均应省略
  const hierParams = chunkHelper.buildChunkParameters({
    strategy: 'hierarchical',
    maxTokens: 1024,
    mergePeers: true,
    pattern: 'test',
    tokenizer: 'cl100k_base',
    documentTimeoutSeconds: 60,
  }, 'txt')
  assert.deepEqual(JSON.parse(JSON.stringify(hierParams.basic)), { strategy: 'hierarchical' })
  assert.equal(hierParams.normal.boundaryPlacement, undefined)
  assert.equal(hierParams.advanced.tokenizer, undefined)
  assert.equal(hierParams.advanced.documentTimeout, 'PT60S')

  // 4.2 hybrid 策略测试：包含 maxTokens、mergePeers、tokenizer，但无正则参数
  const hybridParams = chunkHelper.buildChunkParameters({
    strategy: 'hybrid',
    maxTokens: 512,
    mergePeers: true,
    pattern: 'some-regex',
    tokenizer: 'cl100k_base',
    ocr: false,
    documentTimeoutSeconds: 90,
  }, 'pdf')
  assert.equal(hybridParams.basic.maxTokens, 512)
  assert.equal(hybridParams.basic.mergePeers, true)
  assert.equal(hybridParams.basic.pattern, undefined)
  assert.equal(hybridParams.basic.ocr, false)
  assert.equal(hybridParams.advanced.tokenizer, 'cl100k_base')
  // OCR 关闭时不发送 ocrPreset、ocrLanguages 等
  assert.equal(hybridParams.normal.ocrPreset, undefined)

  // 4.3 非 PDF/图片文档：不发送起止页码、OCR、PDF流水线等专属参数
  const docxParams = chunkHelper.buildChunkParameters({
    strategy: 'hybrid',
    firstPage: 1,
    lastPage: 10,
    ocr: true,
    tableMode: 'accurate',
    doPdfHeadingHierarchy: true,
    documentTimeoutSeconds: 90,
  }, 'docx')
  assert.equal(docxParams.basic.firstPage, undefined)
  assert.equal(docxParams.basic.lastPage, undefined)
  assert.equal(docxParams.basic.ocr, undefined)
  assert.equal(docxParams.normal.ocrPreset, undefined)
  assert.equal(docxParams.normal.tableMode, undefined)
  assert.equal(docxParams.normal.doPdfHeadingHierarchy, undefined)
})

test('tenant sharing isPublic and writable permission calculation are strictly decoupled', () => {
  const { getDocumentSaveDTO } = helper

  // 1. getDocumentSaveDTO 正确保留 isPublic 原值，并规范化为布尔类型
  const dtoPublic = getDocumentSaveDTO({
    version: 1,
    folderId: 'folder-1',
    documentName: '共享资料.pdf',
    description: '说明',
    isPublic: true,
  })
  assert.equal(dtoPublic.isPublic, true)

  const dtoPrivate = getDocumentSaveDTO({
    version: 2,
    folderId: 'folder-2',
    documentName: '私有资料.pdf',
    isPublic: false,
  })
  assert.equal(dtoPrivate.isPublic, false)

  const dtoUndefined = getDocumentSaveDTO({
    version: 3,
    folderId: 'folder-3',
    documentName: '旧数据无字段.pdf',
  })
  assert.equal(dtoUndefined.isPublic, false)

  // 2. 权限规则：维护按钮同时要求 canWrite && writable !== false
  // 严禁根据 isPublic 推断维护权限
  const checkCanMaintain = (canWrite, doc) => {
    if (!canWrite) return false
    if (doc && doc.writable === false) return false
    return true
  }

  // 场景 A: 资料共享(isPublic=true)，但当前用户仅有共享读取权限(writable=false)，有菜单写权限(canWrite=true) -> 禁止维护
  assert.equal(checkCanMaintain(true, { isPublic: true, writable: false }), false)

  // 场景 B: 资料共享(isPublic=true)，当前用户是资料所属者/有数据权限(writable=true)，有菜单写权限(canWrite=true) -> 允许维护
  assert.equal(checkCanMaintain(true, { isPublic: true, writable: true }), true)

  // 场景 C: 资料私有(isPublic=false)，当前用户无数据维护权限(writable=false) -> 禁止维护
  assert.equal(checkCanMaintain(true, { isPublic: false, writable: false }), false)

  // 场景 D: 资料私有(isPublic=false)，当前用户有数据维护权限(writable=true) -> 允许维护
  assert.equal(checkCanMaintain(true, { isPublic: false, writable: true }), true)

  // 场景 E: 账号全局只读(canWrite=false)，无论 isPublic 和 writable 为何值 -> 统统禁止维护
  assert.equal(checkCanMaintain(false, { isPublic: true, writable: true }), false)
  assert.equal(checkCanMaintain(false, { isPublic: false, writable: true }), false)
})

test('deleteChunk API formats correct DELETE URL and query params', async () => {
  let capturedConfig = null
  const dummyRequest = {
    delete: (config) => {
      capturedConfig = config
      return Promise.resolve({ data: { version: 2, chunkCount: 5, chunkStatus: 'draft' } })
    },
  }
  const { deleteChunk } = loadTs('src/apis/ai/document/index.ts', {
    '@/utils/Request': { default: dummyRequest },
  })

  await deleteChunk('doc-100', 'chunk-5', 'v1')
  assert.equal(capturedConfig.url, '/ai/api/v1/knowledge-documents/doc-100/chunks/chunk-5')
  assert.equal(capturedConfig.params.version, 'v1')
})

test('delete chunk selection algorithm prioritizes next, then prev, and handles page fallback', () => {
  const resolveNextActive = (list, deletingId, current) => {
    const idx = list.findIndex(c => c.id === deletingId)
    let candidate = null
    if (idx > -1) {
      if (idx + 1 < list.length) {
        candidate = list[idx + 1].id
      } else if (idx - 1 >= 0) {
        candidate = list[idx - 1].id
      }
    }
    const pageFallsBack = list.length <= 1 && current > 1
    return { candidate, pageFallsBack }
  }

  // 1. 删除中间项：优先选下一片
  const list3 = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]
  assert.equal(resolveNextActive(list3, 'c2', 1).candidate, 'c3')
  assert.equal(resolveNextActive(list3, 'c2', 1).pageFallsBack, false)

  // 2. 删除末尾项：没有下一片，选上一片
  assert.equal(resolveNextActive(list3, 'c3', 1).candidate, 'c2')
  assert.equal(resolveNextActive(list3, 'c3', 1).pageFallsBack, false)

  // 3. 删除第 2 页唯一项：触发退回上一页
  const list1 = [{ id: 'c1' }]
  assert.equal(resolveNextActive(list1, 'c1', 2).candidate, null)
  assert.equal(resolveNextActive(list1, 'c1', 2).pageFallsBack, true)

  // 4. 删除第 1 页唯一项：不退回上一页（总数变为0）
  assert.equal(resolveNextActive(list1, 'c1', 1).candidate, null)
  assert.equal(resolveNextActive(list1, 'c1', 1).pageFallsBack, false)
})

test('splitChunk API posts correct split URL and payload', async () => {
  let capturedConfig = null
  const dummyRequest = {
    post: (config) => {
      capturedConfig = config
      return Promise.resolve({ data: { version: 3, chunkCount: 6, chunkStatus: 'draft' } })
    },
  }
  const { splitChunk } = loadTs('src/apis/ai/document/index.ts', {
    '@/utils/Request': { default: dummyRequest },
  })

  await splitChunk('doc-200', 'chunk-10', {
    version: 'v2',
    firstContent: '第一段正文',
    secondContent: '第二段正文',
  })
  assert.equal(capturedConfig.url, '/ai/api/v1/knowledge-documents/doc-200/chunks/chunk-10/split')
  assert.equal(capturedConfig.data.version, 'v2')
  assert.equal(capturedConfig.data.firstContent, '第一段正文')
  assert.equal(capturedConfig.data.secondContent, '第二段正文')
})

test('cursor split cuts text into two non-empty segments preserving dirty edits and detecting markdown cut', () => {
  const text = '## 章节标题\n```javascript\nconsole.log(1)\nconsole.log(2)\n```\n结束'
  // 在代码块中间切分（例如在 console.log(1) 之后）
  const cutPos = text.indexOf('console.log(1)\n') + 'console.log(1)\n'.length
  const first = text.slice(0, cutPos)
  const second = text.slice(cutPos)

  assert.equal(first.length + second.length, text.length)
  assert.ok(first.trim().length > 0)
  assert.ok(second.trim().length > 0)

  // 检测代码块 ``` 奇偶性
  const codeBlockCount = (first.match(/```/g) || []).length
  assert.equal(codeBlockCount % 2, 1) // 奇数个，检测到了代码块未闭合警告
})

test('overlapTokens supports default, echo, parameter building, and enforces all 4 validation rules', () => {
  const chunkHelper = loadTs(`${base}chunks/helper.ts`)
  const { initializeChunkForm, buildChunkParameters, validateChunkParameters } = chunkHelper

  // 1. 默认值与回显
  const defaultForm = initializeChunkForm(null, 'pdf')
  assert.equal(defaultForm.overlapTokens, 0)

  const echoForm = initializeChunkForm({
    basic: { strategy: 'hybrid', maxTokens: 512, overlapTokens: 64 },
  }, 'pdf')
  assert.equal(echoForm.overlapTokens, 64)

  // 2. buildChunkParameters 正确将 overlapTokens 写入 parameters.basic
  const built = buildChunkParameters({
    strategy: 'hybrid',
    maxTokens: 512,
    overlapTokens: 64,
    documentTimeoutSeconds: 60,
  }, 'pdf')
  assert.equal(built.basic.overlapTokens, 64)

  // 3. 校验规则 1：设置 maxTokens 时，overlapTokens 必须小于 maxTokens
  assert.equal(
    validateChunkParameters({
      strategy: 'hybrid',
      maxTokens: 100,
      overlapTokens: 100,
      documentTimeoutSeconds: 60,
    }),
    '最多重叠 Token 数 (100) 必须小于单片 Token 上限 (100)'
  )
  assert.equal(
    validateChunkParameters({
      strategy: 'hybrid',
      maxTokens: 100,
      overlapTokens: 150,
      documentTimeoutSeconds: 60,
    }),
    '最多重叠 Token 数 (150) 必须小于单片 Token 上限 (100)'
  )
  assert.equal(
    validateChunkParameters({
      strategy: 'hybrid',
      maxTokens: 100,
      overlapTokens: 50,
      documentTimeoutSeconds: 60,
    }),
    null
  )

  // 4. 校验规则 2：混合策略开启重叠时，必须填写 maxTokens
  assert.equal(
    validateChunkParameters({
      strategy: 'hybrid',
      maxTokens: null,
      overlapTokens: 50,
      documentTimeoutSeconds: 60,
    }),
    '混合策略开启重叠时，必须填写单片 Token 上限'
  )

  // 5. 校验规则 3：正则短片段阈值 minTokens 不能超过 maxTokens - overlapTokens
  // 例如 maxTokens=500, overlapTokens=100 -> effectiveLimit=400
  assert.equal(
    validateChunkParameters({
      strategy: 'regex',
      pattern: '\\n{2,}',
      maxTokens: 500,
      overlapTokens: 100,
      mergeSmallChunks: true,
      minTokens: 450,
      documentTimeoutSeconds: 60,
    }),
    '短片段 Token 阈值 (450) 不能超过单片 Token 上限与重叠数之差 (400)'
  )
  assert.equal(
    validateChunkParameters({
      strategy: 'regex',
      pattern: '\\n{2,}',
      maxTokens: 500,
      overlapTokens: 100,
      mergeSmallChunks: true,
      minTokens: 400,
      documentTimeoutSeconds: 60,
    }),
    null
  )

  // 6. 校验规则 4：层级策略仍不提供 maxTokens，overlapTokens=0 或关闭时正常通过
  assert.equal(
    validateChunkParameters({
      strategy: 'hierarchical',
      overlapTokens: 0,
      documentTimeoutSeconds: 60,
    }),
    null
  )
})

test('knowledge upload config parsing and extension validation from system parameter ai.knowledge.upload', () => {
  const { parseKnowledgeUploadConfig, isAllowedKnowledgeUploadFile } = helper

  // 1. 标准有效配置解析
  const standardConfigJson = JSON.stringify({
    allowedExtensions: [
      '.pdf', '.docx', '.pptx', '.xlsx', '.html', '.htm',
      '.md', '.csv', '.png', '.jpg', '.jpeg',
      '.tif', '.tiff', '.bmp', '.webp'
    ]
  })
  const validRes = parseKnowledgeUploadConfig(standardConfigJson)
  assert.equal(validRes.valid, true)
  assert.equal(validRes.allowedExtensions.length, 15)
  assert.equal(validRes.accept, '.pdf,.docx,.pptx,.xlsx,.html,.htm,.md,.csv,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp')
  assert.ok(validRes.allowedExtensions.includes('.pdf'))
  assert.ok(validRes.allowedExtensions.includes('.webp'))

  // 2. 格式容错与规范化（自动补齐前导点、小写转换、去重、首尾去空格）
  const messyConfigJson = JSON.stringify({
    allowedExtensions: [' pdf ', '.DOCX', 'pptx', '.pdf']
  })
  const normalizedRes = parseKnowledgeUploadConfig(messyConfigJson)
  assert.equal(normalizedRes.valid, true)
  assert.deepEqual(JSON.parse(JSON.stringify(normalizedRes.allowedExtensions)), ['.pdf', '.docx', '.pptx'])
  assert.equal(normalizedRes.accept, '.pdf,.docx,.pptx')

  // 3. 各种异常与非法配置，均熔断返回 valid: false（不回退硬编码，不放开全量格式）
  assert.equal(parseKnowledgeUploadConfig(null).valid, false)
  assert.equal(parseKnowledgeUploadConfig(undefined).valid, false)
  assert.equal(parseKnowledgeUploadConfig('').valid, false)
  assert.equal(parseKnowledgeUploadConfig('   ').valid, false)
  assert.equal(parseKnowledgeUploadConfig('not a json string').valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify('plain string')).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify(12345)).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ otherKey: ['.pdf'] })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: 'not-an-array' })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: [] })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: [123] })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: [''] })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: ['.pdf,.docx'] })).valid, false)
  assert.equal(parseKnowledgeUploadConfig(JSON.stringify({ allowedExtensions: ['.'] })).valid, false)

  // 4. 文件名扩展名校验（取最后一个扩展名，忽略大小写）
  const allowed = ['.pdf', '.docx', '.xlsx']
  assert.equal(isAllowedKnowledgeUploadFile('annual-report.pdf', allowed), true)
  assert.equal(isAllowedKnowledgeUploadFile('annual-report.PDF', allowed), true)
  assert.equal(isAllowedKnowledgeUploadFile('annual-report.DocX', allowed), true)
  assert.equal(isAllowedKnowledgeUploadFile('data.2026.03.xlsx', allowed), true)
  assert.equal(isAllowedKnowledgeUploadFile('data.2026.03.XLSX', allowed), true)

  // 多扩展名安全测试：只校验最后一个扩展名
  assert.equal(isAllowedKnowledgeUploadFile('archive.docx.tar.gz', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('archive.tar.pdf', allowed), true)

  // 不在列表的扩展名或无扩展名文件
  assert.equal(isAllowedKnowledgeUploadFile('script.exe', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('image.png', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('README', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('.gitignore', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('', allowed), false)
  assert.equal(isAllowedKnowledgeUploadFile('report.pdf', []), false)
})

test('getKnowledgeDocumentPage API properly passes chunkStatus alongside uploadStatus, folderIds, and keyword', async () => {
  let capturedConfig = null
  const dummyRequest = {
    get: (config) => {
      capturedConfig = config
      return Promise.resolve({ data: { records: [], total: 0 } })
    },
  }
  const { getKnowledgeDocumentPage } = loadTs('src/apis/ai/document/index.ts', {
    '@/utils/Request': { default: dummyRequest },
  })

  // 1. 同时携带 keyword, uploadStatus, chunkStatus, folderId, folderIds
  await getKnowledgeDocumentPage({
    current: 1,
    size: 20,
    folderId: 'folder-1',
    folderIds: ['folder-1', 'folder-2'],
    keyword: '合同',
    uploadStatus: 'completed',
    chunkStatus: 'confirmed',
  })
  assert.equal(capturedConfig.url, '/ai/api/v1/knowledge-documents')
  assert.equal(capturedConfig.params.current, 1)
  assert.equal(capturedConfig.params.size, 20)
  assert.equal(capturedConfig.params.keyword, '合同')
  assert.equal(capturedConfig.params.uploadStatus, 'completed')
  assert.equal(capturedConfig.params.chunkStatus, 'confirmed')
  assert.deepEqual(JSON.parse(JSON.stringify(capturedConfig.params.folderIds)), ['folder-1', 'folder-2'])

  // 2. 区分 uploadStatus 与 chunkStatus 的 failed 状态
  // 场景 A: 上传失败 (uploadStatus='failed', chunkStatus 不传)
  await getKnowledgeDocumentPage({
    current: 1,
    size: 10,
    uploadStatus: 'failed',
  })
  assert.equal(capturedConfig.params.uploadStatus, 'failed')
  assert.equal(capturedConfig.params.chunkStatus, undefined)

  // 场景 B: 分片生成失败 (uploadStatus='completed', chunkStatus='failed')
  await getKnowledgeDocumentPage({
    current: 1,
    size: 10,
    uploadStatus: 'completed',
    chunkStatus: 'failed',
  })
  assert.equal(capturedConfig.params.uploadStatus, 'completed')
  assert.equal(capturedConfig.params.chunkStatus, 'failed')

  // 3. 重置时移除 chunkStatus，不发送 all、null、undefined 等字符串
  const cleanChunkStatus = (raw) => {
    if (!raw || raw === 'all' || raw === 'null' || raw === 'undefined') return undefined
    return raw
  }
  assert.equal(cleanChunkStatus(undefined), undefined)
  assert.equal(cleanChunkStatus(null), undefined)
  assert.equal(cleanChunkStatus('all'), undefined)
  assert.equal(cleanChunkStatus('null'), undefined)
  assert.equal(cleanChunkStatus('undefined'), undefined)
  assert.equal(cleanChunkStatus('draft'), 'draft')
})




