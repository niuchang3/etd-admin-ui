<template>
  <!-- 模型配置管理主页面（维护六种能力的草稿） -->
  <section class="management-page model-config-page">
    <div class="du-panel table-panel">
      <!-- 页面顶部筛选栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索模型名称或标识"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <DictSelect
            v-model:value="query.modelType"
            type-code="ai_model_type"
            placeholder="模型类型"
            class="type-select"
            style="width: 150px"
            @change="handleSearch"
          />

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
          <PlusOutlined />新增模型配置
        </a-button>
      </header>

      <!-- 模型配置数据表格：行高锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1140 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 模型名称 -->
          <span v-if="column.key === 'modelName'" class="entity-name-text">
            {{ record.modelName }}
          </span>

          <!-- 所属连接 -->
          <span v-else-if="column.key === 'connectionName'" class="connection-text">
            {{ record.connectionName || record.connectionId || '—' }}
          </span>

          <!-- 模型类型 -->
          <DictTag
            v-else-if="column.key === 'modelType'"
            type-code="ai_model_type"
            :value="record.modelType"
          />

          <!-- 模型标识 -->
          <code v-else-if="column.key === 'modelCode'" class="code-value du-mono">
            {{ record.modelCode }}
          </code>

          <!-- 向量维度（只读展示，当前为空，实测后填写） -->
          <span v-else-if="column.key === 'embeddingDimensions'" class="du-mono">
            {{ record.embeddingDimensions ?? '—' }}
          </span>

          <!-- 验证状态：当前未实测，展示草稿(未实测) -->
          <template v-else-if="column.key === 'verified'">
            <a-tag color="default">草稿 (未实测)</a-tag>
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
            max-width="150px"
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
          <a-empty description="暂无模型配置数据" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属新增/编辑弹窗 -->
    <ModelConfigModal
      v-model:open="modalOpen"
      :record="currentEditingRecord"
      @success="loadConfigs"
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
  deleteModelConfig,
  getModelConfigPage,
} from '@/apis/ai/config'
import type {
  ModelConfigQuery,
  ModelConfigRecord,
} from '@/apis/ai/config/type'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { useSystemDict } from '@/composables/useSystemDict'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import DictSelect from '@/components/DictSelect.vue'
import ModelConfigModal from './components/ModelConfigModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 状态字典选项（复用 common_status 字典，默认全部，全部时不传参数）
const { getOptions: getDictOptions } = useSystemDict([SYSTEM_DICT_TYPE.commonStatus])
const statusOptions = computed(() => [
  { label: '全部', value: undefined },
  ...getDictOptions(SYSTEM_DICT_TYPE.commonStatus, (value) => Number(value) as 0 | 1),
])

const columns = computed<TableColumnsType<ModelConfigRecord>>(() => [
  { title: '模型名称', dataIndex: 'modelName', key: 'modelName', width: 160 },
  { title: '所属连接', dataIndex: 'connectionName', key: 'connectionName', width: 140 },
  { title: '模型类型', dataIndex: 'modelType', key: 'modelType', width: 120 },
  { title: '模型标识', dataIndex: 'modelCode', key: 'modelCode', width: 180 },
  { title: '向量维度', dataIndex: 'embeddingDimensions', key: 'embeddingDimensions', width: 90 },
  { title: '验证状态', dataIndex: 'verified', key: 'verified', width: 110 },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 85 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 140 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right', align: 'right' },
])

const deletingId = ref<string>('')
const modalOpen = ref(false)
const currentEditingRecord = ref<ModelConfigRecord | null>(null)

const {
  loading,
  records,
  query,
  pagination,
  loadData: loadConfigs,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<ModelConfigRecord, ModelConfigQuery>(
  (params) => {
    // 严谨透传参数：全部时不传参数，启用传 1，禁用传 0，绝对不丢掉合法值 0
    const cleanParams: ModelConfigQuery = {
      current: params.current,
      size: params.size,
      keyword: params.keyword?.trim() || undefined,
      modelType: params.modelType || undefined,
    }
    if (params.dataStatus !== undefined && params.dataStatus !== null) {
      cleanParams.dataStatus = params.dataStatus
    }
    return getModelConfigPage(cleanParams)
  },
  {
    current: 1,
    size: 10,
    keyword: '',
    modelType: undefined,
    dataStatus: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const handleStatusChange = () => {
  query.current = 1
  void loadConfigs()
}

const openCreate = () => {
  if (!canWrite.value) return
  currentEditingRecord.value = null
  modalOpen.value = true
}

const openEdit = (record: ModelConfigRecord) => {
  if (!canWrite.value) return
  currentEditingRecord.value = record
  modalOpen.value = true
}

const confirmDelete = (record: ModelConfigRecord) => {
  if (!canWrite.value) return
  confirmAction({
    title: '确认删除模型配置',
    content: `确定要删除模型配置【${record.modelName}】吗？删除后不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteModelConfig(record.id)
        message.success('模型配置已删除')
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
  width: 190px;
}

.type-select {
  width: 130px;
}

.status-select {
  width: 105px;
}

.entity-name-text {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text);
}

.connection-text {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
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
