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

test('move DTO preserves configuration and excludes department, model ID and upload internals', () => {
  const detail = {
    version: '90071992547409939', folderId: '90071992547409938', documentName: '资料', description: null,
    isPublic: false, retrievalMode: 'hybrid', embeddingModelConnectionId: '90071992547409937', embedding: 1024,
    chunkMaxTokens: 1024, chunkOverlapTokens: 100, keywordTopK: 30, vectorTopK: 20, retrievalTopK: 10, similarityThreshold: 0.6,
    orgId: '90071992547409936', embeddingModelId: '90071992547409935', uploadParts: [{ partNumber: 1 }],
  }
  const dto = helper.getDocumentSaveDTO(detail)
  const { orgId, embeddingModelId, uploadParts, ...expected } = detail
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), expected)
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
  assert.equal((await request.post({ url: '/parse', timeout: 300000 })).timeout, 300000)
  assert.equal((await request.post({ url: '/confirm', timeout: 300000 })).timeout, 300000)
  assert.equal((await request.post({ url: '/complete', timeout: 300000 })).timeout, 300000)
})
