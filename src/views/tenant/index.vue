<template>
  <!-- 租户管理页面采用 Dense Utility 高信息密度的紧凑表格与统一弹窗表单 -->
  <section class="management-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索租户名称、类型或信用代码"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-range-picker
            v-model:value="timeRange"
            value-format="YYYY-MM-DD HH:mm:ss"
            show-time
            class="time-picker"
            :placeholder="['创建开始时间', '创建结束时间']"
          />
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <div v-if="isPlatformAdmin" class="toolbar-actions">
          <a-button type="primary" @click="openCreate"><PlusOutlined />新增租户</a-button>
        </div>
      </header>

      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 租户 Logo -->
          <div v-if="column.key === 'logo'" class="logo-cell">
            <a-image
              v-if="record.logo"
              :src="record.logo"
              :width="28"
              :height="28"
              class="tenant-logo-img"
              :fallback="defaultLogo"
            />
            <span v-else class="tenant-logo-placeholder">{{ (record.tenantName || 'T').charAt(0) }}</span>
          </div>

          <!-- 租户名称 -->
          <div v-else-if="column.key === 'tenantName'" class="tenant-name-cell">
            <strong>{{ record.tenantName }}</strong>
            <small v-if="record.description" class="tenant-desc" :title="record.description">{{ record.description }}</small>
          </div>

          <!-- 租户类型 -->
          <span v-else-if="column.key === 'tenantType'">
            {{ record.tenantType || '—' }}
          </span>

          <!-- 统一社会信用代码 -->
          <code v-else-if="column.key === 'creditCode'" class="code-value">
            {{ record.creditCode || '—' }}
          </code>

          <!-- 管理员姓名 -->
          <span v-else-if="column.key === 'adminUser'" class="admin-user-cell">
            {{ record.adminUser || '—' }}
          </span>

          <!-- 综合状态：优先级 dataStatus=0 (已停用) > locked=true (安全锁定) > 正常 -->
          <div v-else-if="column.key === 'status'" class="status-cell">
            <a-tag v-if="record.dataStatus === 0" color="error">已停用</a-tag>
            <a-tag v-else-if="record.dataStatus === 1 && record.locked" color="warning">安全锁定</a-tag>
            <a-tag v-else color="success">正常</a-tag>
          </div>

          <!-- 创建时间 -->
          <span v-else-if="column.key === 'createTime'" class="create-time-cell">
            {{ record.createTime || '—' }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions' && isPlatformAdmin" class="row-actions">
            <!-- 修改租户基本资料 -->
            <a-button type="link" size="small" @click="openEdit(record)">
              <EditOutlined />修改
            </a-button>

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
          </div>
        </template>
        <template #emptyText><a-empty description="暂无租户数据" /></template>
      </a-table>
    </div>

    <!-- 新增/修改租户弹窗 -->
    <a-modal
      v-model:open="editorOpen"
      :title="formState.id ? '修改租户' : '新增租户'"
      :confirm-loading="saving"
      width="640px"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveTenant"
    >
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="editor-form">
        <!-- 租户资料分区 -->
        <div class="form-section-title">租户基本资料</div>
        <div class="form-grid">
          <a-form-item label="租户名称" name="tenantName" class="full-row">
            <a-input v-model:value="formState.tenantName" :maxlength="100" show-count placeholder="请输入租户名称" />
          </a-form-item>
          <a-form-item label="租户类型" name="tenantType">
            <a-input v-model:value="formState.tenantType" :maxlength="100" show-count placeholder="例如：Enterprise" />
          </a-form-item>
          <a-form-item label="统一社会信用代码" name="creditCode">
            <a-input v-model:value="formState.creditCode" :maxlength="100" show-count placeholder="例如：91110000000000000X" />
          </a-form-item>
          <a-form-item label="Logo 图标地址" name="logo" class="full-row">
            <a-input v-model:value="formState.logo" :maxlength="200" placeholder="请输入 Logo 图片 URL 地址" />
          </a-form-item>
          <a-form-item label="租户描述" name="description" class="full-row">
            <a-textarea v-model:value="formState.description" :rows="3" :maxlength="200" show-count placeholder="请输入租户描述" />
          </a-form-item>
        </div>

        <!-- 管理员资料分区（仅新增租户时显示） -->
        <template v-if="!formState.id">
          <div class="form-section-title">租户管理员初始配置</div>
          <div class="form-grid">
            <a-form-item label="管理员账号" :name="['administrator', 'account']">
              <a-input v-model:value="formState.administrator.account" :maxlength="32" show-count placeholder="请输入管理员登录账号" autocomplete="off" />
            </a-form-item>
            <a-form-item label="管理员姓名" :name="['administrator', 'userName']">
              <a-input v-model:value="formState.administrator.userName" :maxlength="20" show-count placeholder="请输入管理员真实姓名" />
            </a-form-item>
            <a-form-item label="管理员密码" :name="['administrator', 'password']">
              <a-input-password
                v-model:value="formState.administrator.password"
                :maxlength="72"
                placeholder="请输入密码（8-72位）"
                autocomplete="new-password"
              />
            </a-form-item>
            <a-form-item label="手机号码" :name="['administrator', 'mobile']">
              <a-input v-model:value="formState.administrator.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
            </a-form-item>
          </div>
        </template>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue'
import {
  changeTenantLocked,
  changeTenantStatus,
  createTenant,
  deleteTenant,
  selectTenantPage,
  updateTenant,
} from '@/apis/upms/tenant'
import type {
  PageTenantParams,
  TenantCreateForm,
  TenantRecord,
  TenantUpdateForm,
} from '@/apis/upms/tenant/type'
import { tenantsStore, userStore } from '@/stores/modules/user'

interface TenantFormState {
  id?: string
  logo?: string
  tenantName: string
  description?: string
  creditCode?: string
  tenantType?: string
  administrator: {
    account: string
    password: string
    userName: string
    mobile?: string
  }
}

const defaultLogo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="4" fill="%232d5ec4"/><text x="50%" y="50%" font-size="14" font-weight="bold" fill="white" dominant-baseline="middle" text-anchor="middle">T</text></svg>'

const currentUser = userStore()
const currentTenant = tenantsStore()

// 使用 platformAdmin 判断是否为平台管理员
const isPlatformAdmin = computed(() => Boolean(currentUser.userInfo?.platformAdmin))

// 当前操作人所属租户 ID
const currentLoginTenantId = computed(() => currentTenant.userTenant.currentTenant?.id)
const isCurrentLoginTenant = (id?: string | number) => {
  if (!id || !currentLoginTenantId.value) return false
  return String(id) === String(currentLoginTenantId.value)
}

const loading = ref(false)
const saving = ref(false)
const editorOpen = ref(false)
const statusChangingId = ref<string>('')
const lockedChangingId = ref<string>('')
const deletingId = ref<string>('')
const records = ref<TenantRecord[]>([])
const total = ref(0)
const formRef = ref<FormInstance>()

const timeRange = ref<[string, string] | undefined>(undefined)

const query = reactive<{
  current: number
  size: number
  keyword: string
  times?: [string, string]
}>({
  current: 1,
  size: 10,
  keyword: '',
  times: undefined,
})

const emptyForm = (): TenantFormState => ({
  id: undefined,
  logo: '',
  tenantName: '',
  description: '',
  creditCode: '',
  tenantType: '',
  administrator: {
    account: '',
    password: '',
    userName: '',
    mobile: '',
  },
})

const formState = reactive<TenantFormState>(emptyForm())

const columns: TableColumnsType<TenantRecord> = [
  { title: 'Logo', key: 'logo', width: 50, align: 'center' },
  { title: '租户名称', dataIndex: 'tenantName', key: 'tenantName', width: 190 },
  { title: '租户类型', dataIndex: 'tenantType', key: 'tenantType', width: 120 },
  { title: '统一社会信用代码', dataIndex: 'creditCode', key: 'creditCode', width: 180 },
  { title: '管理员', dataIndex: 'adminUser', key: 'adminUser', width: 120 },
  { title: '状态', key: 'status', width: 90, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 230, align: 'right' },
]

const pagination = computed(() => ({
  current: query.current,
  pageSize: query.size,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

// 表单字段约束规则与后端一致
const rules: FormProps['rules'] = {
  tenantName: [
    { required: true, whitespace: true, message: '请输入租户名称', trigger: 'blur' },
    { max: 100, message: '租户名称最多 100 个字符', trigger: 'blur' },
  ],
  logo: [{ max: 200, message: 'Logo 地址最多 200 个字符', trigger: 'blur' }],
  description: [{ max: 200, message: '租户描述最多 200 个字符', trigger: 'blur' }],
  creditCode: [{ max: 100, message: '统一社会信用代码最多 100 个字符', trigger: 'blur' }],
  tenantType: [{ max: 100, message: '租户类型最多 100 个字符', trigger: 'blur' }],
  'administrator.account': [
    { required: true, whitespace: true, message: '请输入管理员账号', trigger: 'blur' },
    { max: 32, message: '管理员账号最多 32 个字符', trigger: 'blur' },
  ],
  'administrator.password': [
    { required: true, whitespace: true, message: '请输入管理员密码', trigger: 'blur' },
    { min: 8, max: 72, message: '管理员密码长度应为 8 至 72 个字符', trigger: 'blur' },
  ],
  'administrator.userName': [
    { required: true, whitespace: true, message: '请输入管理员姓名', trigger: 'blur' },
    { max: 20, message: '管理员姓名最多 20 个字符', trigger: 'blur' },
  ],
  'administrator.mobile': [{ max: 20, message: '手机号码最多 20 个字符', trigger: 'blur' }],
}

/** 分页查询租户列表 */
const loadTenants = async () => {
  loading.value = true
  try {
    const params: PageTenantParams = {
      current: query.current,
      size: query.size,
      keyword: query.keyword.trim() || undefined,
      times: timeRange.value && timeRange.value.length === 2 ? timeRange.value : undefined,
    }
    const response = await selectTenantPage(params)
    records.value = response.data?.records || []
    total.value = response.data?.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.current = 1
  void loadTenants()
}

const resetSearch = () => {
  query.current = 1
  query.size = 10
  query.keyword = ''
  timeRange.value = undefined
  void loadTenants()
}

const handleTableChange = (page: { current?: number, pageSize?: number }) => {
  query.current = page.current || 1
  query.size = page.pageSize || 10
  void loadTenants()
}

/** 打开新增租户表单 */
const openCreate = () => {
  if (!isPlatformAdmin.value) return
  Object.assign(formState, emptyForm())
  editorOpen.value = true
}

/** 打开修改租户基本资料表单 */
const openEdit = (record: TenantRecord) => {
  if (!isPlatformAdmin.value) return
  Object.assign(formState, {
    id: record.id,
    tenantName: record.tenantName || '',
    logo: record.logo || '',
    description: record.description || '',
    creditCode: record.creditCode || '',
    tenantType: record.tenantType || '',
    administrator: { account: '', password: '', userName: '', mobile: '' },
  })
  editorOpen.value = true
}

/** 保存租户（新增或修改） */
const saveTenant = async () => {
  if (!isPlatformAdmin.value) return
  await formRef.value?.validate()
  saving.value = true
  try {
    if (formState.id) {
      // 修改租户仅提交租户基本资料
      const updatePayload: TenantUpdateForm = {
        tenantName: formState.tenantName.trim(),
        logo: formState.logo?.trim() || undefined,
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        tenantType: formState.tenantType?.trim() || undefined,
      }
      await updateTenant(formState.id, updatePayload)
      message.success('租户修改成功')
    } else {
      // 新增租户提交基本资料与管理员账号信息
      const createPayload: TenantCreateForm = {
        tenantName: formState.tenantName.trim(),
        logo: formState.logo?.trim() || undefined,
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        tenantType: formState.tenantType?.trim() || undefined,
        administrator: {
          account: formState.administrator.account.trim(),
          password: formState.administrator.password,
          userName: formState.administrator.userName.trim(),
          mobile: formState.administrator.mobile?.trim() || undefined,
        },
      }
      await createTenant(createPayload)
      message.success('租户新增成功')
    }
    editorOpen.value = false
    await loadTenants()
  } finally {
    saving.value = false
  }
}

/** 启停状态二次确认 */
const confirmToggleStatus = (record: TenantRecord) => {
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
  const isEnabling = record.dataStatus === 0
  const actionText = isEnabling ? '启用' : '停用'
  const contentText = isEnabling
    ? '启用后，该租户下状态正常的用户可以重新登录。是否继续启用？'
    : '停用后，该租户下所有用户将立即退出登录，并且无法重新登录。是否继续停用？'

  Modal.confirm({
    title: `确认${actionText}租户`,
    content: contentText,
    okText: '确认',
    cancelText: '取消',
    okType: isEnabling ? 'primary' : 'danger',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        const nextStatus: 0 | 1 = isEnabling ? 1 : 0
        await changeTenantStatus(record.id, nextStatus)
        message.success(`租户已${actionText}`)
        await loadTenants()
      } finally {
        statusChangingId.value = ''
      }
    },
  })
}

/** 安全锁定/解锁二次确认 */
const confirmToggleLocked = (record: TenantRecord) => {
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
  const isLocking = !record.locked
  const actionText = isLocking ? '安全锁定' : '解除安全锁定'
  const contentText = isLocking
    ? '安全锁定后，该租户用户仍可登录，但租户将进入安全只读模式。是否继续锁定？'
    : '解除安全锁定后，租户将退出安全只读状态。是否继续解锁？'

  Modal.confirm({
    title: `确认${actionText}`,
    content: contentText,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      lockedChangingId.value = record.id
      try {
        await changeTenantLocked(record.id, isLocking)
        message.success(`租户已${actionText}`)
        await loadTenants()
      } finally {
        lockedChangingId.value = ''
      }
    },
  })
}

/** 删除租户二次确认 */
const confirmDelete = (record: TenantRecord) => {
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
  Modal.confirm({
    title: '确认删除租户',
    content: '删除后，该租户将无法继续登录，已有用户会被强制退出。租户关联的业务数据不会自动删除。是否确认删除？',
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteTenant(record.id)
        message.success('租户删除成功')
        if (records.value.length === 1 && query.current > 1) {
          query.current -= 1
        }
        await loadTenants()
      } finally {
        deletingId.value = ''
      }
    },
  })
}

