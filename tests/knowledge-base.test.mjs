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
    .replaceAll('import.meta.env.DEV', 'false')
    .replaceAll('import.meta.env', '({})')
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
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      location: { reload: () => {} },
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
    orgId: 'org-1',
    name: '更新库',
    dataStatus: 1,
    isPublic: true,
    retrievalMode: 'hybrid',
  })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases/90071992547409931')
  assert.equal(requests.at(-1).data.orgId, 'org-1')

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
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: 2.5,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.0',
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: 2.5,
  })

  // 开启重排但不填阈值（null）
  await kbApis.updateKnowledgeBase('kb-100', {
    version: 'v1.1',
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: null,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.1',
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: true,
    rerankConnectionId: '90071992547409988',
    rerankThreshold: null,
  })

  // 关闭重排：全部置为 false 与 null
  await kbApis.updateKnowledgeBase('kb-100', {
    version: 'v1.2',
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: false,
    rerankConnectionId: null,
    rerankThreshold: null,
  })
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    version: 'v1.2',
    orgId: 'org-test-100',
    name: '重排库',
    rerankEnabled: false,
    rerankConnectionId: null,
    rerankThreshold: null,
  })
})

test('recall-test endpoint formats correctly with query body and long timeout', async () => {
  const requests = []
  const mockRequest = {
    post: async (cfg) => { requests.push({ method: 'POST', ...cfg }); return { data: [] } },
  }

  const kbApis = loadTs('src/apis/ai/knowledge-base/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  await kbApis.testRecall('kb-999', { query: '什么是召回测试？' })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-bases/kb-999/recall-test')
  assert.deepEqual(requests.at(-1).data, { query: '什么是召回测试？' })
  assert.equal(requests.at(-1).timeout, 60000)
})

test('chunks/confirm endpoint formats correctly with version and long timeout', async () => {
  const requests = []
  const mockRequest = {
    post: async (cfg) => { requests.push({ method: 'POST', ...cfg }); return { data: {} } },
  }

  const docApis = loadTs('src/apis/ai/document/index.ts', {
    '@/utils/Request': { default: mockRequest },
  })

  await docApis.confirmChunks('doc-888', { version: 'v3.2' })
  assert.equal(requests.at(-1).url, '/ai/api/v1/knowledge-documents/doc-888/chunks/confirm')
  assert.deepEqual(requests.at(-1).data, { version: 'v3.2' })
  assert.equal(requests.at(-1).timeout, 120000)
})

test('vector status constants and DTO purity without vectorStatus', () => {
  // 1. 验证字典类型与向量状态常量
  assert.equal(constants.KNOWLEDGE_DICT_TYPE.VECTOR_STATUS, 'ai_knowledge_vector_status')
  assert.equal(constants.KNOWLEDGE_VECTOR_STATUS.UNPROCESSED, 'unprocessed')
  assert.equal(constants.KNOWLEDGE_VECTOR_STATUS.GENERATING, 'generating')
  assert.equal(constants.KNOWLEDGE_VECTOR_STATUS.COMPLETED, 'completed')
  assert.equal(constants.KNOWLEDGE_VECTOR_STATUS.FAILED, 'failed')
  assert.equal(constants.KNOWLEDGE_VECTOR_STATUS.STALE, 'stale')

  // 2. 验证 getDocumentSaveDTO 严格只读，不将 vectorStatus 带入保存请求
  const docHelper = loadTs('src/views/ai/knowledge-document/helper.ts', {
    '@/constant': constants,
    '@/composables/useTreeHelper': { buildTreeStructure: () => [] },
  })
  const detail = {
    id: 'doc-101',
    version: 'v1.0',
    folderId: 'folder-202',
    documentName: '系统设计手册',
    description: '核心说明',
    isPublic: true,
    uploadStatus: 'completed',
    chunkStatus: 'confirmed',
    vectorStatus: 'completed', // 详情返回 vectorStatus
    dataStatus: 1,
  }
  const saveDTO = docHelper.getDocumentSaveDTO(detail)
  assert.deepEqual(JSON.parse(JSON.stringify(saveDTO)), {
    version: 'v1.0',
    folderId: 'folder-202',
    documentName: '系统设计手册',
    description: '核心说明',
    isPublic: true,
  })
  // 确认 vectorStatus 绝不泄露到保存 DTO
  assert.equal(Object.prototype.hasOwnProperty.call(saveDTO, 'vectorStatus'), false)
})

