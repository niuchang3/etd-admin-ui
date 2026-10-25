<template>
  <div class="workspace-document-view">
    <!-- 主体区域：左侧分类树 + 右侧文档表格 -->
    <div class="document-main-layout">
      <!-- 左侧分类树 -->
      <aside class="folder-sidebar du-panel">
        <div class="sidebar-header">
          <span class="sidebar-title">
            <FolderOutlined />知识分类
          </span>
          <div class="sidebar-actions">
            <a-tooltip v-if="canWrite && kb?.writable !== false" title="新建根分类">
              <a-button type="text" size="small" @click="handleCreateRootFolder">
                <PlusOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="刷新分类">
              <a-button type="text" size="small" :loading="foldersLoading" @click="getFolders">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>

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
                <div class="folder-node-row">
                  <span class="folder-node-title" :title="node.title">
                    <FolderOutlined class="folder-icon" />
                    <span class="folder-text">{{ node.title }}</span>
                  </span>
                  <div
                    v-if="canWrite && kb?.writable !== false"
                    class="folder-node-actions"
                    @click.stop
                  >
                    <a-tooltip title="添加子分类">
                      <PlusOutlined class="action-icon" @click="handleAddChildFolder(node)" />
                    </a-tooltip>
                    <a-tooltip title="编辑分类">
                      <EditOutlined class="action-icon" @click="handleEditFolder(node)" />
                    </a-tooltip>
                    <a-popconfirm
                      title="确定删除此分类？"
                      ok-text="删除"
                      cancel-text="取消"
                      ok-type="danger"
                      @confirm="handleDeleteFolder(node)"
                    >
                      <DeleteOutlined class="action-icon delete-icon" />
                    </a-popconfirm>
                  </div>
                </div>
              </template>
            </a-tree>
            <div v-else class="empty-folder-wrap">
              <a-empty description="暂无分类" class="empty-tree" />
              <a-button
                v-if="canWrite && kb?.writable !== false"
                type="dashed"
                size="small"
                class="add-first-folder-btn"
                @click="handleCreateRootFolder"
              >
                <PlusOutlined />新建根分类
              </a-button>
            </div>
          </a-spin>
        </div>
      </aside>

      <!-- 右侧文档列表面板 -->
      <div class="du-panel table-panel main-panel">
        <header class="page-toolbar">
          <div class="filters">
            <span class="current-folder-badge" :title="selectedFolder?.folderName || '全部资料'">
              <FolderOutlined class="folder-badge-icon" />
              <span class="folder-badge-text">{{ selectedFolder?.folderName || '全部资料' }}</span>
              <CloseCircleOutlined
                v-if="selectedFolderId"
                class="clear-folder-icon"
                title="清除分类筛选"
                @click="selectedFolderId = null; handleSearch()"
              />
            </span>

            <a-input
              v-model:value="query.keyword"
              placeholder="搜索文档名称"
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

            <a-select
              v-model:value="query.dataStatus"
              :options="dataStatusOptions"
              allow-clear
              placeholder="启用状态"
              class="status-select"
              @change="handleSearch"
            />

            <a-button type="primary" :loading="loading" @click="handleSearch">
              <SearchOutlined />查询
            </a-button>
            <a-button @click="handleReset">重置</a-button>
          </div>

          <div class="toolbar-actions">
            <a-button
              v-if="canWrite && kb?.writable !== false"
              type="primary"
              :disabled="!selectedFolderId && !folders.length"
              @click="handleAddDoc"
            >
              <UploadOutlined />上传文档
            </a-button>
          </div>
        </header>

        <!-- 表格：严格齐平 34px 行高规范，二元状态 Switch 采用标准 22px 尺寸 -->
        <a-table
          :columns="columns"
          :data-source="tableData"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          size="small"
          :scroll="{ x: 1330 }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <!-- 资料名称 -->
            <div v-if="column.key === 'documentName'" class="document-name-cell-wrap">
              <FileTypeIcon :file-type="record.fileType" class="document-type-icon" />
              <EllipsisText :text="record.documentName" class="document-name-cell" />
            </div>

            <!-- 原始文件名 -->
            <EllipsisText
              v-else-if="column.key === 'originalFilename'"
              :text="record.originalFilename || '—'"
              class="text-secondary"
            />

            <!-- 文件大小 -->
            <span v-else-if="column.key === 'fileSize'" class="du-mono file-size-cell">
              {{ formatFileSize(record.fileSize) }}
            </span>

            <!-- 公开状态 -->
            <span v-else-if="column.key === 'isPublic'">
              <a-tag :color="record.isPublic ? 'blue' : 'default'">
                {{ record.isPublic ? '共享' : '私有' }}
              </a-tag>
            </span>

            <!-- 上传状态 -->
            <DictTag
              v-else-if="column.key === 'uploadStatus'"
              :type-code="KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS"
              :value="record.uploadStatus"
              :title="record.uploadErrorMessage || undefined"
            />

            <!-- 分片状态 -->
            <DictTag
              v-else-if="column.key === 'chunkStatus'"
              :type-code="KNOWLEDGE_DICT_TYPE.CHUNK_STATUS"
              :value="record.chunkStatus || KNOWLEDGE_CHUNK_STATUS.UNPROCESSED"
            />

            <!-- 向量状态：独立展示，不与其他状态相互推断 -->
            <template v-else-if="column.key === 'vectorStatus'">
              <DictTag
                v-if="record.vectorStatus"
                :type-code="KNOWLEDGE_DICT_TYPE.VECTOR_STATUS"
                :value="record.vectorStatus"
              />
              <span v-else class="text-secondary">—</span>
            </template>

            <!-- 分片数量 -->
            <span v-else-if="column.key === 'chunkCount'" class="du-mono chunk-count-cell">
              {{ record.chunkCount ?? 0 }}
            </span>

            <!-- 启用/停用 Switch (二元状态控制，使用标准尺寸 a-switch，禁止 size="small") -->
            <div v-else-if="column.key === 'dataStatus'" class="status-switch-cell">
              <a-switch
                :checked="record.dataStatus === COMMON_STATUS.ENABLED"
                :loading="statusChangingId === record.id"
                :disabled="!canWrite || kb?.writable === false || record.writable === false || record.builtIn"
                checked-children="启用"
                un-checked-children="停用"
                @change="handleToggleStatus(record)"
              />
            </div>

            <!-- 创建时间 -->
            <span v-else-if="column.key === 'createTime'" class="create-time-cell du-mono">
              {{ record.createTime || '—' }}
            </span>

            <!-- 表格操作列：24px 小型 Link 按钮，遵循收敛规范与安全防重叠宽度 -->
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
              <template v-if="canWrite && kb?.writable !== false">
                <span v-if="record.builtIn" class="readonly-label">内置只读</span>
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
                          <span>删除文档</span>
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
            <a-empty :description="selectedFolderId ? '当前分类暂无符合条件的文档' : '暂无文档'">
              <a-button
                v-if="canWrite && kb?.writable !== false"
                type="primary"
                @click="handleAddDoc"
              >
                上传第一篇文档
              </a-button>
            </a-empty>
          </template>
        </a-table>
      </div>
    </div>

    <!-- 文档编辑/移动弹窗 -->
    <KnowledgeDocumentFormModal
      v-model:open="docFormOpen"
      :record="currentDocRecord"
      :folders="folders"
      :move-only="moveOnly"
      @success="getDocuments"
    />

    <!-- 文档上传弹窗 -->
    <KnowledgeUploadModal
      v-model:open="uploadModalOpen"
      :record="uploadRecord"
      :folder="selectedFolder || folders[0] || null"
      :folders="folders"
      :knowledge-base-id="knowledgeBaseId"
      :default-is-public="kb?.isPublic ?? false"
      @success="getDocuments"
    />

    <!-- 分类新建/编辑弹窗 -->
    <KnowledgeFolderModal
      v-model:open="folderModalOpen"
      :knowledge-base-id="knowledgeBaseId"
      :folder-tree="folderTree"
      :editing-record="editingFolder"
      :default-parent-id="defaultParentFolderId"
      @success="getFolders"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal, type TableColumnsType } from 'ant-design-vue'
