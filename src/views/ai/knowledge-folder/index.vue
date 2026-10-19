<template>
  <!-- 知识库分类目录管理主页面（部门独立分类树维护） -->
  <section class="management-page knowledge-folder-page">
    <!-- 左侧：全局通用部门组织架构树组件 -->
    <OrgSidebar
      v-model:selected-org-id="selectedOrgId"
      title="部门架构"
      all-node-text="全部可见目录"
      all-node-icon="folder"
      @select="handleOrgSelect"
      @loaded="handleOrgTreeLoaded"
    />

    <!-- 右侧：当前所选部门或全部可见目录树 -->
    <div class="du-panel table-panel main-panel">
      <!-- 页面顶部工具栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <span class="current-org-badge" :title="currentScopeTitle">
            <ApartmentOutlined class="org-badge-icon" />
            <span class="org-badge-text">{{ currentScopeTitle }}</span>
          </span>

          <a-select
            v-model:value="selectedDataStatus"
            :options="statusOptions"
            allow-clear
            class="status-select"
            placeholder="状态"
            style="width: 110px"
            @change="handleStatusChange"
          />

          <a-button
            type="primary"
            :loading="loading"
            @click="handleRefresh"
          >
            <ReloadOutlined />刷新
          </a-button>
        </div>

        <div class="toolbar-actions">
          <a-button
            v-if="canWrite"
            type="primary"
            @click="openCreate(null)"
          >
            <PlusOutlined />新建顶级分类
          </a-button>
        </div>
      </header>

      <!-- 分类目录树表格：行高严格锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="folderTreeData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ x: 1090 }"
      >
        <template #bodyCell="{ column, record }">
          <!-- 分类名称 -->
          <span v-if="column.key === 'folderName'" class="folder-name-cell">
            <FolderOutlined style="margin-right: 6px; color: #2563eb; flex-shrink: 0;" />
            <EllipsisText :text="record.folderName" max-width="190px" />
          </span>

          <!-- 所属部门（通过 orgId 关联展示部门名称） -->
          <EllipsisText
            v-else-if="column.key === 'orgId'"
            :text="getOrgName(record.orgId)"
            max-width="130px"
          />

          <!-- 分类描述说明 -->
          <EllipsisText
            v-else-if="column.key === 'description'"
            :text="record.description || '—'"
            max-width="220px"
          />

          <!-- 排序 -->
          <span v-else-if="column.key === 'sortOrder'" class="du-mono">
            {{ record.sortOrder }}
          </span>

          <!-- 状态（复用 common_status 字典，仅展示） -->
          <DictTag
            v-else-if="column.key === 'dataStatus'"
            type-code="common_status"
            :value="record.dataStatus"
            :color-map="{ '1': 'green', '0': 'default' }"
          />

          <!-- 更新时间 -->
          <span v-else-if="column.key === 'updateTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.updateTime) }}
          </span>

          <!-- 操作列：同时遵循 canWrite、writable、navigationOnly 状态 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <!-- navigationOnly=true 的节点仅用于补齐祖先路径，不允许操作 -->
              <span
                v-if="record.navigationOnly"
                class="readonly-label navigation-label"
                title="用于补齐祖先路径的导航节点，不可操作"
              >
                导航节点
              </span>
              <!-- writable=false 的节点无写操作权限 -->
              <span
                v-else-if="!record.writable"
                class="readonly-label"
                title="无该目录的写操作权限"
              >
                只读
              </span>
              <template v-else>
                <a-button type="link" size="small" @click="openCreate(record)">
                  <PlusOutlined />添加子分类
                </a-button>
                <a-button type="link" size="small" @click="openEdit(record)">
                  <EditOutlined />编辑
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  danger
                  :loading="deletingId === String(record.id)"
                  :disabled="deletingId === String(record.id)"
                  @click="confirmDelete(record)"
                >
                  <DeleteOutlined />删除
                </a-button>
              </template>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty :description="selectedOrgId ? '当前部门暂无分类目录数据' : '权限范围内暂无可见分类目录'" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属新增/编辑弹窗 -->
    <KnowledgeFolderModal
      v-model:open="modalOpen"
      :org-id="selectedOrgId"
      :org-name="selectedOrgName"
      :org-tree="rawOrgTree"
      :record="currentEditingRecord"
      :parent-folder="targetParentFolder"
      :raw-folder-list="rawFolders"
      @success="handleSuccess"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType } from 'ant-design-vue'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import {
  deleteKnowledgeFolder,
  getKnowledgeFolderList,
} from '@/apis/ai/folder'
import type {
  KnowledgeFolderQuery,
  KnowledgeFolderRecord,
} from '@/apis/ai/folder/type'
import type { Organization } from '@/apis/upms/organization/type'
import { menusStore } from '@/stores/modules/user'
import { useSystemDict } from '@/composables/useSystemDict'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import OrgSidebar from '@/components/OrgSidebar.vue'
import KnowledgeFolderModal from './components/KnowledgeFolderModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 状态字典选项（复用 common_status 字典，默认全部，全部时不传参数）
const { getOptions: getDictOptions } = useSystemDict([SYSTEM_DICT_TYPE.commonStatus])
const statusOptions = computed(() => [
  { label: '全部状态', value: undefined },
  ...getDictOptions(SYSTEM_DICT_TYPE.commonStatus, (value) => Number(value) as 0 | 1),
])

