<template>
  <section class="management-page knowledge-document-page">
    <!-- 左侧：分类目录侧栏，对齐全局 OrgSidebar 统一视觉与微型字规范 -->
    <aside class="folder-sidebar du-panel">
      <div class="sidebar-header">
        <span class="sidebar-title">
          <FolderOutlined />分类目录
        </span>
        <a-tooltip title="刷新分类目录">
          <a-button type="text" size="small" :loading="foldersLoading" @click="getFolders">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </div>

      <!-- 目录快速过滤框 -->
      <div class="tree-search">
        <a-input
          v-model:value="folderSearch"
          allow-clear
          placeholder="过滤分类目录..."
          size="small"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </div>

      <!-- 目录树容器，严格遵循 12px 微型字规范 -->
      <div class="tree-container">
        <a-spin :spinning="foldersLoading">
          <a-tree
            v-if="filteredFolderTree.length"
            :tree-data="filteredFolderTree"
            :selected-keys="selectedFolderId ? [selectedFolderId] : []"
            block-node
            default-expand-all
            @select="handleFolderSelect"
          >
            <template #title="node">
              <span class="folder-node-title" :title="node.title">
                <FolderOutlined class="folder-icon" />
                <span class="folder-text">{{ node.title }}</span>
              </span>
            </template>
          </a-tree>
          <a-empty v-else description="暂无可见目录" class="empty-tree" />
        </a-spin>
      </div>
    </aside>

    <!-- 右侧：资料列表主区域 -->
    <div class="du-panel table-panel main-panel">
      <!-- 页面顶部工具栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <!-- 当前所选目录徽标，字号 12px，高度贴合 30px 控件 -->
          <span class="current-folder-badge" :title="selectedFolder?.folderName || '请选择分类目录'">
            <FolderOutlined class="folder-badge-icon" />
            <span class="folder-badge-text">{{ selectedFolder?.folderName || '未选择目录' }}</span>
          </span>

          <a-input
            v-model:value="query.keyword"
            placeholder="资料名称"
            :maxlength="255"
            allow-clear
            class="keyword-input"
            @press-enter="handleSearch"
          />
          <a-select
            v-model:value="query.uploadStatus"
            :options="getOptions(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS)"
            allow-clear
            placeholder="上传状态"
            class="status-select"
            @change="handleSearch"
          />
          <a-select
            v-model:value="query.chunkStatus"
            :options="chunkStatusOptions"
            allow-clear
            placeholder="分片状态"
            class="status-select"
            @change="handleSearch"
          />
          <a-button type="primary" :loading="loading" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="handleReset">重置</a-button>
        </div>

        <div class="toolbar-actions">
          <a-button v-if="canWrite" type="primary" :disabled="!canUpload" @click="handleAdd">
            <UploadOutlined />上传资料
          </a-button>
        </div>
      </header>

      <!-- 资料列表表格：行高刚性锁定 34px，字号统一 12px -->
      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 980 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 资料名称：带文件格式图标、12px 常规字重平滑排版 -->
          <div v-if="column.key === 'documentName'" class="document-name-cell-wrap">
            <FileTypeIcon :file-type="record.fileType" class="document-type-icon" />
            <EllipsisText
              :text="record.documentName"
              class="document-name-cell"
            />
          </div>

          <!-- 原始文件名：12px 次级文字 -->
          <EllipsisText
            v-else-if="column.key === 'originalFilename'"
            :text="record.originalFilename || '—'"
            class="text-secondary"
          />

          <!-- 文件大小：11px 等宽 -->
          <span v-else-if="column.key === 'fileSize'" class="du-mono file-size-cell">
            {{ formatFileSize(record.fileSize) }}
          </span>

          <!-- 共享状态：Tag 展示共享 / 私有 -->
          <span v-else-if="column.key === 'isPublic'">
            <a-tag :color="record.isPublic ? 'blue' : 'default'">
              {{ record.isPublic ? '共享' : '私有' }}
            </a-tag>
          </span>

          <!-- 上传状态：DictTag 统一 20px 高度微型标签，使用 uploadErrorMessage 展示上传错误 -->
          <DictTag
            v-else-if="column.key === 'uploadStatus'"
            :type-code="KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS"
            :value="record.uploadStatus"
            :title="record.uploadErrorMessage || undefined"
          />

          <!-- 分片状态：DictTag 统一展示 -->
          <DictTag
            v-else-if="column.key === 'chunkStatus'"
            :type-code="KNOWLEDGE_DICT_TYPE.CHUNK_STATUS"
            :value="record.chunkStatus || KNOWLEDGE_CHUNK_STATUS.UNPROCESSED"
          />

          <!-- 向量状态：DictTag 独立展示，不与其他状态相互推断 -->
          <template v-else-if="column.key === 'vectorStatus'">
            <DictTag
              v-if="record.vectorStatus"
              :type-code="KNOWLEDGE_DICT_TYPE.VECTOR_STATUS"
              :value="record.vectorStatus"
            />
            <span v-else class="text-secondary">—</span>
          </template>

          <!-- 分片数量：等宽数字 -->
          <span v-else-if="column.key === 'chunkCount'" class="du-mono chunk-count-cell">
            {{ record.chunkCount ?? 0 }}
          </span>

          <!-- 创建时间：11px 等宽微小字 -->
          <span v-else-if="column.key === 'createTime'" class="create-time-cell du-mono">
            {{ record.createTime || '—' }}
          </span>

          <!-- 表格操作列：24px 小型 Link 按钮 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button
              type="link"
              size="small"
              :loading="downloadingId === record.id"
              :disabled="record.uploadStatus !== UPLOAD.COMPLETED"
              @click="handleDownload(record)"
            >
              下载
            </a-button>
            <a-button
              type="link"
              size="small"
              :disabled="record.uploadStatus !== UPLOAD.COMPLETED"
              @click="handleManageChunks(record)"
            >
              分片
            </a-button>
            <template v-if="canWrite">
              <span v-if="record.builtIn" class="readonly-label">内置数据只读</span>
              <span v-else-if="record.writable === false" class="readonly-label">仅读</span>
              <template v-else>
                <a-button
                  type="link"
                  size="small"
                  @click="handleEdit(record)"
                >
                  编辑
                </a-button>
                <a-dropdown :trigger="['click']">
                  <a-button type="link" size="small" class="more-action-btn">
                    更多<DownOutlined class="more-action-icon" />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="move" @click="handleMove(record)">
                        <FolderOutlined />
                        <span>移动分类</span>
                      </a-menu-item>
                      <a-menu-item
                        v-if="canResumeUpload(record)"
                        key="resume"
                        @click="handleResume(record)"
                      >
                        <CloudUploadOutlined />
                        <span>继续上传</span>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item
                        key="delete"
                        danger
                        :disabled="deletingId === record.id"
                        @click="confirmDelete(record)"
                      >
                        <DeleteOutlined />
                        <span>删除资料</span>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty :description="selectedFolderId ? '当前目录暂无符合条件的资料' : '请先选择左侧分类目录'">
            <a-button v-if="canWrite && canUpload" type="primary" @click="handleAdd">
              上传第一份资料
            </a-button>
          </a-empty>
        </template>
      </a-table>
    </div>

    <KnowledgeDocumentFormModal
      v-model:open="formOpen"
      :record="currentRecord"
      :folders="folders"
      :move-only="moveOnly"
      @success="getList"
    />
    <KnowledgeUploadModal
      v-model:open="uploadOpen"
      :record="uploadRecord"
      :folder="selectedFolder"
      :folders="folders"
      @success="getList"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal, type TableColumnsType } from 'ant-design-vue'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  FolderOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import {
  deleteKnowledgeDocument,
  getKnowledgeDocumentFolders,
  getKnowledgeDocumentPage,
  getKnowledgeDownloadUrl,
} from '@/apis/ai/document'
import type {
  KnowledgeDocumentFolder,
  KnowledgeDocumentQuery,
  KnowledgeDocumentRecord,
} from '@/apis/ai/document/type'
import {
  KNOWLEDGE_CHUNK_STATUS,
  KNOWLEDGE_DICT_TYPE,
  KNOWLEDGE_UPLOAD_STATUS as UPLOAD,
} from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { useSystemConfigStore } from '@/stores/modules/config'
import { formatFileSize } from '@/utils/format'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import FileTypeIcon from './components/FileTypeIcon.vue'
import KnowledgeDocumentFormModal from './components/KnowledgeDocumentFormModal.vue'
import KnowledgeUploadModal from './components/KnowledgeUploadModal.vue'
import {
  canResumeUpload,
  canUseFolder,
  getFolderAndDescendantIds,
  getFolderTree,
} from './helper'

