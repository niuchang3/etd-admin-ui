<template>
  <!-- 租户管理主页面： Dense Utility 高密度列表、多条件查询、启停/锁定/删除及菜单设置 -->
  <section class="tenant-page du-page">
    <header class="page-toolbar du-panel">
      <!-- 搜索筛选表单 -->
      <div class="filters">
        <a-input
          v-model:value="query.tenantName"
          allow-clear
          class="search-input"
          placeholder="搜索租户名称"
          @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>

        <a-input
          v-model:value="query.creditCode"
          allow-clear
          class="search-input"
          placeholder="搜索统一社会信用代码"
          @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>

        <DictSelect
          v-model:value="query.tenantType"
          :type-code="SYSTEM_DICT_TYPE.tenantType"
          allow-clear
          class="status-select"
          placeholder="租户类型"
        />

        <a-select
          v-model:value="query.dataStatus"
          allow-clear
          class="status-select"
          placeholder="启用状态"
          :options="[
            { label: '已启用', value: 1 },
            { label: '已停用', value: 0 },
          ]"
        />

        <a-select
          v-model:value="query.locked"
          allow-clear
          class="status-select"
          placeholder="锁定状态"
          :options="[
            { label: '未锁定', value: false },
            { label: '已锁定', value: true },
          ]"
        />

        <a-button type="primary" @click="handleSearch">
          <SearchOutlined />查询
        </a-button>
        <a-button @click="resetSearch()">
          <ReloadOutlined />重置
        </a-button>
      </div>

      <!-- 操作按钮区 -->
      <div class="toolbar-actions">
        <a-button v-if="canWrite" type="primary" @click="openCreate">
          <PlusOutlined />新增租户
        </a-button>
      </div>
    </header>

    <!-- 租户数据表格 -->
    <div class="table-container du-panel">
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1200 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 租户名称与 Logo 缩略图 -->
          <div v-if="column.key === 'tenantName'" class="tenant-name-cell">
            <a-avatar
              v-if="record.logo"
              :src="record.logo"
              shape="square"
              size="small"
              class="tenant-avatar"
            />
            <span class="tenant-name-text" :title="record.tenantName">{{ record.tenantName }}</span>
            <a-tag v-if="isCurrentLoginTenant(record.id)" color="blue" class="current-tenant-tag">当前</a-tag>
          </div>

          <!-- 统一社会信用代码（等宽字体） -->
          <code v-else-if="column.key === 'creditCode'" class="code-value du-mono">
            {{ record.creditCode || '—' }}
          </code>

          <!-- 租户类型（字典翻译） -->
          <div v-else-if="column.key === 'tenantType'">
            <DictTag :type-code="SYSTEM_DICT_TYPE.tenantType" :value="record.tenantType" />
          </div>

          <!-- 租户描述 -->
          <EllipsisText
            v-else-if="column.key === 'description'"
            :text="record.description"
            max-width="220px"
          />

          <!-- 启用状态（通用 StatusTag 组件） -->
          <div v-else-if="column.key === 'dataStatus'" class="center-cell">
            <StatusTag :value="record.dataStatus === 1" type="enabled" />
          </div>

          <!-- 安全锁定状态（通用 StatusTag 组件） -->
          <div v-else-if="column.key === 'locked'" class="center-cell">
            <StatusTag :value="record.locked" type="locked" />
          </div>

          <!-- 创建时间（格式化） -->
          <span v-else-if="column.key === 'createTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.createTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <!-- 编辑租户基础信息 -->
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />编辑
              </a-button>

              <!-- 设置可用菜单（仅普通租户支持） -->
              <a-tooltip
                v-if="record.tenantType === 'ordinary'"
                title="设置该普通租户可访问的系统菜单。"
              >
                <a-button type="link" size="small" @click="openMenuSettings(record)">
                  <SettingOutlined />菜单
                </a-button>
              </a-tooltip>

              <!-- 启停状态切换 -->
              <a-tooltip :title="isCurrentLoginTenant(record.id) ? '不能操作当前登录租户。' : undefined">
                <a-button
                  type="link"
                  size="small"
                  :disabled="isCurrentLoginTenant(record.id) || statusChangingId === record.id"
                  :loading="statusChangingId === record.id"
                  :danger="record.dataStatus === 1"
                  @click="confirmToggleStatus(record)"
                >
                  {{ record.dataStatus === 1 ? '停用' : '启用' }}
                </a-button>
              </a-tooltip>

              <!-- 安全锁定/解锁切换 -->
              <a-tooltip :title="isCurrentLoginTenant(record.id) ? '不能操作当前登录租户。' : undefined">
                <a-button
                  type="link"
                  size="small"
                  :disabled="isCurrentLoginTenant(record.id) || lockedChangingId === record.id"
                  :loading="lockedChangingId === record.id"
                  @click="confirmToggleLocked(record)"
                >
                  <component :is="record.locked ? UnlockOutlined : LockOutlined" />
                  {{ record.locked ? '解锁' : '锁定' }}
                </a-button>
              </a-tooltip>

              <!-- 删除租户 -->
              <a-tooltip :title="isCurrentLoginTenant(record.id) ? '不能操作当前登录租户。' : undefined">
                <a-button
                  type="link"
                  size="small"
                  danger
                  :disabled="isCurrentLoginTenant(record.id) || deletingId === record.id"
                  :loading="deletingId === record.id"
                  @click="confirmDelete(record)"
                >
                  <DeleteOutlined />删除
                </a-button>
              </a-tooltip>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无租户数据" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属私有子组件 -->
    <TenantFormModal
      v-model:open="editorOpen"
      :record="currentEditingRecord"
      @success="loadTenants"
    />

    <TenantMenuDrawer
      v-model:open="menuSettingsOpen"
      :tenant="menuSettingsTenant"
      @success="loadTenants"
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
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue'
import {
  changeTenantLocked,
  changeTenantStatus,
  deleteTenant,
  selectTenantPage,
} from '@/apis/upms/tenant'
import type { PageTenantParams, TenantRecord } from '@/apis/upms/tenant/type'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import DictSelect from '@/components/DictSelect.vue'
import DictTag from '@/components/DictTag.vue'
import EllipsisText from '@/components/EllipsisText.vue'
import StatusTag from '@/components/StatusTag.vue'

