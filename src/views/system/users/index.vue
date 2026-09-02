<template>
  <!-- 用户管理页面：左侧组织树筛选，右侧紧凑表格与系统操作 -->
  <section class="user-page">
    <!-- 左侧组织架构树私有子组件 -->
    <UserOrgSidebar
      v-model:selected-org-id="selectedOrgId"
      @select="handleOrgSelect"
      @loaded="onOrgTreeLoaded"
    />

    <!-- 右侧用户管理主区域 -->
    <main class="user-content du-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索账号、姓名、昵称或手机"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-select
            v-model:value="query.enabled"
            allow-clear
            class="status-select"
            placeholder="启用状态"
            :options="[
              { label: '已启用', value: true },
              { label: '已停用', value: false },
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
          <a-button @click="resetSearch({ organizationId: selectedOrgId || undefined })">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <div class="toolbar-actions">
          <a-button v-if="canWrite" type="primary" @click="createModalOpen = true">
            <PlusOutlined />新增用户
          </a-button>
        </div>
      </header>

      <!-- 用户列表表格 -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1250 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 账号 -->
          <code v-if="column.key === 'account'" class="code-value du-mono font-bold">{{ record.account }}</code>

          <!-- 姓名 -->
          <span v-else-if="column.key === 'userName'" class="user-name-cell font-semibold">
            {{ record.userName || '—' }}
          </span>

          <!-- 昵称 -->
          <span v-else-if="column.key === 'nickName'" class="text-secondary">
            {{ record.nickName || '—' }}
          </span>

          <!-- 手机号 -->
          <span v-else-if="column.key === 'mobile'" class="du-mono">
            {{ record.mobile || '—' }}
          </span>

          <!-- 分配角色（通用 EllipsisText 组件） -->
          <EllipsisText
            v-else-if="column.key === 'roleNames'"
            :text="record.roleNames"
            max-width="170px"
          />

          <!-- 所属组织（通用 EllipsisText 组件） -->
          <EllipsisText
            v-else-if="column.key === 'organizationNames'"
            :text="record.organizationNames"
            max-width="170px"
          />

          <!-- 启用状态（通用 StatusTag 组件） -->
          <div v-else-if="column.key === 'enabled'" class="center-cell">
            <StatusTag :value="record.enabled" type="enabled" />
          </div>

          <!-- 安全锁定状态（通用 StatusTag 组件） -->
          <div v-else-if="column.key === 'locked'" class="center-cell">
            <StatusTag :value="record.locked" type="locked" />
          </div>

          <!-- 创建时间（通用 formatDateTime 工具） -->
          <span v-else-if="column.key === 'createTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.createTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <!-- 编辑基础信息 -->
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />编辑
              </a-button>

              <!-- 设置角色（平台/租户管理员禁止分配） -->
              <a-tooltip
                v-if="getAdminStatus(record).isProtected"
                :title="`${getAdminStatus(record).label}账号禁止分配角色`"
              >
                <a-button type="link" size="small" disabled class="action-btn-disabled">
                  <SafetyCertificateOutlined />角色
                </a-button>
              </a-tooltip>
              <a-button v-else type="link" size="small" @click="openRoleAssign(record)">
                <SafetyCertificateOutlined />角色
              </a-button>

              <!-- 设置组织（平台/租户管理员禁止分配） -->
              <a-tooltip
                v-if="getAdminStatus(record).isProtected"
                :title="`${getAdminStatus(record).label}账号禁止分配组织`"
              >
                <a-button type="link" size="small" disabled class="action-btn-disabled">
                  <ApartmentOutlined />组织
                </a-button>
              </a-tooltip>
              <a-button v-else type="link" size="small" @click="openOrgAssign(record)">
                <ApartmentOutlined />组织
              </a-button>

              <!-- 启停状态（平台/租户管理员禁止停用） -->
              <a-tooltip
                v-if="getAdminStatus(record).isProtected"
                :title="`${getAdminStatus(record).label}账号禁止停用`"
              >
                <a-button type="link" size="small" disabled class="action-btn-disabled">
                  停用
                </a-button>
              </a-tooltip>
              <a-button
                v-else
                type="link"
                size="small"
                :danger="record.enabled"
                :loading="statusChangingId === record.id"
                @click="confirmToggleEnabled(record)"
              >
                {{ record.enabled ? '停用' : '启用' }}
              </a-button>

              <!-- 锁定状态（平台/租户管理员禁止锁定） -->
              <a-tooltip
                v-if="getAdminStatus(record).isProtected"
                :title="`${getAdminStatus(record).label}账号禁止锁定`"
              >
                <a-button type="link" size="small" disabled class="action-btn-disabled">
                  锁定
                </a-button>
              </a-tooltip>
              <a-button
                v-else
                type="link"
                size="small"
                :loading="lockChangingId === record.id"
                @click="confirmToggleLocked(record)"
              >
                {{ record.locked ? '解锁' : '锁定' }}
              </a-button>

              <!-- 删除用户（平台/租户管理员禁止删除） -->
              <a-tooltip
                v-if="getAdminStatus(record).isProtected"
                :title="`${getAdminStatus(record).label}账号禁止删除`"
              >
                <a-button type="link" size="small" disabled danger class="action-btn-disabled">
                  <DeleteOutlined />删除
                </a-button>
              </a-tooltip>
              <a-button
                v-else
                type="link"
                size="small"
                danger
                :loading="deletingId === record.id"
                @click="confirmDeleteUser(record)"
              >
                <DeleteOutlined />删除
              </a-button>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无用户数据" />
        </template>
      </a-table>
    </main>

    <!-- 模块专属私有子组件弹窗 -->
    <UserCreateModal
      v-model:open="createModalOpen"
      :default-org-id="selectedOrgId"
      :org-tree="rawOrgTree"
      @success="handleSearch"
    />

    <UserEditModal
      v-model:open="editModalOpen"
      :user="currentRecord"
      @success="loadUsers"
    />

    <UserRoleModal
      v-model:open="roleModalOpen"
      :user="currentRecord"
      @success="loadUsers"
    />

    <UserOrgModal
      v-model:open="orgModalOpen"
      :user="currentRecord"
      :org-tree="rawOrgTree"
      @success="loadUsers"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType } from 'ant-design-vue'
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  changeUserEnabled,
  changeUserLocked,
  deleteUser,
  getUserPage,
} from '@/apis/upms/user'
import type {
  UserQueryParams,
  UserRecord,
} from '@/apis/upms/user/type'
import type { Organization } from '@/apis/upms/organization/type'
import { menusStore, userStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import StatusTag from '@/components/StatusTag.vue'

// 引入模块专属私有子组件
import UserOrgSidebar from './components/UserOrgSidebar.vue'
import UserCreateModal from './components/UserCreateModal.vue'
import UserEditModal from './components/UserEditModal.vue'
import UserRoleModal from './components/UserRoleModal.vue'
import UserOrgModal from './components/UserOrgModal.vue'

const route = useRoute()
const currentMenus = menusStore()
const currentUser = userStore()
const { getUserProtection } = useAdminAuth()

// 权限控制
const canWrite = computed(() => currentMenus.canWritePath(route.path))
const getAdminStatus = getUserProtection

// 表格列定义
const columns = computed<TableColumnsType<UserRecord>>(() => [
  { title: '登录账号', dataIndex: 'account', key: 'account', width: 120 },
  { title: '用户姓名', dataIndex: 'userName', key: 'userName', width: 110 },
  { title: '昵称', dataIndex: 'nickName', key: 'nickName', width: 110 },
  { title: '手机号码', dataIndex: 'mobile', key: 'mobile', width: 125 },
  { title: '分配角色', dataIndex: 'roleNames', key: 'roleNames', width: 170 },
  { title: '所属组织', dataIndex: 'organizationNames', key: 'organizationNames', width: 180 },
  { title: '启用状态', key: 'enabled', width: 85, align: 'center' },
  { title: '安全锁定', key: 'locked', width: 90, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 155 },
  { title: '操作', key: 'actions', width: 300, align: 'right', fixed: 'right' },
])

// 状态定义
const selectedOrgId = ref<string>('')
const rawOrgTree = ref<Organization[]>([])
const statusChangingId = ref<string>('')
const lockChangingId = ref<string>('')
const deletingId = ref<string>('')

// 弹窗开关控制与选中行状态
const createModalOpen = ref(false)
const editModalOpen = ref(false)
const roleModalOpen = ref(false)
const orgModalOpen = ref(false)
const currentRecord = ref<UserRecord | null>(null)

// 使用通用的 useTablePagination 逻辑 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadUsers,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<UserRecord, UserQueryParams>(
  getUserPage,
  {
    current: 1,
    size: 10,
    keyword: '',
    organizationId: undefined,
    enabled: undefined,
    locked: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const handleOrgSelect = (orgId: string) => {
  query.organizationId = orgId || undefined
  handleSearch()
}

const onOrgTreeLoaded = (tree: Organization[]) => {
  rawOrgTree.value = tree
}

const openEdit = (record: UserRecord) => {
  if (!canWrite.value) return
  currentRecord.value = record
  editModalOpen.value = true
}

const openRoleAssign = (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止分配角色`)
    return
  }
  currentRecord.value = record
  roleModalOpen.value = true
}

const openOrgAssign = (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止分配所属组织`)
    return
  }
  currentRecord.value = record
  orgModalOpen.value = true
}

