<template>
  <!-- 模型连接管理主页面 -->
  <section class="management-page model-connection-page">
    <div class="du-panel table-panel">
      <!-- 页面顶部筛选栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索连接名称"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-select
            v-model:value="query.dataStatus"
            :options="statusOptions"
            allow-clear
            class="status-select"
            placeholder="状态"
            style="width: 110px"
            @change="handleStatusChange"
          />

          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="resetSearch()">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <a-button v-if="canWrite" type="primary" @click="openCreate">
          <PlusOutlined />新增连接
        </a-button>
      </header>

      <!-- 模型连接数据表格：行高锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1080 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 连接名称 -->
          <EllipsisText
            v-if="column.key === 'connectionName'"
            :text="record.connectionName"
            max-width="150px"
          />

          <!-- 接入协议 -->
          <DictTag
            v-else-if="column.key === 'provider'"
            type-code="ai_model_provider"
            :value="record.provider"
          />

          <!-- 服务地址 -->
          <EllipsisText
            v-else-if="column.key === 'baseUrl'"
            :text="record.baseUrl"
            max-width="220px"
            class="du-mono"
          />

          <!-- 认证方式 -->
          <DictTag
            v-else-if="column.key === 'authType'"
            type-code="ai_model_auth_type"
            :value="record.authType"
          />

          <!-- 凭证配置状态 -->
          <template v-else-if="column.key === 'credentialConfigured'">
            <a-tag v-if="record.credentialConfigured" color="green">已配置</a-tag>
            <a-tag v-else color="default">未配置</a-tag>
          </template>

          <!-- 状态（复用 common_status 字典） -->
          <DictTag
            v-else-if="column.key === 'dataStatus'"
            type-code="common_status"
            :value="record.dataStatus"
            :color-map="{ '1': 'green', '0': 'default' }"
          />

          <!-- 备注说明 -->
          <EllipsisText
            v-else-if="column.key === 'remark'"
            :text="record.remark || '—'"
            max-width="160px"
          />

          <!-- 更新时间 -->
          <span v-else-if="column.key === 'updateTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.updateTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />编辑
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                :loading="deletingId === record.id"
                :disabled="deletingId === record.id"
                @click="confirmDelete(record)"
              >
                <DeleteOutlined />删除
              </a-button>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无模型连接数据" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属新增/编辑弹窗 -->
    <ModelConnectionModal
      v-model:open="modalOpen"
      :record="currentEditingRecord"
      @success="loadConnections"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  deleteModelConnection,
  getModelConnectionPage,
} from '@/apis/ai/connection'
import type {
  ModelConnectionQuery,
  ModelConnectionRecord,
} from '@/apis/ai/connection/type'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { useSystemDict } from '@/composables/useSystemDict'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import ModelConnectionModal from './components/ModelConnectionModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 状态字典选项（复用 common_status 字典，默认全部，全部时不传参数）
const { getOptions: getDictOptions } = useSystemDict([SYSTEM_DICT_TYPE.commonStatus])
const statusOptions = computed(() => [
  { label: '全部', value: undefined },
  ...getDictOptions(SYSTEM_DICT_TYPE.commonStatus, (value) => Number(value) as 0 | 1),
])

const columns = computed<TableColumnsType<ModelConnectionRecord>>(() => [
  { title: '连接名称', dataIndex: 'connectionName', key: 'connectionName', width: 170, ellipsis: true },
  { title: '接入协议', dataIndex: 'provider', key: 'provider', width: 120 },
  { title: '服务地址', dataIndex: 'baseUrl', key: 'baseUrl', width: 240, ellipsis: true },
  { title: '认证方式', dataIndex: 'authType', key: 'authType', width: 100 },
  { title: '凭证状态', dataIndex: 'credentialConfigured', key: 'credentialConfigured', width: 90 },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 85 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 140 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right', align: 'right' },
])

const deletingId = ref<string>('')
const modalOpen = ref(false)
const currentEditingRecord = ref<ModelConnectionRecord | null>(null)

const {
  loading,
  records,
  query,
  pagination,
  loadData: loadConnections,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<ModelConnectionRecord, ModelConnectionQuery>(
  (params) => {
    // 严谨透传参数：全部时不传参数，启用传 1，禁用传 0，绝对不丢掉合法值 0
    const cleanParams: ModelConnectionQuery = {
      current: params.current,
      size: params.size,
      keyword: params.keyword?.trim() || undefined,
    }
    if (params.dataStatus !== undefined && params.dataStatus !== null) {
      cleanParams.dataStatus = params.dataStatus
    }
    return getModelConnectionPage(cleanParams)
  },
  {
    current: 1,
    size: 10,
    keyword: '',
    dataStatus: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const handleStatusChange = () => {
  query.current = 1
  void loadConnections()
}

const openCreate = () => {
  if (!canWrite.value) return
  currentEditingRecord.value = null
  modalOpen.value = true
}

const openEdit = (record: ModelConnectionRecord) => {
  if (!canWrite.value) return
  currentEditingRecord.value = record
  modalOpen.value = true
}

const confirmDelete = (record: ModelConnectionRecord) => {
  if (!canWrite.value) return
  confirmAction({
    title: '确认删除模型连接',
    content: `确定要删除模型连接【${record.connectionName}】吗？若已有模型配置关联此连接，后端将拒绝删除。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteModelConnection(record.id)
        message.success('模型连接已删除')
        await refreshAfterDelete(1)
      } finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<style scoped>
.table-panel {
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

.search-input {
  width: 200px;
}

.status-select {
  width: 105px;
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
</style>
