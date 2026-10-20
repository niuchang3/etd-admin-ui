<template>
  <!-- 模型目录管理页面 -->
  <section class="management-page model-page">
    <div class="du-panel table-panel">
      <!-- 页面顶部筛选栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-select
            v-model:value="query.providerCode"
            :options="providerOptions"
            allow-clear
            class="filter-select"
            placeholder="服务商"
            style="width: 140px"
            @change="handleFilterChange"
          />

          <a-select
            v-model:value="query.modelType"
            :options="typeOptions"
            allow-clear
            class="filter-select"
            placeholder="模型类型"
            style="width: 140px"
            @change="handleFilterChange"
          />

          <!-- 仅平台管理员可筛选启停状态 -->
          <a-select
            v-if="isPlatformAdmin"
            v-model:value="query.dataStatus"
            :options="statusOptions"
            allow-clear
            class="status-select"
            placeholder="状态"
            style="width: 110px"
            @change="handleFilterChange"
          />

          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="resetSearch()">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <!-- 仅平台管理员且具备写权限时展示新增入口 -->
        <a-button v-if="canManage" type="primary" @click="openCreate">
          <PlusOutlined />新增模型
        </a-button>
      </header>

      <!-- 模型数据表格：行高刚性锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: tableScrollX }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- Logo 紧凑图标 -->
          <template v-if="column.key === 'logoPath'">
            <div class="table-logo-cell">
              <img
                v-if="record.logoPath"
                :src="record.logoPath"
                alt="logo"
                class="cell-logo-img"
                @error="handleCellLogoError"
              />
              <span v-else class="cell-logo-fallback">
                {{ (record.modelName || 'AI').slice(0, 1).toUpperCase() }}
              </span>
            </div>
          </template>

          <!-- 模型名称 -->
          <EllipsisText
            v-else-if="column.key === 'modelName'"
            :text="record.modelName"
            max-width="160px"
          />

          <!-- 实际调用代码 -->
          <EllipsisText
            v-else-if="column.key === 'modelCode'"
            :text="record.modelCode"
            max-width="140px"
            class="du-mono"
          />

          <!-- 服务商 -->
          <DictTag
            v-else-if="column.key === 'providerCode'"
            type-code="ai_model_provider"
            :value="record.providerCode"
          />

          <!-- 模型类型 -->
          <DictTag
            v-else-if="column.key === 'modelType'"
            type-code="ai_model_type"
            :value="record.modelType"
          />

          <!-- 显示排序 -->
          <span v-else-if="column.key === 'sort'" class="du-mono">
            {{ record.sort ?? 0 }}
          </span>

          <!-- 状态（仅平台管理员展示 Switch 控制，遵循默认标准尺寸 22px，严禁加 small） -->
          <template v-else-if="column.key === 'dataStatus'">
            <a-switch
              :checked="record.dataStatus === 1"
              :loading="statusChangingId === record.id"
              :disabled="!canManage || statusChangingId === record.id"
              checked-children="启用"
              un-checked-children="停用"
              @change="handleToggleStatus(record, Boolean($event))"
            />
          </template>

          <!-- 介绍说明 -->
          <EllipsisText
            v-else-if="column.key === 'description'"
            :text="record.description || '—'"
            max-width="260px"
          />

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button type="link" size="small" @click="handleView(record)">
              <EyeOutlined />查看
            </a-button>

            <!-- 仅平台管理员展示编辑与删除 -->
            <template v-if="canManage">
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
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无模型数据" />
        </template>
      </a-table>
    </div>

    <!-- 模型详情查看弹窗 -->
    <ModelDetailModal
      v-model:open="detailModalOpen"
      :model-id="selectedModelId"
      :initial-record="selectedRecord"
    />

    <!-- 模型维护新增/编辑弹窗（仅平台管理员可见与触发） -->
    <ModelFormModal
      v-if="canManage"
      v-model:open="formModalOpen"
      :record="currentEditingRecord"
      @success="loadModels"
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
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  deleteModel,
  getModel,
  getModelPage,
  updateModel,
} from '@/apis/ai/model'
import type {
  ModelQuery,
  ModelRecord,
  ModelUpdateDTO,
} from '@/apis/ai/model/type'
import { menusStore } from '@/stores/modules/user'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useTablePagination } from '@/composables/useTablePagination'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE } from '@/constant'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import DictTag from '@/components/DictTag.vue'
import ModelDetailModal from './components/ModelDetailModal.vue'
import ModelFormModal from './components/ModelFormModal.vue'