onMounted(() => {
  void loadTenants()
})
</script>

<style scoped>
.table-panel {
  overflow: hidden;
}

.page-toolbar {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.filters,
.toolbar-actions,
.row-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.search-input {
  width: 240px;
}

.time-picker {
  width: 320px;
}

.logo-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tenant-logo-img {
  border-radius: var(--du-radius-sm);
  object-fit: cover;
}

.tenant-logo-placeholder {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: var(--du-radius-sm);
  background-color: var(--du-accent);
  color: #fff;
  font-family: var(--du-font-mono);
  font-size: 13px;
  font-weight: 700;
}

.tenant-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tenant-name-cell strong {
  color: var(--du-text);
  font-size: 11px;
}

.tenant-desc {
  max-width: 220px;
  overflow: hidden;
  color: var(--du-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-value {
  color: var(--du-text-secondary);
  font-family: var(--du-font-mono);
  font-size: 10px;
}

.admin-user-cell {
  font-size: 11px;
}

.status-cell {
  display: flex;
  justify-content: center;
}

.create-time-cell {
  color: var(--du-text-secondary);
  font-size: 10px;
}

.row-actions {
  justify-content: flex-end;
}

.row-actions :deep(.ant-btn) {
  padding-inline: 4px;
  font-size: 10px;
}

.table-panel :deep(.ant-table-cell) {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.editor-form {
  padding-top: var(--du-space-2);
}

.form-section-title {
  margin-bottom: var(--du-space-3);
  padding-bottom: var(--du-space-1);
  border-bottom: 1px dashed var(--du-border);
  color: var(--du-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.form-section-title:not(:first-child) {
  margin-top: var(--du-space-4);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 var(--du-space-4);
}

.full-row {
  grid-column: 1 / -1;
}
</style>