import {
  CloseCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'
import {
  deleteKnowledgeFolder,
  getKnowledgeFolderList,
} from '@/apis/ai/folder'
import type {
  KnowledgeFolderRecord,
} from '@/apis/ai/folder/type'
import {
  deleteKnowledgeDocument,
  getKnowledgeDocumentPage,
  getKnowledgeDownloadUrl,
  updateKnowledgeDocumentStatus,
} from '@/apis/ai/document'
import type {
  KnowledgeDocumentQuery,
  KnowledgeDocumentRecord,
} from '@/apis/ai/document/type'
import {
  COMMON_STATUS,
  KNOWLEDGE_CHUNK_STATUS,
  KNOWLEDGE_DICT_TYPE,
  KNOWLEDGE_UPLOAD_STATUS as UPLOAD,
} from '@/constant'
import { useSystemDict } from '@/composables/useSystemDict'
import { formatFileSize } from '@/utils/format'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import FileTypeIcon from '@/views/ai/knowledge-document/components/FileTypeIcon.vue'
import KnowledgeDocumentFormModal from '@/views/ai/knowledge-document/components/KnowledgeDocumentFormModal.vue'
import KnowledgeUploadModal from '@/views/ai/knowledge-document/components/KnowledgeUploadModal.vue'
import KnowledgeFolderModal from './KnowledgeFolderModal.vue'
import {
  canResumeUpload,
  getFolderAndDescendantIds,
  getFolderTree,
} from '@/views/ai/knowledge-document/helper'

const props = defineProps<{
  knowledgeBaseId: string
}>()

const router = useRouter()
const currentMenus = menusStore()
const kbStore = useKnowledgeBaseStore()

const kb = computed(() => kbStore.currentKb)
const canWrite = computed(() => currentMenus.canWritePath('/ai/knowledge-bases'))

const { getOptions } = useSystemDict([
  KNOWLEDGE_DICT_TYPE.UPLOAD_STATUS,
  KNOWLEDGE_DICT_TYPE.CHUNK_STATUS,
])

// 分片状态下拉选项
const chunkStatusOptions = [
  { label: '未分片', value: KNOWLEDGE_CHUNK_STATUS.UNPROCESSED },
  { label: '生成中', value: KNOWLEDGE_CHUNK_STATUS.GENERATING },
  { label: '草稿', value: KNOWLEDGE_CHUNK_STATUS.DRAFT },
  { label: '已确认', value: KNOWLEDGE_CHUNK_STATUS.CONFIRMED },
  { label: '失败', value: KNOWLEDGE_CHUNK_STATUS.FAILED },
]

// 启停状态下拉选项
const dataStatusOptions = [
  { label: '启用', value: COMMON_STATUS.ENABLED },
  { label: '禁用', value: COMMON_STATUS.DISABLED },
]

// 分类目录相关状态
const folders = ref<KnowledgeFolderRecord[]>([])
const foldersLoading = ref(false)
const folderSearch = ref('')
const selectedFolderId = ref<string | null>(null)
const folderModalOpen = ref(false)
const editingFolder = ref<KnowledgeFolderRecord | null>(null)
const defaultParentFolderId = ref<string | null>(null)

// 文档列表相关状态
const loading = ref(false)
const total = ref(0)
const tableData = ref<KnowledgeDocumentRecord[]>([])
const downloadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const statusChangingId = ref<string | null>(null)

// 弹窗状态
const docFormOpen = ref(false)
const currentDocRecord = ref<KnowledgeDocumentRecord | null>(null)
const moveOnly = ref(false)

const uploadModalOpen = ref(false)
const uploadRecord = ref<KnowledgeDocumentRecord | null>(null)

const query = reactive<KnowledgeDocumentQuery>({
  knowledgeBaseId: props.knowledgeBaseId,
  current: 1,
  size: 10,
  keyword: '',
  uploadStatus: undefined,
  chunkStatus: undefined,
  dataStatus: undefined,
})

const pagination = computed(() => ({
  current: query.current,
  pageSize: query.size,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `共 ${t} 篇文档`,
  size: 'small',
}))

const folderTree = computed(() => getFolderTree(folders.value as any) as any[])

const filteredFolderTree = computed(() => {
  const kw = folderSearch.value.trim().toLowerCase()
  if (!kw) return folderTree.value
  const filterNodes = (nodes: any[]): any[] => {
    return nodes
      .map((node) => {
        const titleMatch = String(node.title || '').toLowerCase().includes(kw)
        const filteredChildren = node.children ? filterNodes(node.children) : []
        if (titleMatch || filteredChildren.length) {
          return { ...node, children: filteredChildren }
        }
        return null
      })
      .filter(Boolean)
  }
  return filterNodes(folderTree.value)
})

const selectedFolder = computed(() => {
  if (!selectedFolderId.value) return null
  return folders.value.find((f) => String(f.id) === String(selectedFolderId.value)) || null
})

// 表格列定义：紧凑、单行化、行高 34px
const columns: TableColumnsType<KnowledgeDocumentRecord> = [
  {
    title: '文档名称',
    dataIndex: 'documentName',
    key: 'documentName',
    width: 220,
    ellipsis: true,
  },
  {
    title: '原始文件名',
    dataIndex: 'originalFilename',
    key: 'originalFilename',
    width: 160,
    ellipsis: true,
  },
  {
    title: '文件大小',
    dataIndex: 'fileSize',
    key: 'fileSize',
    width: 90,
    align: 'right',
  },
  {
    title: '公开状态',
    dataIndex: 'isPublic',
    key: 'isPublic',
    width: 80,
    align: 'center',
  },
  {
    title: '上传状态',
    dataIndex: 'uploadStatus',
    key: 'uploadStatus',
    width: 90,
    align: 'center',
  },
  {
    title: '分片状态',
    dataIndex: 'chunkStatus',
    key: 'chunkStatus',
    width: 90,
    align: 'center',
  },
  {
    title: '向量状态',
    dataIndex: 'vectorStatus',
    key: 'vectorStatus',
    width: 90,
    align: 'center',
  },
  {
    title: '分片数',
    dataIndex: 'chunkCount',
    key: 'chunkCount',
    width: 70,
    align: 'right',
  },
  {
    title: '检索启停',
    dataIndex: 'dataStatus',
    key: 'dataStatus',
    width: 90,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 140,
    align: 'center',
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
]

// 加载分类目录
const getFolders = async () => {
  foldersLoading.value = true
  try {
    const res = await getKnowledgeFolderList({ knowledgeBaseId: props.knowledgeBaseId })
    const raw = res.data as any
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.records) ? raw.records : [])
    folders.value = list
  } finally {
    foldersLoading.value = false
  }
}

