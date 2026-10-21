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
          />
          <a-select
            v-model:value="query.processingStatus"
            :options="getOptions(KNOWLEDGE_DICT_TYPE.PROCESSING_STATUS)"
            allow-clear
            placeholder="处理状态"
            class="status-select"
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
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 资料名称：12px 常规字重平滑排版 -->
          <EllipsisText
            v-if="column.key === 'documentName'"
            :text="record.documentName"
            class="document-name-cell"
          />

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

          <!-- 上传状态：DictTag 统一 20px 高度微型标签 -->
          <DictTag
            v-else-if="column.key === 'uploadStatus'"
            :type-code="KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS"
            :value="record.uploadStatus"
            :title="record.uploadErrorMessage || undefined"
          />

          <!-- 处理状态：DictTag 统一 -->
          <DictTag
            v-else-if="column.key === 'processingStatus'"
            :type-code="KNOWLEDGE_DICT_TYPE.PROCESSING_STATUS"
            :value="record.processingStatus"
            :title="record.errorMessage || undefined"
          />

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
            <a-button type="link" size="small" @click="handleView(record)">
              分片
            </a-button>
            <template v-if="canWrite">
              <span v-if="record.builtIn" class="readonly-label">内置数据只读</span>
              <template v-else>
                <a-button
                  type="link"
                  size="small"
                  :disabled="!canResumeUpload(record)"
                  @click="handleResume(record)"
                >
                  续传
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  :disabled="processingBusy(record)"
                  @click="handleEdit(record)"
                >
                  配置
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  :disabled="processingBusy(record)"
                  @click="handleMove(record)"
                >
                  移动
                </a-button>
                <a-popconfirm
                  title="将删除原件、正文分片和向量，且无法恢复，确定删除？"
                  @confirm="handleDelete(record)"
                >
                  <a-button
                    type="link"
                    size="small"
                    danger
                    :disabled="processingBusy(record)"
                    :loading="deletingId === record.id"
                  >
                    删除
                  </a-button>
                </a-popconfirm>
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

    <KnowledgeDocumentFormModal v-model:open="formOpen" :record="currentRecord" :folders="folders" :move-only="moveOnly" @success="getList" />
    <KnowledgeUploadModal v-model:open="uploadOpen" :record="uploadRecord" :folder="selectedFolder" :folders="folders" @success="getList" />
    <KnowledgeDocumentPreviewDrawer v-model:open="previewOpen" :record="previewRecord" @success="getList" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType } from 'ant-design-vue'
import { FolderOutlined, ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { deleteKnowledgeDocument, getKnowledgeDocumentFolders, getKnowledgeDocumentPage, getKnowledgeDownloadUrl } from '@/apis/ai/document'
import type { KnowledgeDocumentFolder, KnowledgeDocumentQuery, KnowledgeDocumentRecord } from '@/apis/ai/document/type'
import { KNOWLEDGE_DICT_TYPE, KNOWLEDGE_UPLOAD_STATUS as UPLOAD } from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { useSystemConfigStore } from '@/stores/modules/config'
import { formatFileSize } from '@/utils/format'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import KnowledgeDocumentFormModal from './components/KnowledgeDocumentFormModal.vue'
import KnowledgeUploadModal from './components/KnowledgeUploadModal.vue'
import KnowledgeDocumentPreviewDrawer from './components/KnowledgeDocumentPreviewDrawer.vue'
import { canResumeUpload, canUseFolder, getFolderAndDescendantIds, getFolderTree, processingBusy } from './helper'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getOptions } = useSystemDict(Object.values(KNOWLEDGE_DICT_TYPE))
const configStore = useSystemConfigStore()
const query = reactive<KnowledgeDocumentQuery>({ current: 1, size: configStore.resource?.pagination?.defaultSize || 10 })
const tableData = ref<KnowledgeDocumentRecord[]>([])
const total = ref(0)
const loading = ref(false)
const foldersLoading = ref(false)
const folders = ref<KnowledgeDocumentFolder[]>([])
const folderSearch = ref('')
const selectedFolderId = ref('')
const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null)
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
const previewOpen = ref(false)
const moveOnly = ref(false)
const currentRecord = ref<KnowledgeDocumentRecord | null>(null)
const uploadRecord = ref<KnowledgeDocumentRecord | null>(null)
const previewRecord = ref<KnowledgeDocumentRecord | null>(null)
const downloadingId = ref('')
const deletingId = ref('')

const columns: TableColumnsType<KnowledgeDocumentRecord> = [
  { title: '资料名称', key: 'documentName', width: 200, ellipsis: true },
  { title: '原始文件名', key: 'originalFilename', width: 170, ellipsis: true },
  { title: '大小', key: 'fileSize', width: 90 },
  { title: '上传状态', key: 'uploadStatus', width: 110, ellipsis: true },
  { title: '处理状态', key: 'processingStatus', width: 110, ellipsis: true },
  { title: '创建时间', key: 'createTime', width: 190, ellipsis: true },
  { title: '操作', key: 'actions', width: 330, fixed: 'right', align: 'right' },
]

const pagination = computed(() => ({
  current: query.current, pageSize: query.size, total: total.value, showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100', '200'].filter((size) => Number(size) <= (configStore.resource?.pagination?.maxSize || 200)),
  showTotal: (count: number) => `共 ${count} 条`,
}))