const columns = computed<TableColumnsType<KnowledgeFolderRecord>>(() => [
  { title: '分类名称', dataIndex: 'folderName', key: 'folderName', width: 240, ellipsis: true },
  { title: '所属部门', dataIndex: 'orgId', key: 'orgId', width: 140, ellipsis: true },
  { title: '分类描述', dataIndex: 'description', key: 'description', width: 220, ellipsis: true },
  { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 70 },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 80 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 140 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right', align: 'right' },
])

// 选中的部门状态与部门架构树
const selectedOrgId = ref<string>('')
const selectedOrgName = ref<string>('全部可见目录')
const rawOrgTree = ref<Organization[]>([])

const currentScopeTitle = computed(() => {
  if (selectedOrgId.value && selectedOrgName.value) {
    return `部门：${selectedOrgName.value}`
  }
  return '全部可见目录'
})

// 缓存部门映射表，用于表格快速查找部门名称
const orgNameMap = computed(() => {
  const map = new Map<string, string>()
  const traverse = (items: Organization[]) => {
    items.forEach((item) => {
      map.set(String(item.id), item.orgName)
      if (item.children?.length) {
        traverse(item.children)
      }
    })
  }
  traverse(rawOrgTree.value)
  return map
})

const getOrgName = (orgId: string): string => {
  if (!orgId) return '—'
  return orgNameMap.value.get(String(orgId)) || `部门 (${orgId})`
}

// 目录平铺列表与树结构构建
const loading = ref(false)
const rawFolders = ref<KnowledgeFolderRecord[]>([])
const deletingId = ref<string>('')

const modalOpen = ref(false)
const currentEditingRecord = ref<KnowledgeFolderRecord | null>(null)
const targetParentFolder = ref<KnowledgeFolderRecord | null>(null)
const selectedDataStatus = ref<number | undefined>(undefined)

// 请求版本号防止快速切换筛选时旧请求覆盖新树
let currentReqToken = 0

/**
 * 纯前端将平铺节点转换为树形结构
 * 契约：全部视图下，不同部门可能有同名根目录，不得按名称合并节点；以 id 为唯一节点标识
 */
const folderTreeData = computed<KnowledgeFolderRecord[]>(() => {
  const list = rawFolders.value
  if (!list.length) return []

  // 同级排序：sortOrder 升序，ID 字符串比较（禁止将雪花 ID 转换为 JS number）
  const sorted = [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    return String(a.id).localeCompare(String(b.id))
  })

  const nodeMap = new Map<string, KnowledgeFolderRecord>()
  sorted.forEach((item) => {
    nodeMap.set(String(item.id), { ...item, children: [] })
  })

  const tree: KnowledgeFolderRecord[] = []
  nodeMap.forEach((node) => {
    const parentId = node.parentId ? String(node.parentId) : null
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children!.push(node)
    } else {
      tree.push(node)
    }
  })

  return tree
})