const route = useRoute()
const router = useRouter()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getOptions } = useSystemDict([
  KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS,
  KNOWLEDGE_DICT_TYPE.CHUNK_STATUS,
])

const fallbackChunkStatusOptions = [
  { label: '未分片', value: KNOWLEDGE_CHUNK_STATUS.UNPROCESSED },
  { label: '生成中', value: KNOWLEDGE_CHUNK_STATUS.GENERATING },
  { label: '草稿', value: KNOWLEDGE_CHUNK_STATUS.DRAFT },
  { label: '已确认', value: KNOWLEDGE_CHUNK_STATUS.CONFIRMED },
  { label: '失败', value: KNOWLEDGE_CHUNK_STATUS.FAILED },
]

const chunkStatusOptions = computed(() => {
  const dictOptions = getOptions(KNOWLEDGE_DICT_TYPE.CHUNK_STATUS)
  return dictOptions && dictOptions.length > 0 ? dictOptions : fallbackChunkStatusOptions
})

const configStore = useSystemConfigStore()
const query = reactive<KnowledgeDocumentQuery>({
  current: 1,
  size: configStore.resource?.pagination?.defaultSize || 10,
})
const tableData = ref<KnowledgeDocumentRecord[]>([])
const total = ref(0)
const loading = ref(false)
const foldersLoading = ref(false)
const folders = ref<KnowledgeDocumentFolder[]>([])
const folderSearch = ref('')
const selectedFolderId = ref('')
const selectedFolder = computed(
  () => folders.value.find((folder) => folder.id === selectedFolderId.value) || null
)
const folderTree = computed(() => getFolderTree(folders.value))