// 加载文档列表
const getDocuments = async () => {
  loading.value = true
  try {
    query.knowledgeBaseId = props.knowledgeBaseId
    // 若选中了分类，传入该分类及其所有子孙分类 ID
    if (selectedFolderId.value) {
      query.folderId = selectedFolderId.value
      query.folderIds = getFolderAndDescendantIds(selectedFolderId.value, folders.value as any)
    } else {
      delete query.folderId
      delete query.folderIds
    }

    const res = await getKnowledgeDocumentPage(query)
    const data = res.data
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } finally {
    loading.value = false
  }
}

const handleFolderSelect = (keys: any[]) => {
  const nextKey = keys[0] ? String(keys[0]) : null
  selectedFolderId.value = nextKey === selectedFolderId.value ? null : nextKey
  query.current = 1
  void getDocuments()
}

const handleCreateRootFolder = () => {
  editingFolder.value = null
  defaultParentFolderId.value = null
  folderModalOpen.value = true
}

const handleAddChildFolder = (node: any) => {
  editingFolder.value = null
  defaultParentFolderId.value = String(node.id || node.key)
  folderModalOpen.value = true
}

const handleEditFolder = (node: any) => {
  const target = folders.value.find((f) => String(f.id) === String(node.id || node.key))
  if (target) {
    editingFolder.value = target
    folderModalOpen.value = true
  }
}