const handleOrgTreeLoaded = (tree: Organization[]) => {
  rawOrgTree.value = tree
}

const handleOrgSelect = (orgId: string, orgName: string) => {
  selectedOrgId.value = orgId
  selectedOrgName.value = orgName || (orgId ? '' : '全部可见目录')
  // 切换筛选立即清除右侧旧节点、选中状态、编辑状态
  rawFolders.value = []
  currentEditingRecord.value = null
  targetParentFolder.value = null

  void loadFolders(orgId)
}

const handleStatusChange = () => {
  void loadFolders(selectedOrgId.value)
}

const handleRefresh = () => {
  void loadFolders(selectedOrgId.value)
}

const handleSuccess = () => {
  void loadFolders(selectedOrgId.value)
}

/**
 * 加载分类目录平铺列表
 * 契约：
 * - orgId 未选择时直接省略参数，不传空字符串、0、“all”或虚拟根节点 ID
 * - 传 orgId 时仅查询指定部门本身
 */
const loadFolders = async (orgId = selectedOrgId.value) => {
  const reqToken = ++currentReqToken
  loading.value = true
  try {
    const params: KnowledgeFolderQuery = {}
    if (orgId && String(orgId).trim()) {
      params.orgId = String(orgId).trim()
    }
    if (selectedDataStatus.value !== undefined && selectedDataStatus.value !== null) {
      params.dataStatus = selectedDataStatus.value
    }
    const res = await getKnowledgeFolderList(params)

    // 校验响应所属，防止快速切换筛选时旧结果覆盖新树
    if (reqToken !== currentReqToken || selectedOrgId.value !== orgId) {
      return
    }
    rawFolders.value = res.data || []
  } finally {
    if (reqToken === currentReqToken) {
      loading.value = false
    }
  }
}

const openCreate = (parent: KnowledgeFolderRecord | null) => {
  if (!canWrite.value) return
  if (parent && (!parent.writable || parent.navigationOnly)) return
  currentEditingRecord.value = null
  targetParentFolder.value = parent
  modalOpen.value = true
}

const openEdit = (record: KnowledgeFolderRecord) => {
  if (!canWrite.value || !record.writable || record.navigationOnly) return
  currentEditingRecord.value = record
  targetParentFolder.value = null
  modalOpen.value = true
}

const confirmDelete = (record: KnowledgeFolderRecord) => {
  if (!canWrite.value || !record.writable || record.navigationOnly) return
  confirmAction({
    title: '确认删除分类目录',
    content: `确定要删除分类目录【${record.folderName}】吗？若目录下存在有效子分类，后端将拒绝删除。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = String(record.id)
      try {
        await deleteKnowledgeFolder(String(record.id))
        message.success('分类目录已删除')
        await loadFolders(selectedOrgId.value)
      } finally {
        deletingId.value = ''
      }
    },
  })
}

onMounted(() => {
  // 初始加载全部可见目录
  void loadFolders('')
})
</script>

<style scoped>
.knowledge-folder-page {
  display: flex;
  height: 100%;
  gap: var(--du-space-3);
  overflow: hidden;
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
  align-items: center;
  gap: var(--du-space-2);
}

.current-org-badge {
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

.org-badge-icon {
  color: var(--du-primary);
  font-size: 12px;
}

.org-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-select {
  width: 110px;
}

.folder-name-cell {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.entity-name-text {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
}

.create-time-cell {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
}

.readonly-label {
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
}

.navigation-label {
  color: #d97706;
  background: #fef3c7;
  padding: 1px 6px;
  border-radius: var(--du-radius-sm);
}
</style>
