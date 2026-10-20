<template>
  <section class="management-page knowledge-document-page">
    <aside class="du-panel folder-sidebar">
      <header class="folder-header"><FolderOutlined />分类目录<a-button type="text" size="small" :loading="foldersLoading" @click="getFolders"><ReloadOutlined /></a-button></header>
      <a-spin :spinning="foldersLoading">
        <a-tree v-if="folderTree.length" :tree-data="folderTree" :selected-keys="selectedFolderId ? [selectedFolderId] : []"
          block-node default-expand-all @select="handleFolderSelect" />
        <a-empty v-else description="暂无可见目录" />
      </a-spin>
    </aside>
    <div class="du-panel table-panel main-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input v-model:value="query.keyword" placeholder="资料名称" :maxlength="255" allow-clear class="keyword-input" @press-enter="handleSearch" />
          <a-select v-model:value="query.uploadStatus" :options="getOptions(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS)" allow-clear placeholder="上传状态" class="status-select" />
          <a-select v-model:value="query.processingStatus" :options="getOptions(KNOWLEDGE_DICT_TYPE.PROCESSING_STATUS)" allow-clear placeholder="处理状态" class="status-select" />
          <a-button type="primary" :loading="loading" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="handleReset">重置</a-button>
        </div>
        <a-button v-if="canWrite" type="primary" :disabled="!canUpload" @click="handleAdd"><UploadOutlined />上传资料</a-button>
      </header>
      <div class="scope-bar">
        <span>{{ selectedFolder?.folderName || '请选择分类目录' }}</span>
        <span v-if="selectedFolder?.navigationOnly" class="hint">导航节点仅供浏览，请选择有权限的子目录上传。</span>
        <span v-else class="hint">上传完成 ≠ 可检索，请完成配置、解析与分片确认。</span>
      </div>
      <a-table :columns="columns" :data-source="tableData" :loading="loading" :pagination="pagination" row-key="id"
        size="small" :scroll="{ x: 1200 }" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <EllipsisText v-if="column.key === 'documentName'" :text="record.documentName" />
          <span v-else-if="column.key === 'fileSize'" class="du-mono">{{ formatFileSize(record.fileSize) }}</span>
          <span v-else-if="column.key === 'uploadStatus'" :title="record.uploadErrorMessage || undefined">
            {{ getLabel(KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS, record.uploadStatus) }}
          </span>
          <span v-else-if="column.key === 'processingStatus'" :title="record.errorMessage || undefined">
            {{ getLabel(KNOWLEDGE_DICT_TYPE.PROCESSING_STATUS, record.processingStatus) }}
          </span>
          <span v-else-if="column.key === 'createTime'" class="time-cell du-mono">{{ record.createTime || '—' }}</span>
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button type="link" size="small" :loading="downloadingId === record.id" :disabled="record.uploadStatus !== UPLOAD.COMPLETED" @click="handleDownload(record)">下载</a-button>
            <a-button type="link" size="small" @click="handleView(record)">分片</a-button>
            <template v-if="canWrite">
              <span v-if="record.builtIn" class="readonly-label">内置数据只读</span>
              <template v-else>
                <a-button type="link" size="small" :disabled="!canResumeUpload(record)" @click="handleResume(record)">续传</a-button>
                <a-button type="link" size="small" :disabled="processingBusy(record)" @click="handleEdit(record)">配置</a-button>
                <a-button type="link" size="small" :disabled="processingBusy(record)" @click="handleMove(record)">移动</a-button>
                <a-popconfirm title="将删除原件、正文分片和向量，且无法恢复，确定删除？" @confirm="handleDelete(record)">
                  <a-button type="link" size="small" danger :disabled="processingBusy(record)" :loading="deletingId === record.id">删除</a-button>
                </a-popconfirm>
              </template>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>
        <template #emptyText>
          <a-empty :description="selectedFolderId ? '当前目录暂无符合条件的资料' : '请先选择左侧分类目录'">
            <a-button v-if="canWrite && canUpload" type="primary" @click="handleAdd">上传第一份资料</a-button>
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
import KnowledgeDocumentFormModal from './components/KnowledgeDocumentFormModal.vue'
import KnowledgeUploadModal from './components/KnowledgeUploadModal.vue'
import KnowledgeDocumentPreviewDrawer from './components/KnowledgeDocumentPreviewDrawer.vue'
import { canResumeUpload, canUseFolder, getFolderTree, processingBusy } from './helper'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { getOptions, getLabel } = useSystemDict(Object.values(KNOWLEDGE_DICT_TYPE))
const configStore = useSystemConfigStore()
const query = reactive<KnowledgeDocumentQuery>({ current: 1, size: configStore.resource?.pagination?.defaultSize || 10 })
const tableData = ref<KnowledgeDocumentRecord[]>([])
const total = ref(0)
const loading = ref(false)
const foldersLoading = ref(false)
const folders = ref<KnowledgeDocumentFolder[]>([])
const selectedFolderId = ref('')
const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null)
const folderTree = computed(() => getFolderTree(folders.value))
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
  { title: '资料名称', dataIndex: 'documentName', key: 'documentName', width: 200, ellipsis: true },
  { title: '原始文件名', dataIndex: 'originalFilename', width: 170, ellipsis: true },
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
    const response = await getKnowledgeDocumentPage({ ...query, folderId: selectedFolderId.value, keyword: query.keyword?.trim() || undefined })
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
.knowledge-document-page { display: flex; height: 100%; gap: var(--du-space-3); overflow: hidden; }
.folder-sidebar { width: 230px; min-width: 180px; flex-shrink: 0; overflow: auto; }
.folder-header { display: flex; align-items: center; gap: var(--du-space-2); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); font-size: var(--du-font-size-md); }
.folder-header .ant-btn { margin-left: auto; }
.main-panel { flex: 1; min-width: 0; overflow: auto; }
.page-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--du-space-2); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--du-space-2); }
.keyword-input { width: 180px; }
.status-select { width: 120px; }
.scope-bar { display: flex; flex-wrap: wrap; gap: var(--du-space-3); align-items: center; padding: var(--du-space-2) var(--du-space-3); }
.hint, .readonly-label { color: var(--du-text-muted); font-size: var(--du-font-size-xs); line-height: 24px; }
.time-cell { font-size: var(--du-font-size-xs); }
.row-actions { white-space: nowrap; flex-wrap: nowrap; gap: 2px; }
</style>