const filteredFolderTree = computed(() => {
  if (!folderSearch.value.trim()) return folderTree.value
  const kw = folderSearch.value.trim().toLowerCase()
  const filter = (nodes: typeof folderTree.value): typeof folderTree.value => {
    return nodes
      .map((node) => {
        const titleStr = String(node.title || '')
        const matches = titleStr.toLowerCase().includes(kw)
        const children = node.children ? filter(node.children as typeof folderTree.value) : []
        if (matches || children.length) {
          return { ...node, children: children.length ? children : undefined }
        }
        return null
      })
      .filter(Boolean) as typeof folderTree.value
  }
  return filter(folderTree.value)
})

const canUpload = computed(() => canUseFolder(selectedFolder.value || undefined))
const formOpen = ref(false)
const uploadOpen = ref(false)
const moveOnly = ref(false)
const currentRecord = ref<KnowledgeDocumentRecord | null>(null)
const uploadRecord = ref<KnowledgeDocumentRecord | null>(null)
const downloadingId = ref('')
const deletingId = ref('')

const columns: TableColumnsType<KnowledgeDocumentRecord> = [
  { title: '资料名称', dataIndex: 'documentName', key: 'documentName', ellipsis: true },
  { title: '原始文件名', dataIndex: 'originalFilename', key: 'originalFilename', width: 140, ellipsis: true },
  { title: '大小', dataIndex: 'fileSize', key: 'fileSize', width: 70, align: 'right' },
  { title: '共享状态', dataIndex: 'isPublic', key: 'isPublic', width: 60, align: 'center' },
  { title: '上传状态', dataIndex: 'uploadStatus', key: 'uploadStatus', width: 72, align: 'center' },
  { title: '分片状态', dataIndex: 'chunkStatus', key: 'chunkStatus', width: 72, align: 'center' },
  { title: '向量状态', dataIndex: 'vectorStatus', key: 'vectorStatus', width: 72, align: 'center' },
  { title: '分片数', dataIndex: 'chunkCount', key: 'chunkCount', width: 60, align: 'right' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 140, align: 'center' },
  { title: '操作', key: 'actions', width: 215, fixed: 'right', align: 'right' },
]