test('parseKnowledgeUploadConfig correctly parses allowedExtensions and maxSizeMb with byte conversion', () => {
  const docHelper = loadTs('src/views/ai/knowledge-document/helper.ts', {
    '@/constant': constants,
    '@/composables/useTreeHelper': { buildTreeStructure: () => [] },
  })

  // 1. 合法 JSON 配置：包含 allowedExtensions 和 maxSizeMb: 20
  const validJson = JSON.stringify({
    allowedExtensions: ['.pdf', '.docx', '.txt'],
    maxSizeMb: 20,
  })
  const res1 = docHelper.parseKnowledgeUploadConfig(validJson)
  assert.equal(res1.valid, true)
  assert.deepEqual(JSON.parse(JSON.stringify(res1.allowedExtensions)), ['.pdf', '.docx', '.txt'])
  assert.equal(res1.accept, '.pdf,.docx,.txt')
  assert.equal(res1.maxSizeMb, 20)
  assert.equal(res1.maxSizeBytes, 20 * 1024 * 1024)

  // 2. 缺失 maxSizeMb 配置时判定为无效
  const missingMaxSizeJson = JSON.stringify({
    allowedExtensions: ['.pdf', '.md'],
  })
  const res2 = docHelper.parseKnowledgeUploadConfig(missingMaxSizeJson)
  assert.equal(res2.valid, false)
  assert.match(res2.error, /maxSizeMb/)

  // 3. maxSizeMb 为非法非正数（如 0、负数、字符串 NaN）判定为无效
  const invalidMaxSizeJson1 = JSON.stringify({
    allowedExtensions: ['.pdf'],
    maxSizeMb: 0,
  })
  assert.equal(docHelper.parseKnowledgeUploadConfig(invalidMaxSizeJson1).valid, false)

  const invalidMaxSizeJson2 = JSON.stringify({
    allowedExtensions: ['.pdf'],
    maxSizeMb: -10,
  })
  assert.equal(docHelper.parseKnowledgeUploadConfig(invalidMaxSizeJson2).valid, false)

  // 4. 空配置或非法 JSON
  assert.equal(docHelper.parseKnowledgeUploadConfig('').valid, false)
  assert.equal(docHelper.parseKnowledgeUploadConfig('{invalid-json').valid, false)
})