const handleDeleteFolder = async (node: any) => {
  const folderId = String(node.id || node.key)
  try {
    await deleteKnowledgeFolder(folderId)
    message.success('分类已删除')
    if (selectedFolderId.value === folderId) {
      selectedFolderId.value = null
    }
    await getFolders()
    await getDocuments()
  } catch (err: any) {
    message.error(err?.message || '删除分类失败')
  }
}

const handleSearch = () => {
  query.current = 1
  void getDocuments()
}

const handleReset = () => {
  query.keyword = ''
  query.uploadStatus = undefined
  query.chunkStatus = undefined
  query.dataStatus = undefined
  query.current = 1
  void getDocuments()
}

const handleTableChange = (pag: any) => {
  query.current = pag.current || 1
  query.size = pag.pageSize || 10
  void getDocuments()
}

// 切换文档启用/停用状态
const handleToggleStatus = async (record: KnowledgeDocumentRecord) => {
  const nextStatus = record.dataStatus === COMMON_STATUS.ENABLED
    ? COMMON_STATUS.DISABLED
    : COMMON_STATUS.ENABLED

  statusChangingId.value = record.id
  try {
    await updateKnowledgeDocumentStatus(record.id, {
      version: record.version,
      dataStatus: nextStatus,
    })
    record.dataStatus = nextStatus
    message.success(`文档已${nextStatus === COMMON_STATUS.ENABLED ? '启用' : '禁用'}`)
  } catch (err: any) {
    message.error(err?.message || '状态切换失败')
  } finally {
    statusChangingId.value = null
  }
}

const handleAddDoc = () => {
  uploadRecord.value = null
  uploadModalOpen.value = true
}

const handleResume = (record: KnowledgeDocumentRecord) => {
  uploadRecord.value = record
  uploadModalOpen.value = true
}