// 状态切换与删除确认
const confirmToggleEnabled = (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止停用`)
    return
  }
  const nextEnabled = !record.enabled
  const actionText = nextEnabled ? '启用' : '停用'
  const isSelf = String(record.id) === String(currentUser.userInfo?.id)

  confirmAction({
    title: `确认${actionText}用户`,
    content: nextEnabled
      ? `确定要启用用户【${record.userName || record.account}】吗？启用后该账号可正常登录。`
      : isSelf
        ? `警告：你正在停用当前登录账号【${record.userName || record.account}】，停用后你将被强制退出系统。确认继续吗？`
        : `确定要停用用户【${record.userName || record.account}】吗？停用后该用户将无法登录系统。`,
    okText: '确认',
    okType: nextEnabled ? 'primary' : 'danger',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        await changeUserEnabled(record.id, nextEnabled)
        message.success(`用户已${actionText}`)
        await loadUsers()
      } finally {
        statusChangingId.value = ''
      }
    },
  })
}

const confirmToggleLocked = (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止锁定`)
    return
  }
  const nextLocked = !record.locked
  const actionText = nextLocked ? '安全锁定' : '解除锁定'

  confirmAction({
    title: `确认${actionText}用户`,
    content: nextLocked
      ? `锁定用户【${record.userName || record.account}】后，该用户登录后将被强制设为只读模式，禁止所有写操作。是否继续？`
      : `确定要解除用户【${record.userName || record.account}】的安全锁定吗？`,
    okText: '确认',
    okType: nextLocked ? 'danger' : 'primary',
    onOk: async () => {
      lockChangingId.value = record.id
      try {
        await changeUserLocked(record.id, nextLocked)
        message.success(`用户已${actionText}`)
        await loadUsers()
      } finally {
        lockChangingId.value = ''
      }
    },
  })
}

const confirmDeleteUser = (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止删除`)
    return
  }
  const isSelf = String(record.id) === String(currentUser.userInfo?.id)
  if (isSelf) {
    message.error('不能删除当前登录账号')
    return
  }

  confirmAction({
    title: '确认删除用户',
    content: `确定要删除用户【${record.userName || record.account}】吗？删除后该用户数据与权限将被清除，此操作不可逆。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteUser(record.id)
        message.success('用户删除成功')
        await refreshAfterDelete()
      } finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<style scoped>
.user-page {
  display: flex;
  gap: var(--du-space-3);
  height: 100%;
  min-height: 0;
}

.user-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-surface);
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

.search-input {
  width: 240px;
}

.status-select {
  width: 100px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.code-value {
  font-family: var(--du-font-mono);
  font-size: 11px;
  color: var(--du-text);
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.text-secondary {
  color: var(--du-text-secondary);
}

.center-cell {
  display: flex;
  justify-content: center;
}

.create-time-cell {
  font-size: 11px;
  color: var(--du-text-secondary);
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.action-btn-disabled {
  color: var(--du-text-muted) !important;
  cursor: not-allowed;
}

.readonly-label {
  font-size: 11px;
  color: var(--du-text-muted);
}
</style>