test('validateKnowledgeUploadFile verifies exact limit, over-limit, policy smaller limit, and batch/drag filtering', () => {
  const docHelper = loadTs('src/views/ai/knowledge-document/helper.ts', {
    '@/constant': constants,
    '@/composables/useTreeHelper': { buildTreeStructure: () => [] },
  })

  const MB = 1024 * 1024
  const mockFile = (name, size) => ({
    name,
    size,
    type: 'application/octet-stream',
  })

  const baseOptions = {
    allowedExtensions: ['.pdf', '.docx'],
    maxSizeMb: 20,
  }

  // 1. 刚好等于上限（20 MiB = 20 * 1024 * 1024 字节）：允许上传
  const exactLimitFile = mockFile('exact-20mb.pdf', 20 * MB)
  const exactRes = docHelper.validateKnowledgeUploadFile(exactLimitFile, baseOptions)
  assert.equal(exactRes.valid, true)

  // 2. 超过上限 1 字节（20 MiB + 1 字节）：拒绝上传，明确提示文件名和上限文案，且不包含内部引擎名
  const overLimitFile = mockFile('over-limit.pdf', 20 * MB + 1)
  const overRes = docHelper.validateKnowledgeUploadFile(overLimitFile, baseOptions)
  assert.equal(overRes.valid, false)
  assert.match(overRes.error, /over-limit\.pdf/)
  assert.match(overRes.error, /20 MiB/)
  assert.equal(overRes.error.includes('MinIO'), false)
  assert.equal(overRes.error.includes('Tika'), false)

  // 3. 上传策略接口 maxFileBytes 校验：取两者较小值
  // 当 policy 为 15 MiB（小于配置 20 MiB），实际生效上限为 15 MiB
  const policySmallerOptions = {
    allowedExtensions: ['.pdf'],
    maxSizeMb: 20,
    maxFileBytes: 15 * MB,
  }
  // 等于 15 MiB：允许
  assert.equal(
    docHelper.validateKnowledgeUploadFile(mockFile('test-15mb.pdf', 15 * MB), policySmallerOptions).valid,
    true
  )
  // 大于 15 MiB：拒绝，文案显示 15 MiB
  const policyOverRes = docHelper.validateKnowledgeUploadFile(
    mockFile('test-16mb.pdf', 16 * MB),
    policySmallerOptions
  )
  assert.equal(policyOverRes.valid, false)
  assert.match(policyOverRes.error, /15 MiB/)

  // 4. 当 policy 为 50 MiB（大于配置 20 MiB），实际生效上限仍受配置 20 MiB 限制
  const policyLargerOptions = {
    allowedExtensions: ['.pdf'],
    maxSizeMb: 20,
    maxFileBytes: 50 * MB,
  }
  assert.equal(
    docHelper.validateKnowledgeUploadFile(mockFile('test-20mb.pdf', 20 * MB), policyLargerOptions).valid,
    true
  )
  assert.equal(
    docHelper.validateKnowledgeUploadFile(mockFile('test-21mb.pdf', 21 * MB), policyLargerOptions).valid,
    false
  )

  // 5. 扩展名格式校验与空文件校验
  assert.equal(
    docHelper.validateKnowledgeUploadFile(mockFile('script.sh', 1024), baseOptions).valid,
    false
  )
  assert.equal(
    docHelper.validateKnowledgeUploadFile(mockFile('empty.pdf', 0), baseOptions).valid,
    false
  )

  // 6. 文件选择、拖拽和批量上传逐文件校验场景模拟
  // 超限文件不进入上传队列，其他合规文件继续处理
  const batchFiles = [
    mockFile('file-1.pdf', 10 * MB),      // 合规
    mockFile('file-2.pdf', 25 * MB),      // 超限 (25 > 20)
    mockFile('file-3.pdf', 20 * MB),      // 刚好等于上限 (20 === 20)
    mockFile('file-4.exe', 5 * MB),       // 格式不符
    mockFile('file-5.docx', 18 * MB),     // 合规
  ]

  const queue = []
  const rejectedErrors = []

  for (const f of batchFiles) {
    const result = docHelper.validateKnowledgeUploadFile(f, baseOptions)
    if (result.valid) {
      queue.push(f)
    } else {
      rejectedErrors.push({ file: f.name, error: result.error })
    }
  }

  // 仅合规文件进入上传队列
  assert.equal(queue.length, 3)
  assert.deepEqual(queue.map((f) => f.name), ['file-1.pdf', 'file-3.pdf', 'file-5.docx'])

  // 不合规文件被拦截并产生明确提示
  assert.equal(rejectedErrors.length, 2)
  assert.equal(rejectedErrors[0].file, 'file-2.pdf')
  assert.match(rejectedErrors[0].error, /超过上限/)
  assert.equal(rejectedErrors[1].file, 'file-4.exe')
  assert.match(rejectedErrors[1].error, /格式不受支持/)
})