const handleEdit = (record: KnowledgeDocumentRecord) => {
  currentDocRecord.value = record
  moveOnly.value = false
  docFormOpen.value = true
}

const handleMove = (record: KnowledgeDocumentRecord) => {
  currentDocRecord.value = record
  moveOnly.value = true
  docFormOpen.value = true
}

const handleDelete = async (record: KnowledgeDocumentRecord) => {
  deletingId.value = record.id
  try {
    await deleteKnowledgeDocument(record.id)
    message.success('文档已删除')
    if (tableData.value.length === 1 && (query.current || 1) > 1) {
      query.current = (query.current || 1) - 1
    }
    await getDocuments()
  } finally {
    deletingId.value = null
  }
}

const confirmDelete = (record: KnowledgeDocumentRecord) => {
  const name = record.documentName || record.originalFilename || '未命名文档'
  Modal.confirm({
    title: '确定删除该文档？',
    content: `文档“${name}”删除后原文件及分片数据将被彻底删除且不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await handleDelete(record)
    },
  })
}

const handleDownload = async (record: KnowledgeDocumentRecord) => {
  downloadingId.value = record.id
  try {
    const res = await getKnowledgeDownloadUrl(record.id)
    if (res.data) {
      window.open(res.data, '_blank')
    }
  } finally {
    downloadingId.value = null
  }
}

const handleManageChunks = (record: KnowledgeDocumentRecord) => {
  void router.push({
    path: `/ai/knowledge-documents/${record.id}/chunks`,
    query: { kbId: props.knowledgeBaseId },
  })
}

onMounted(() => {
  void getFolders()
  void getDocuments()
})

watch(
  () => props.knowledgeBaseId,
  (newId) => {
    if (newId) {
      query.knowledgeBaseId = newId
      selectedFolderId.value = null
      query.current = 1
      void getFolders()
      void getDocuments()
    }
  }
)
</script>

<style scoped>
.workspace-document-view {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-3, 10px);
  height: 100%;
}

.document-main-layout {
  display: flex;
  gap: var(--du-space-3, 10px);
  flex: 1;
  min-height: 0;
}

/* 左侧分类侧栏 */
.folder-sidebar {
  width: 240px;
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--du-border-color, #e2e8f0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--du-border-color, #e2e8f0);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--du-font-size-base, 12px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tree-search {
  padding: 6px 8px;
  border-bottom: 1px solid var(--du-border-color, #e2e8f0);
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: 6px 4px;
}

.folder-node-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
}

.folder-node-title {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--du-font-size-sm, 12px);
}

.folder-icon {
  color: #f59e0b;
}

.folder-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-node-actions {
  display: none;
  align-items: center;
  gap: 6px;
}

.folder-node-row:hover .folder-node-actions {
  display: flex;
}

.action-icon {
  font-size: 11px;
  color: var(--du-text-muted, #94a3b8);
  cursor: pointer;
  transition: color 120ms ease;
}

.action-icon:hover {
  color: var(--du-primary-color, #2563eb);
}

.delete-icon:hover {
  color: var(--du-color-danger, #ef4444);
}

.empty-folder-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.add-first-folder-btn {
  margin-top: 8px;
  font-size: 11px;
}

/* 右侧文档主面板 */
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--du-border-color, #e2e8f0);
  flex-wrap: wrap;
  gap: 8px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.current-folder-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  background: var(--du-bg-subtle, #f1f5f9);
  border: 1px solid var(--du-border-color, #cbd5e1);
  border-radius: var(--du-radius-sm, 3px);
  font-size: 12px;
  color: var(--du-text-primary, #1e293b);
  max-width: 140px;
}

.folder-badge-icon {
  color: #f59e0b;
}

.folder-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-folder-icon {
  color: var(--du-text-muted, #94a3b8);
  cursor: pointer;
  font-size: 12px;
}

.clear-folder-icon:hover {
  color: var(--du-text-primary, #0f172a);
}

.keyword-input {
  width: 180px;
}

.status-select {
  width: 110px;
}

.document-name-cell-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.document-type-icon {
  flex: 0 0 16px;
}

.document-name-cell {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: 400;
}

.text-secondary {
  color: var(--du-text-secondary, #64748b);
  font-size: var(--du-font-size-xs, 11px);
}

.file-size-cell,
.chunk-count-cell,
.create-time-cell {
  font-size: var(--du-font-size-xs, 11px);
}

.status-switch-cell {
  display: flex;
  justify-content: center;
  align-items: center;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  flex-wrap: nowrap;
  gap: 2px;
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