const route = useRoute()
const { isPlatformAdmin } = useAdminAuth()
const canWrite = computed(() => menusStore().canWritePath(route.path))

/**
 * 核心权限判断：
 * 仅平台管理员 platformAdmin=true 可以维护模型（新增、编辑、删除、启停）；
 * 普通租户和租户管理员只能浏览已启用模型，即使拥有 ai:model:write，也不能展示维护入口；
 * 锁定身份执行写操作坚决禁止。
 */
const canManage = computed(() => isPlatformAdmin.value && canWrite.value)

// 字典选项：服务商、模型类型与通用状态
const { getOptions: getDictOptions } = useSystemDict([
  AI_DICT_TYPE.MODEL_PROVIDER,
  AI_DICT_TYPE.MODEL_TYPE,
  SYSTEM_DICT_TYPE.commonStatus,
])

const providerOptions = computed(() => [
  { label: '全部服务商', value: undefined },
  ...getDictOptions(AI_DICT_TYPE.MODEL_PROVIDER),
])

const typeOptions = computed(() => [
  { label: '全部类型', value: undefined },
  ...getDictOptions(AI_DICT_TYPE.MODEL_TYPE),
])

const statusOptions = computed(() => [
  { label: '全部状态', value: undefined },
  ...getDictOptions(SYSTEM_DICT_TYPE.commonStatus, (value) => Number(value) as 0 | 1),
])

// 动态表格列定义：平台管理员展示状态列与宽操作列
const columns = computed<TableColumnsType<ModelRecord>>(() => {
  const baseCols: TableColumnsType<ModelRecord> = [
    { title: '图标', dataIndex: 'logoPath', key: 'logoPath', width: 60, align: 'center' },
    { title: '模型名称', dataIndex: 'modelName', key: 'modelName', width: 180, ellipsis: true },
    { title: '调用代码', dataIndex: 'modelCode', key: 'modelCode', width: 150, ellipsis: true },
    { title: '服务商', dataIndex: 'providerCode', key: 'providerCode', width: 110 },
    { title: '类型', dataIndex: 'modelType', key: 'modelType', width: 110 },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 70, align: 'center' },
  ]

  // 平台管理员增加状态列
  if (isPlatformAdmin.value) {
    baseCols.push({
      title: '状态',
      dataIndex: 'dataStatus',
      key: 'dataStatus',
      width: 90,
      align: 'center',
    })
  }

  baseCols.push(
    { title: '介绍', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: canManage.value ? 170 : 80,
      fixed: 'right',
      align: 'right',
    }
  )

  return baseCols
})

const tableScrollX = computed(() => (isPlatformAdmin.value ? 1160 : 1020))

const detailModalOpen = ref(false)
const selectedModelId = ref<string | null>(null)
const selectedRecord = ref<ModelRecord | null>(null)

const formModalOpen = ref(false)
const currentEditingRecord = ref<ModelRecord | null>(null)
const deletingId = ref<string>('')
const statusChangingId = ref<string>('')