const handleManageChunks = (record: KnowledgeDocumentRecord) => {
  router.push({
    path: `/ai/knowledge-documents/${record.id}/chunks`,
    query: record.knowledgeBaseId ? { kbId: record.knowledgeBaseId } : undefined,
  })
}

const pagination = computed(() => ({
  current: query.current,
  pageSize: query.size,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100', '200'].filter(
    (size) => Number(size) <= (configStore.resource?.pagination?.maxSize || 200)
  ),
  showTotal: (count: number) => `共 ${count} 条`,
}))

let listToken = 0
let folderToken = 0

const getList = async () => {
  const token = ++listToken
  if (!selectedFolderId.value) {
    tableData.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const targetFolderIds = getFolderAndDescendantIds(selectedFolderId.value, folders.value)
    const cleanUploadStatus =
      query.uploadStatus &&
      query.uploadStatus !== ('all' as any) &&
      query.uploadStatus !== ('null' as any) &&
      query.uploadStatus !== ('undefined' as any)
        ? query.uploadStatus
        : undefined

    const cleanChunkStatus =
      query.chunkStatus &&
      query.chunkStatus !== ('all' as any) &&
      query.chunkStatus !== ('null' as any) &&
      query.chunkStatus !== ('undefined' as any)
        ? query.chunkStatus
        : undefined

    const response = await getKnowledgeDocumentPage({
      current: query.current,
      size: query.size,
      folderId: selectedFolderId.value,
      folderIds: targetFolderIds.length > 0 ? targetFolderIds : [selectedFolderId.value],
      keyword: query.keyword?.trim() || undefined,
      uploadStatus: cleanUploadStatus,
      chunkStatus: cleanChunkStatus,
    })
    if (token !== listToken) return
    tableData.value = response.data.records || []
    total.value = response.data.total
  } catch {
    /* 请求层提示，保留当前筛选，允许重试。 */
  } finally {
    if (token === listToken) loading.value = false
  }
}

const getFolders = async () => {
  const token = ++folderToken
  foldersLoading.value = true
  try {
    const response = await getKnowledgeDocumentFolders()
    if (token !== folderToken) return
    folders.value = response.data || []
    if (!folders.value.some((folder) => folder.id === selectedFolderId.value)) {
      selectedFolderId.value =
        folders.value.find((folder) => !folder.navigationOnly)?.id || folders.value[0]?.id || ''
      query.current = 1
      tableData.value = []
      total.value = 0
    }
    await getList()
  } catch {
    /* 不依赖分类维护菜单。 */
  } finally {
    if (token === folderToken) foldersLoading.value = false
  }
}

const handleFolderSelect = (keys: (string | number)[]) => {
  if (!keys.length) return
  selectedFolderId.value = String(keys[0])
  query.current = 1
  tableData.value = []
  total.value = 0
  void getList()
}

const handleSearch = () => {
  query.current = 1
  void getList()
}

const handleReset = () => {
  query.keyword = undefined
  query.uploadStatus = undefined
  query.chunkStatus = undefined
  handleSearch()
}

const handleTableChange = (page: { current?: number; pageSize?: number }) => {
  query.current = page.current || 1
  query.size = Math.min(page.pageSize || 10, configStore.resource?.pagination?.maxSize || 200)
  void getList()
}