let listToken = 0
let folderToken = 0
let timer: ReturnType<typeof setTimeout> | undefined

const getList = async () => {
  clearTimeout(timer)
  const token = ++listToken
  if (!selectedFolderId.value) { tableData.value = []; total.value = 0; loading.value = false; return }
  loading.value = true
  try {
    const targetFolderIds = getFolderAndDescendantIds(selectedFolderId.value, folders.value)
    const response = await getKnowledgeDocumentPage({
      ...query,
      folderId: selectedFolderId.value,
      folderIds: targetFolderIds.length > 0 ? targetFolderIds : [selectedFolderId.value],
      keyword: query.keyword?.trim() || undefined,
    })
    if (token !== listToken) return
    tableData.value = response.data.records || []; total.value = response.data.total
    if (tableData.value.some((record) => processingBusy(record) || record.uploadStatus === UPLOAD.COMPLETING || record.uploadStatus === UPLOAD.INITIALIZING)) {
      timer = setTimeout(() => { void getList() }, 5000)
    }
  } catch { /* 请求层提示，保留当前筛选，允许重试。 */ }
  finally { if (token === listToken) loading.value = false }
}

const getFolders = async () => {
  const token = ++folderToken
  foldersLoading.value = true
  try {
    const response = await getKnowledgeDocumentFolders()
    if (token !== folderToken) return
    folders.value = response.data || []
    if (!folders.value.some((folder) => folder.id === selectedFolderId.value)) {
      selectedFolderId.value = folders.value.find((folder) => !folder.navigationOnly)?.id || folders.value[0]?.id || ''
      query.current = 1; tableData.value = []; total.value = 0
    }
    await getList()
  } catch { /* 不依赖分类维护菜单。 */ }
  finally { if (token === folderToken) foldersLoading.value = false }
}

const handleFolderSelect = (keys: (string | number)[]) => {
  if (!keys.length) return
  selectedFolderId.value = String(keys[0]); query.current = 1; tableData.value = []; total.value = 0
  void getList()
}

const handleSearch = () => { query.current = 1; void getList() }
const handleReset = () => { query.keyword = undefined; query.uploadStatus = undefined; query.processingStatus = undefined; handleSearch() }
const handleTableChange = (page: { current?: number; pageSize?: number }) => {
  query.current = page.current || 1; query.size = Math.min(page.pageSize || 10, configStore.resource?.pagination?.maxSize || 200); void getList()
}

const handleAdd = () => {
  if (!canWrite.value) return
  if (!canUpload.value) return
  uploadRecord.value = null; uploadOpen.value = true
}

const handleResume = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value) return
  if (record.builtIn || !canResumeUpload(record)) return
  uploadRecord.value = record; uploadOpen.value = true
}

const handleEdit = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value) return
  if (record.builtIn || processingBusy(record)) return
  currentRecord.value = record; moveOnly.value = false; formOpen.value = true
}

const handleMove = (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value) return
  if (record.builtIn || processingBusy(record)) return
  currentRecord.value = record; moveOnly.value = true; formOpen.value = true
}

const handleView = (record: KnowledgeDocumentRecord) => { previewRecord.value = record; previewOpen.value = true }

const handleDownload = async (record: KnowledgeDocumentRecord) => {
  if (record.uploadStatus !== UPLOAD.COMPLETED || downloadingId.value) return
  downloadingId.value = record.id
  try {
    const response = await getKnowledgeDownloadUrl(record.id)
    const url = new URL(response.data, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) { message.error('下载地址无效'); return }
    const link = document.createElement('a')
    link.href = url.href; link.rel = 'noopener noreferrer'; link.target = '_blank'; link.click()
  } catch { /* 下载属于读取，由业务请求层处理权限错误。 */ }
  finally { downloadingId.value = '' }
}

const handleDelete = async (record: KnowledgeDocumentRecord) => {
  if (!canWrite.value) return
  if (record.builtIn || processingBusy(record) || deletingId.value) return
  deletingId.value = record.id
  try {
    await deleteKnowledgeDocument(record.id)
    message.success('资料原件、正文分片及向量已删除')
    if (tableData.value.length === 1 && query.current > 1) query.current--
    await getList()
  } catch { /* 请求层提示错误。 */ }
  finally { deletingId.value = '' }
}

onMounted(() => { void getFolders() })
onBeforeUnmount(() => { clearTimeout(timer); listToken++; folderToken++ })
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
  border-bottom: 1px solid var(--du-border);
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: var(--du-space-2);
}

.folder-node-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 155px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--du-font-size-sm, 12px);
}

.folder-icon {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text-muted);
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
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--du-space-2);
}

.current-folder-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-subtle);
  border: 1px solid var(--du-border);
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
  max-width: 200px;
}

.folder-badge-icon {
  color: #2563eb;
  font-size: 12px;
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

.document-name-cell {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-normal, 400);
  color: var(--du-text);
}

.file-size-cell {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
}

.text-secondary {
  color: var(--du-text-secondary);
  font-size: var(--du-font-size-sm, 12px);
}

.create-time-cell {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
  font-family: var(--du-font-mono);
}

.readonly-label {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  white-space: nowrap;
}

.empty-tree {
  margin-top: 30px;
}
</style>