const {
  loading,
  records,
  query,
  pagination,
  loadData: loadModels,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<ModelRecord, ModelQuery>(
  (params) => {
    const cleanParams: ModelQuery = {
      current: params.current,
      size: params.size,
      providerCode: params.providerCode || undefined,
      modelType: params.modelType || undefined,
    }
    // 平台管理员不传 dataStatus 时可查看全部状态；普通租户不传 dataStatus 由后端只返回已启用模型
    if (isPlatformAdmin.value && params.dataStatus !== undefined && params.dataStatus !== null) {
      cleanParams.dataStatus = params.dataStatus
    }
    return getModelPage(cleanParams)
  },
  {
    current: 1,
    size: 10,
    providerCode: undefined,
    modelType: undefined,
    dataStatus: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const handleFilterChange = () => {
  query.current = 1
  void loadModels()
}

const handleView = (record: ModelRecord) => {
  selectedModelId.value = record.id
  selectedRecord.value = record
  detailModalOpen.value = true
}

const openCreate = () => {
  if (!canManage.value) return
  currentEditingRecord.value = null
  formModalOpen.value = true
}

const openEdit = (record: ModelRecord) => {
  if (!canManage.value) return
  currentEditingRecord.value = record
  formModalOpen.value = true
}

/**
 * 启用与停用切换：
 * 严格按照规范：获取最新详情，修改 dataStatus 后通过 PUT /v1/models/{id} 提交完整表单及当前 version，
 * 不新增或调用不存在的 PATCH 接口；版本冲突时提示刷新，不重复提交。
 */
const handleToggleStatus = async (record: ModelRecord, checked: boolean) => {
  if (!canManage.value) return
  const targetStatus = checked ? 1 : 0
  const actionText = checked ? '启用' : '停用'

  statusChangingId.value = record.id
  try {
    // 1. 获取最新详情，确保获得最新字段和 version
    const res = await getModel(record.id)
    const detail = res.data

    if (detail.version === undefined || detail.version === null) {
      message.error('未获取到有效版本号，请刷新列表')
      void loadModels()
      return
    }

    // 2. 组装完整 ModelUpdateDTO 并提交 PUT 请求
    const updateDto: ModelUpdateDTO = {
      providerCode: detail.providerCode,
      modelName: detail.modelName,
      modelCode: detail.modelCode,
      modelType: detail.modelType,
      sort: detail.sort ?? 0,
      logoPath: detail.logoPath || null,
      description: detail.description || null,
      apiKeyUrl: detail.apiKeyUrl || null,
      setupGuideUrl: detail.setupGuideUrl || null,
      baseUrlHelp: detail.baseUrlHelp || null,
      embedding:
        detail.modelType === 'embedding' && Array.isArray(detail.embedding)
          ? detail.embedding.map(Number)
          : null,
      dataStatus: targetStatus,
      version: detail.version,
    }

    await updateModel(record.id, updateDto)
    message.success(`模型「${record.modelName}」已${actionText}`)
    record.dataStatus = targetStatus
    if (detail.version !== undefined) {
      record.version = detail.version
    }
  } catch (err: unknown) {
    // 失败或版本冲突时重新拉取列表同步最新状态
    void loadModels()
  } finally {
    statusChangingId.value = ''
  }
}

/** 逻辑删除模型操作确认 */
const confirmDelete = (record: ModelRecord) => {
  if (!canManage.value) return
  confirmAction({
    title: '确认删除模型',
    content: `确定要删除模型「${record.modelName}」吗？被任意租户有效连接器引用的模型将被后端拒绝删除。`,
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteModel(record.id)
        message.success('模型删除成功')
        refreshAfterDelete()
      } finally {
        deletingId.value = ''
      }
    },
  })
}

const handleCellLogoError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}
</script>

<style scoped>
.model-page {
  display: flex;
  flex-direction: column;
  gap: var(--du-spacing-md, 12px);
}

.table-logo-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
}

.cell-logo-img {
  max-width: 20px;
  max-height: 20px;
  object-fit: contain;
}

.cell-logo-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background-color: var(--du-color-primary-light, #e6f4ff);
  color: var(--du-color-primary, #1677ff);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}
</style>