test('firstReadablePath returns the user\'s first available menu item instead of prioritizing model square', () => {
  // 加载 userStore 相关模块
  const mockPinia = {
    defineStore: (id, setup) => () => setup(),
  }
  const mockRouter = {
    clearDynamicRoutes: () => {},
    syncDynamicRoutes: () => {},
  }
  const menuPermission = loadTs('src/utils/menuPermission.ts', {
    '@/constant': constants,
  })

  const userModule = loadTs('src/stores/modules/user.ts', {
    pinia: mockPinia,
    vue: { ref: (val) => ({ value: val }) },
    '@/router': mockRouter,
    '@/utils/menuPermission': menuPermission,
    '@/apis/upms/login': { selectUserInfo: async () => ({ data: {} }), selectUserMenus: async () => ({ data: [] }), selectUserRole: async () => ({ data: [] }), selectUserTenant: async () => ({ data: [] }) },
    '@/apis/upms/dict': { clearDictCache: () => {} },
    './config': { useSystemConfigStore: () => ({}) },
  })

  const store = userModule.menusStore()

  // 场景 1：系统管理排在第一位（包含用户中心 /system/users），模型广场 /dashboard 排在第二位
  // 原有逻辑会错误优先返回 /dashboard；新逻辑必须返回 /system/users
  const menusScenario1 = [
    {
      id: '1',
      parentId: null,
      menuName: '系统管理',
      menuPath: null,
      sort: 1,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '11',
      parentId: '1',
      menuName: '用户中心',
      menuPath: '/system/users',
      menuRouter: '@/views/system/users/index.vue',
      sort: 1,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '12',
      parentId: '1',
      menuName: '角色管理',
      menuPath: '/system/roles',
      menuRouter: '@/views/system/roles/index.vue',
      sort: 2,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '2',
      parentId: null,
      menuName: 'AI应用',
      menuPath: null,
      sort: 2,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '21',
      parentId: '2',
      menuName: '模型广场',
      menuPath: '/dashboard',
      menuRouter: '@/views/dashboard/index.vue',
      permissionCode: 'ai:model-square',
      sort: 1,
      accessLevel: 'READ_WRITE',
    },
  ]

  store.setUserMenus(menusScenario1)
  assert.equal(store.firstReadablePath(), '/system/users')

  // 场景 2：用户仅有知识库菜单，无模型广场
  const menusScenario2 = [
    {
      id: '3',
      parentId: null,
      menuName: '知识库',
      menuPath: '/ai/knowledge-bases',
      menuRouter: '@/views/ai/knowledge-base/index.vue',
      permissionCode: 'ai:knowledge-base',
      sort: 1,
      accessLevel: 'READ_WRITE',
    },
  ]
  store.setUserMenus(menusScenario2)
  assert.equal(store.firstReadablePath(), '/ai/knowledge-bases')

  // 场景 3：第一个菜单为外部链接，第二个为无路径的目录节点，应当跳过并命中首个有效可读站内菜单
  const menusScenario3 = [
    {
      id: '4',
      parentId: null,
      menuName: '外部文档',
      menuPath: 'https://docs.example.com',
      sort: 1,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '5',
      parentId: null,
      menuName: '未配置路径的空目录',
      menuPath: null,
      sort: 2,
      accessLevel: 'READ_WRITE',
    },
    {
      id: '6',
      parentId: null,
      menuName: '操作审计',
      menuPath: 'system/audit', // 相对路径无前导斜杠
      sort: 3,
      accessLevel: 'READ_ONLY', // 只读
    },
  ]
  store.setUserMenus(menusScenario3)
  assert.equal(store.firstReadablePath(), '/system/audit')

  // 场景 4：无任何菜单
  store.setUserMenus([])
  assert.equal(store.firstReadablePath(), '')
})

