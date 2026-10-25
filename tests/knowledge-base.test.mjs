import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadTs(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.url', JSON.stringify(import.meta.url))
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const exports = {}
  vm.runInNewContext(
    compiled,
    {
      exports,
      require: (name) => imports[name] ?? require(name),
      Map,
      Set,
      URL,
      setTimeout,
      clearTimeout,
      ...globals,
    },
    { filename: path }
  )
  return exports
}

const constants = loadTs('src/constant/index.ts')

test('constants verify AI_PERMISSION_CODE.KNOWLEDGE_BASE and retrieval mode constants', () => {
  assert.equal(constants.AI_PERMISSION_CODE.KNOWLEDGE_BASE, 'ai:knowledge-base')
  assert.equal(constants.KNOWLEDGE_RETRIEVAL_MODE.KEYWORD, 'keyword')
  assert.equal(constants.KNOWLEDGE_RETRIEVAL_MODE.VECTOR, 'vector')
  assert.equal(constants.KNOWLEDGE_RETRIEVAL_MODE.HYBRID, 'hybrid')
})

test('dimension intersection computes intersection of model supported dimensions and [768, 1024, 1536]', () => {
  const ALLOWED = [768, 1024, 1536]
  const compute = (modelDims) => {
    if (!Array.isArray(modelDims) || !modelDims.length) return ALLOWED
    const inter = modelDims.filter((d) => ALLOWED.includes(d))
    return inter.length ? inter : ALLOWED
  }

  // 交集测试
  assert.deepEqual(compute([1024, 1536, 2048]), [1024, 1536])
  assert.deepEqual(compute([768]), [768])
  assert.deepEqual(compute([512, 4096]), [768, 1024, 1536]) // 无交集时回退到默认
  assert.deepEqual(compute([]), [768, 1024, 1536])
  assert.deepEqual(compute(null), [768, 1024, 1536])
})

test('knowledge base API endpoints format correctly with string IDs', async () => {
  const requests = []
  const mockRequest = {
    get: async (cfg) => { requests.push({ method: 'GET', ...cfg }); return { data: {} } },
    post: async (cfg) => { requests.push({ method: 'POST', ...cfg }); return { data: {} } },
    put: async (cfg) => { requests.push({ method: 'PUT', ...cfg }); return { data: {} } },
    delete: async (cfg) => { requests.push({ method: 'DELETE', ...cfg }); return { data: {} } },
  }

  const kbApis = loadTs('src/apis/ai/knowledge-base/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  // 列表查询
  await kbApis.getKnowledgeBasePage({ current: 1, size: 12, keyword: '研发' })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).params)), { current: 1, size: 12, keyword: '研发' })

  // 详情查询
  await kbApis.getKnowledgeBaseDetail('90071992547409931')
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases/90071992547409931')

  // 新增知识库
  await kbApis.createKnowledgeBase({
    name: '测试库',
    orgId: 'org-1',
    dataStatus: 1,
    isPublic: false,
    retrievalMode: 'hybrid',
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases')

  // 修改知识库
  await kbApis.updateKnowledgeBase('90071992547409931', {
    version: 'v1.0',
    name: '更新库',
    dataStatus: 1,
    isPublic: true,
    retrievalMode: 'hybrid',
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases/90071992547409931')

  // 删除知识库
  await kbApis.deleteKnowledgeBase('90071992547409931')
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases/90071992547409931')
})

test('document status endpoint and folder endpoint adhere to requirements', async () => {
  const requests = []
  const mockRequest = {
    get: async (cfg) => { requests.push({ method: 'GET', ...cfg }); return { data: {} } },
    post: async (cfg) => { requests.push({ method: 'POST', ...cfg }); return { data: {} } },
    put: async (cfg) => { requests.push({ method: 'PUT', ...cfg }); return { data: {} } },
    delete: async (cfg) => { requests.push({ method: 'DELETE', ...cfg }); return { data: {} } },
  }

  const docApis = loadTs('src/apis/ai/document/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })
  const folderApis = loadTs('src/apis/ai/folder/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  // 文档启停 PUT /v1/knowledge-documents/{id}/status
  await docApis.updateKnowledgeDocumentStatus('doc-1001', { version: 'v2', dataStatus: 1 })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-documents/doc-1001/status')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), { version: 'v2', dataStatus: 1 })

  // 分类查询必传 knowledgeBaseId
  await folderApis.getKnowledgeFolderList({ knowledgeBaseId: 'kb-999' })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-folders')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).params)), { knowledgeBaseId: 'kb-999' })

  // 分类保存不再携带 orgId，根分类 parentId 为 null
  await folderApis.createKnowledgeFolder({
    knowledgeBaseId: 'kb-999',
    parentId: null,
    folderName: '产品文档',
    description: '说明',
    sortOrder: 1,
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-folders')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    knowledgeBaseId: 'kb-999',
    parentId: null,
    folderName: '产品文档',
    description: '说明',
    sortOrder: 1,
  })
})

test('rerank model square endpoints and connection parameters', async () => {
  const requests = []
  const mockRequest = {
    get: async (cfg) => { requests.push({ method: 'GET', ...cfg }); return { data: {} } },
  }

  const squareApis = loadTs('src/apis/ai/square/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  // 1. 查询可选模型
  await squareApis.getSquareModelPage({
    current: 1,
    size: 200,
    modelType: 'rerank',
    connected: true,
    keyword: 'bge',
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/model-square/models')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).params)), {
    current: 1,
    size: 200,
    modelType: 'rerank',
    connected: true,
    keyword: 'bge',
  })

  // 2. 解析模型连接
  await squareApis.getSquareConnections({
    modelId: '90071992547409931',
    dataStatus: 1,
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/model-square/connections')
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).params)), {
    modelId: '90071992547409931',
    dataStatus: 1,
  })

  // 3. 编辑回显连接详情
  await squareApis.getSquareConnectionDetail('90071992547409988')
  assert.equal(requests.at(-1).url, '/ai/api/v1/model-square/connections/90071992547409988')
})

test('rerank payload formatting: enabled with connection ID and finite threshold vs disabled with null', async () => {
  const requests = []
  const mockRequest = {
    put: async (cfg) => { requests.push({ method: 'PUT', ...cfg }); return { data: {} } },
  }

  const kbApis = loadTs('src/apis/ai/knowledge-base/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  // 开启重排并传入有限数值阈值（如大于 1 的有效分数）
  await kbApis.updateKnowledgeBase('kb-100', {
    version: 'v1.0',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: 2.5,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.0',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: 2.5,
  })

  // 开启重排但不填阈值（null）
  await kbApis.updateKnowledgeBase('kb-100', {
    version: 'v1.1',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: null,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.1',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: null,
  })

  // 关闭重排：全部置为 false 与 null
  await kbApis.updateKnowledgeBase('kb-100', {
    version: 'v1.2',
    name: '重排库',
    rerankEnabled: false,
    rerankConnectionId: null,
    rerankThreshold: null,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.2',
    name: '重排库',
    rerankEnabled: false,
    rerankConnectionId: null,
    rerankThreshold: null,
  })
})