const handleAdd = () => {
  if (!canWrite.value) return
  if (!canUpload.value) return
  uploadRecord.value = null
  uploadOpen.value = true
}

const handleResume = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value || record.writable === false || record.builtIn || !canResumeUpload(record)) return
  uploadRecord.value = record
  uploadOpen.value = true
}

const handleEdit = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value || record.writable === false || record.builtIn) return
  currentRecord.value = record
  moveOnly.value = false
  formOpen.value = true
}

const handleMove = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value || record.writable === false || record.builtIn) return
  currentRecord.value = record
  moveOnly.value = true
  formOpen.value = true
}

const handleDownload = async (record: KnowledgeDocumentRecord) => {
  if (record.uploadStatus !== UPLOAD.COMPLETED || downloadingId.value) return
  downloadingId.value = record.id
  try {
    const response = await getKnowledgeDownloadUrl(record.id)
    const url = new URL(response.data, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) {
      message.error('下载地址无效')
      return
    }
    const link = document.createElement('a')
    link.href = url.href
    link.rel = 'noopener noreferrer'
    link.target = '_blank'
    link.click()
  } catch {
    /* 下载属于读取，由业务请求层处理权限错误。 */
  } finally {
    downloadingId.value = ''
  }
}

const handleDelete = async (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value || record.writable === false || record.builtIn || deletingId.value) return
  deletingId.value = record.id
  try {
    await deleteKnowledgeDocument(record.id)
    message.success('资料已删除')
    if (tableData.value.length === 1 && query.current > 1) query.current--
    await getList()
  } catch {
    /* 请求层提示错误。 */
  } finally {
    deletingId.value = ''
  }
}

const confirmDelete = (record: KnowledgeDocumentRecord) => {
  const name = record.documentName || record.originalFilename || '未命名资料'
  Modal.confirm({
    title: '确定删除该资料？',
    content: `资料“${name}”删除后原件将被彻底删除且不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await handleDelete(record)
    },
  })
}

onMounted(() => {
  void getFolders()
})

onBeforeUnmount(() => {
  listToken++
  folderToken++
})
</script>

<style scoped>
.knowledge-document-page {
  display: flex;
  height: 100%;
  gap: var(--du-space-3);
  overflow: hidden;
}

.folder-sidebar {
  width: 220px;
  min-width: 180px;
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
  background: var(--du-bg-subtle);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--du-text);
}

.tree-search {
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border-subtle);
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--du-space-2);
}

.folder-node-title {
  display: flex;
  align-items: center;
  gap: var(--du-space-1);
  font-size: 12px;
  overflow: hidden;
}

.folder-icon {
  font-size: 12px;
  color: var(--du-text-secondary);
  flex-shrink: 0;
}

.folder-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
  gap: var(--du-space-2);
  flex-wrap: wrap;
}

.filters {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  flex-wrap: wrap;
}

.current-folder-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--du-space-1);
  height: 30px;
  padding: 0 10px;
  background: var(--du-bg-subtle);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  font-size: 12px;
  color: var(--du-text);
  max-width: 180px;
}

.folder-badge-icon {
  color: var(--du-primary-color, #2563eb);
  font-size: 12px;
  flex-shrink: 0;
}

.folder-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.keyword-input {
  width: 180px;
}

.status-select {
  width: 120px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.document-name-cell-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.document-name-cell-wrap :deep(.document-name-cell) {
  flex: 1;
  min-width: 0;
}

.document-type-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.document-name-cell {
  font-size: 12px;
  font-weight: 400;
}

.file-size-cell,
.create-time-cell {
  font-size: 11px;
}

.text-secondary {
  color: var(--du-text-secondary);
  font-size: 12px;
}

.readonly-label {
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
  line-height: 24px;
}

.empty-tree {
  margin: var(--du-space-4) 0;
}

.more-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.more-action-icon {
  font-size: 9px;
  margin-left: 1px;
}
</style>