test('tenant menu tree authorization: resolveTreeCheckedState and useTreeSelection prevent over-selection and preserve partial selection', () => {
  const treeHelper = loadTs('src/composables/useTreeHelper.ts', {
    vue: { ref: (val) => ({ value: val }) },
  })

  // 构造用户验收示例树：
  // A
  // ├─ B
  // │  ├─ C
  // │  └─ D
  // └─ E
  const acceptanceTree = [
    {
      key: 'A',
      title: 'A目录',
      children: [
        {
          key: 'B',
          title: 'B目录',
          children: [
            { key: 'C', title: 'C菜单', children: [] },
            { key: 'D', title: 'D菜单', children: [] },
          ],
        },
        { key: 'E', title: 'E菜单', children: [] },
      ],
    },
  ]

  // 1. 验证 resolveTreeCheckedState 核心算法
  // 后端返回 selectedMenuIds = ['A', 'B', 'C']
  const resolution1 = treeHelper.resolveTreeCheckedState(acceptanceTree, ['A', 'B', 'C'])
  // C 应该选中，D、E 绝不能在 checkedKeys 中
  assert.deepEqual(Array.from(resolution1.checkedKeys), ['C'])
  // A、B 应正确呈现部分选中状态 (halfCheckedKeys)
  assert.equal(resolution1.halfCheckedKeys.includes('A'), true)
  assert.equal(resolution1.halfCheckedKeys.includes('B'), true)
  assert.equal(resolution1.halfCheckedKeys.includes('C'), false)
  assert.equal(resolution1.halfCheckedKeys.includes('D'), false)
  assert.equal(resolution1.halfCheckedKeys.includes('E'), false)

  // 2. 验证 useTreeSelection 回显与直接保存（未做任何修改）
  const selection = treeHelper.useTreeSelection()
  const originalSelected = ['A', 'B', 'C']
  selection.initCheckedState(acceptanceTree, originalSelected)

  // 组件绑定的 checkedKeys 只有 C，保证 Ant Design Vue 不会向下级联误勾选 D 和 E
  assert.deepEqual(Array.from(selection.checkedKeys.value), ['C'])
  // 半选状态被准确恢复
  assert.equal(selection.halfCheckedKeys.value.includes('A'), true)
  assert.equal(selection.halfCheckedKeys.value.includes('B'), true)

  // 不做修改直接保存：
  const finalIdsDirectSave = selection.getSelectedAndHalfKeys()
  const finalSetDirectSave = new Set(finalIdsDirectSave)
  // 必须包含原始的 A、B、C
  assert.equal(finalSetDirectSave.has('A'), true)
  assert.equal(finalSetDirectSave.has('B'), true)
  assert.equal(finalSetDirectSave.has('C'), true)
  // 绝不能新增 D、E 的授权
  assert.equal(finalSetDirectSave.has('D'), false)
  assert.equal(finalSetDirectSave.has('E'), false)

  // 检查 removedMenuCount 必须为 0，杜绝弹出误收回权限的确认框
  const removedCountDirect = originalSelected.filter((id) => !finalSetDirectSave.has(id)).length
  assert.equal(removedCountDirect, 0)

  // 3. 验证刷新后再次保存：
  selection.clearChecked()
  selection.initCheckedState(acceptanceTree, Array.from(finalSetDirectSave))
  const finalIdsSecondSave = selection.getSelectedAndHalfKeys()
  const finalSetSecondSave = new Set(finalIdsSecondSave)
  assert.equal(finalSetSecondSave.has('D'), false)
  assert.equal(finalSetSecondSave.has('E'), false)
  assert.equal(finalSetSecondSave.size, 3)

  // 4. 验证用户主动全选并保存：
  selection.checkAll(acceptanceTree)
  const finalIdsCheckAll = selection.getSelectedAndHalfKeys()
  const finalSetCheckAll = new Set(finalIdsCheckAll)
  assert.deepEqual(Array.from(finalSetCheckAll).sort(), ['A', 'B', 'C', 'D', 'E'].sort())

  // 模拟全选保存后再次刷新打开，整棵树应准确恢复全选状态（halfCheckedKeys 为空）
  const resolutionAll = treeHelper.resolveTreeCheckedState(acceptanceTree, ['A', 'B', 'C', 'D', 'E'])
  assert.deepEqual(Array.from(resolutionAll.checkedKeys).sort(), ['C', 'D', 'E'].sort())
  assert.deepEqual(Array.from(resolutionAll.allCheckedKeys).sort(), ['A', 'B', 'C', 'D', 'E'].sort())
  assert.deepEqual(Array.from(resolutionAll.halfCheckedKeys), [])

  // 5. 验证用户主动操作（部分增删与清空交互）
  // 用户勾选了 D，使 B 全选，A 保持半选
  selection.onTreeCheck(['B', 'C', 'D'], { halfCheckedKeys: ['A'] })
  const userCheckedIds = new Set(selection.getSelectedAndHalfKeys())
  assert.equal(userCheckedIds.has('A'), true)
  assert.equal(userCheckedIds.has('B'), true)
  assert.equal(userCheckedIds.has('C'), true)
  assert.equal(userCheckedIds.has('D'), true)
  assert.equal(userCheckedIds.has('E'), false)

  // 用户清空选择
  selection.clearChecked()
  assert.deepEqual(Array.from(selection.getSelectedAndHalfKeys()), [])
})