// 引入模块专属私有子组件
import TenantFormModal from './components/TenantFormModal.vue'
import TenantMenuDrawer from './components/TenantMenuDrawer.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const { isCurrentLoginTenant } = useAdminAuth()

// 表格列定义
const columns = computed<TableColumnsType<TenantRecord>>(() => [
  { title: '租户名称', dataIndex: 'tenantName', key: 'tenantName', width: 170 },
  { title: '社会信用代码', dataIndex: 'creditCode', key: 'creditCode', width: 170 },
  { title: '租户类型', dataIndex: 'tenantType', key: 'tenantType', width: 100 },
  { title: '租户描述', dataIndex: 'description', key: 'description', width: 220 },
  { title: '启用状态', key: 'dataStatus', width: 85, align: 'center' },
  { title: '安全锁定', key: 'locked', width: 85, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 155 },
  { title: '操作', key: 'actions', width: 260, align: 'right', fixed: 'right' },
])

// 异步操作状态
const statusChangingId = ref<string>('')
const lockedChangingId = ref<string>('')
const deletingId = ref<string>('')

// 弹窗控制状态
const editorOpen = ref(false)
const currentEditingRecord = ref<TenantRecord | null>(null)
const menuSettingsOpen = ref(false)
const menuSettingsTenant = ref<TenantRecord | null>(null)

interface TenantTableQueryParams extends PageTenantParams {
  tenantName?: string
  creditCode?: string
  tenantType?: string
  dataStatus?: number
  locked?: boolean
}

// 分页与查询 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadTenants,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<TenantRecord, TenantTableQueryParams>(
  selectTenantPage,
  {
    current: 1,
    size: 10,
    tenantName: '',
    creditCode: '',
    tenantType: undefined,
    dataStatus: undefined,
    locked: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const openCreate = () => {
  if (!canWrite.value) return
  currentEditingRecord.value = null
  editorOpen.value = true
}

const openEdit = (record: TenantRecord) => {
  if (!canWrite.value) return
  currentEditingRecord.value = record
  editorOpen.value = true
}

const openMenuSettings = (record: TenantRecord) => {
  if (!canWrite.value || record.tenantType !== 'ordinary') return
  menuSettingsTenant.value = record
  menuSettingsOpen.value = true
}

// 启停与锁定操作
const confirmToggleStatus = (record: TenantRecord) => {
  if (!canWrite.value || isCurrentLoginTenant(record.id)) return
  const nextStatus = record.dataStatus === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '停用'

  confirmAction({
    title: `确认${actionText}租户`,
    content: `确定要${actionText}租户【${record.tenantName}】吗？${nextStatus === 0 ? '停用后该租户下所有用户将无法登录，已有登录令牌也会被清理。' : '启用后该租户下用户可恢复正常登录。'}`,
    okText: '确认',
    okType: nextStatus === 0 ? 'danger' : 'primary',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        await changeTenantStatus(record.id, nextStatus)
        message.success(`租户已${actionText}`)
        await loadTenants()
      } finally {
        statusChangingId.value = ''
      }
    },
  })
}

const confirmToggleLocked = (record: TenantRecord) => {
  if (!canWrite.value || isCurrentLoginTenant(record.id)) return
  const nextLocked = !record.locked
  const actionText = nextLocked ? '安全锁定' : '解除锁定'

  confirmAction({
    title: `确认${actionText}租户`,
    content: nextLocked
      ? `安全锁定租户【${record.tenantName}】后，用户登录后将被限制所有写操作，仅保留只读权限。是否继续？`
      : `确定要解除租户【${record.tenantName}】的安全锁定状态吗？`,
    okText: '确认',
    okType: nextLocked ? 'danger' : 'primary',
    onOk: async () => {
      lockedChangingId.value = record.id
      try {
        await changeTenantLocked(record.id, nextLocked)
        message.success(`租户已${actionText}`)
        await loadTenants()
      } finally {
        lockedChangingId.value = ''
      }
    },
  })
}

const confirmDelete = (record: TenantRecord) => {
  if (!canWrite.value || isCurrentLoginTenant(record.id)) return
  confirmAction({
    title: '确认删除租户',
    content: `确定要删除租户【${record.tenantName}】吗？此操作不可逆，将清除该租户的所有组织、用户与业务数据。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteTenant(record.id)
        message.success('租户删除成功')
        await refreshAfterDelete()
      } finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<style scoped>
.tenant-page {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-3);
}

.page-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: var(--du-space-2) var(--du-space-3);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-surface);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--du-space-2);
}

.search-input {
  width: 180px;
}

.status-select {
  width: 110px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.table-container {
  padding: var(--du-space-3);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-surface);
}

.tenant-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tenant-avatar {
  flex-shrink: 0;
}

.tenant-name-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-normal, 400);
}

.font-bold {
  font-weight: 700;
}

.current-tenant-tag {
  font-size: var(--du-font-size-xs, 11px);
  line-height: 16px;
  padding: 0 4px;
}

.code-value {
  font-family: var(--du-font-mono);
  font-size: var(--du-font-size-xs, 11px);
}

.center-cell {
  display: flex;
  justify-content: center;
}

.create-time-cell {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
}

.readonly-label {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-muted);
}
</style>
