<template>
  <!-- 租户管理页面采用 Dense Utility 紧凑布局与高信息密度表格 -->
  <section class="tenant-page">
    <div class="table-panel du-panel">
      <!-- 头部查询工具栏 -->
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索租户名称或统一社会信用代码"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-range-picker
            v-model:value="timeRange"
            allow-clear
            class="range-picker"
            value-format="YYYY-MM-DD HH:mm:ss"
            :show-time="{ defaultValue: ['00:00:00', '23:59:59'] }"
            :placeholder="['创建开始时间', '创建结束时间']"
            @change="handleTimeRangeChange"
          />

          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="handleResetSearch">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <div class="toolbar-actions">
          <a-button v-if="isPlatformAdmin" type="primary" @click="openCreate">
            <PlusOutlined />新增租户
          </a-button>
        </div>
      </header>

      <!-- 租户表格 -->
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
          <!-- 租户名称与描述 -->
          <div v-if="column.key === 'tenantName'" class="tenant-cell">
            <div class="tenant-logo-box">
              <img
                :src="resolveTenantLogo(record.logo)"
                alt="tenant logo"
                class="tenant-logo-img"
                loading="lazy"
                @error="handleLogoError"
              />
            </div>
            <div class="tenant-name-cell">
              <span class="tenant-title" :title="record.tenantName">{{ record.tenantName }}</span>
              <EllipsisText v-if="record.description" :text="record.description" max-width="100%" />
            </div>
          </div>

          <!-- 统一社会信用代码 -->
          <code v-else-if="column.key === 'creditCode'" class="code-value du-mono">
            {{ record.creditCode || '—' }}
          </code>

          <!-- 租户类型 -->
          <a-tag v-else-if="column.key === 'tenantType'" :color="record.tenantType === 'system' ? 'purple' : 'blue'">
            {{ getTenantTypeLabel(record.tenantType) }}
          </a-tag>

          <!-- 租户启停状态 dataStatus -->
          <div v-else-if="column.key === 'dataStatus'" class="status-cell">
            <StatusTag :value="record.dataStatus === 1" type="enabled" />
          </div>

          <!-- 租户安全锁定状态 locked -->
          <div v-else-if="column.key === 'locked'" class="status-cell">
            <StatusTag :value="record.locked" type="locked" active-text="安全锁定" inactive-text="未锁定" />
          </div>

          <!-- 创建时间 -->
          <span v-else-if="column.key === 'createTime'" class="create-time du-mono">
            {{ formatDateTime(record.createTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="isPlatformAdmin">
              <!-- 修改租户基本资料 -->
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />修改
              </a-button>

              <!-- 设置菜单（严格限制仅平台管理员 platformAdmin 可见可操作，其他用户全部隐藏） -->
              <a-button
                v-if="isPlatformAdmin && record.tenantType === 'ordinary'"
                type="link"
                size="small"
                @click="openMenuSettings(record)"
              >
                <SettingOutlined />设置菜单
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
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无租户数据" />
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑租户弹窗 -->
    <a-modal
      v-model:open="editorOpen"
      :title="formState.id ? '编辑租户资料' : '新增租户'"
      :confirm-loading="saving"
      width="640px"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSaveTenant"
    >
      <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="tenant-form">
        <!-- 租户基础资料分区 -->
        <div class="form-section-title">租户基本信息</div>
        <div class="form-grid">
          <a-form-item label="租户名称" name="tenantName" class="full-row">
            <a-input v-model:value="formState.tenantName" :maxlength="64" show-count placeholder="请输入租户名称" />
          </a-form-item>

          <a-form-item label="统一社会信用代码" name="creditCode">
            <a-input v-model:value="formState.creditCode" :maxlength="18" show-count placeholder="18位统一社会信用代码" />
          </a-form-item>

          <a-form-item label="租户类型" name="tenantType">
            <a-select
              v-model:value="formState.tenantType"
              :options="tenantTypeFormOptions"
              :disabled="Boolean(formState.id)"
              placeholder="请选择租户类型"
            />
          </a-form-item>

          <a-form-item label="租户描述" name="description" class="full-row">
            <a-textarea v-model:value="formState.description" :maxlength="255" :rows="2" show-count placeholder="请输入租户简要描述" />
          </a-form-item>

          <a-form-item label="Logo 地址" name="logo" class="full-row">
            <a-input v-model:value="formState.logo" :maxlength="255" placeholder="请输入 Logo 图片 URL 地址（选填）" />
          </a-form-item>
        </div>

        <!-- 管理员资料分区（仅新增租户时显示） -->
        <template v-if="!formState.id">
          <div class="form-section-title">租户管理员初始配置</div>
          <div class="form-grid">
            <a-form-item label="管理员账号" :name="['administrator', 'account']" :rules="administratorAccountRules">
              <a-input v-model:value="formState.administrator.account" :maxlength="32" show-count placeholder="请输入管理员登录账号" autocomplete="off" />
            </a-form-item>
            <a-form-item label="管理员姓名" :name="['administrator', 'userName']" :rules="administratorUserNameRules">
              <a-input v-model:value="formState.administrator.userName" :maxlength="20" show-count placeholder="请输入管理员真实姓名" />
            </a-form-item>
            <a-form-item label="管理员密码" :name="['administrator', 'password']" :rules="passwordRules">
              <a-input-password
                v-model:value="formState.administrator.password"
                :maxlength="72"
                :placeholder="passwordPlaceholder"
                autocomplete="new-password"
              />
            </a-form-item>
            <a-form-item label="手机号码" :name="['administrator', 'mobile']" :rules="administratorMobileRules">
              <a-input v-model:value="formState.administrator.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
            </a-form-item>
          </div>
        </template>
      </a-form>
    </a-modal>

    <!-- 租户设置菜单抽屉 -->
    <a-drawer
      v-model:open="menuSettingsOpen"
      :title="`设置菜单 - ${menuSettingsTenant?.tenantName || ''}`"
      width="580"
      :closable="!menuSettingsSaving"
      :mask-closable="!menuSettingsSaving"
      @close="closeMenuSettings"
    >
      <template #extra>
        <a-button :disabled="menuSettingsSaving" @click="menuSettingsOpen = false">取消</a-button>
        <a-button type="primary" :loading="menuSettingsSaving" @click="handleSaveMenuSettings">保存菜单</a-button>
      </template>

      <a-spin :spinning="menuSettingsLoading">
        <div class="menu-drawer-summary">
          <div>
            <strong>{{ menuSettingsTenant?.tenantName }}</strong>
            <small class="du-mono code-value">{{ menuSettingsTenant?.creditCode || '普通租户' }}</small>
          </div>
          <span>已选择 <b>{{ checkedKeys.length }}</b> 个菜单</span>
        </div>

        <a-alert
          message="为该普通租户分配可用菜单。收回已有菜单时将同步清除该租户下角色对应的菜单授权。"
          type="info"
          show-icon
          class="menu-drawer-alert"
        />

        <div class="tree-toolbar">
          <a-button size="small" @click="expandAll(menuTree)">全部展开</a-button>
          <a-button size="small" @click="collapseAll">全部收起</a-button>
          <a-button size="small" @click="checkAll(menuTree)">全选</a-button>
          <a-button size="small" @click="clearChecked">清空选择</a-button>
        </div>

        <a-tree
          v-if="menuTree.length"
          v-model:expandedKeys="expandedKeys"
          :tree-data="menuTree"
          :checked-keys="checkedKeys"
          checkable
          block-node
          @check="onTreeCheck"
        >
          <template #title="node">
            <div class="menu-node-title">
              <component :is="resolveMenuIcon(node.menuIcon)" class="node-icon" />
              <span class="node-name">{{ node.title }}</span>
              <a-tag :color="node.menuType === 'DIRECTORY' ? 'orange' : 'blue'" class="node-type-tag">
                {{ node.menuType === 'DIRECTORY' ? '目录' : '菜单' }}
              </a-tag>
            </div>
          </template>
        </a-tree>
        <a-empty v-else-if="!menuSettingsLoading" description="暂无可分配的已启用菜单" />
      </a-spin>
    </a-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
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
  createTenant,
  deleteTenant,
  getTenantMenuSettings,
  replaceTenantMenus,
  selectTenantPage,
  updateTenant,
} from '@/apis/upms/tenant'
import type {
  PageTenantParams,
  TenantCreateForm,
  TenantRecord,
  TenantUpdateForm,
} from '@/apis/upms/tenant/type'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { resolveMenuIcon } from '@/config/menuIcons'
import { tenantsStore, userStore } from '@/stores/modules/user'
import { useSystemConfigStore } from '@/stores/modules/config'
import { getSystemDictLabel, SYSTEM_DICT_TYPE, toSystemDictOptions } from '@/utils/SystemDict'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import { useTablePagination } from '@/composables/useTablePagination'
import { usePasswordPolicy } from '@/composables/usePasswordPolicy'
import {
  buildTreeStructure,
  collectAncestorKeys,
  useTreeSelection,
  type TreeNodeItem,
} from '@/composables/useTreeHelper'
import EllipsisText from '@/components/EllipsisText.vue'
import StatusTag from '@/components/StatusTag.vue'

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

const currentUser = userStore()
const currentTenant = tenantsStore()
const configStore = useSystemConfigStore()

/**
 * 平台管理员严格判定：
 * 仅允许平台管理员（userInfo.platformAdmin 为 true 或拥有 platformAdmin / PLATFORM_ADMIN 角色）。
 * 绝不使用通用菜单写权限进行兜底，确保非平台管理员一律被判定为 false 并隐藏“设置菜单”。
 */
const isPlatformAdmin = computed(() => {
  const pAdmin: unknown = currentUser.userInfo?.platformAdmin
  if (pAdmin === true || pAdmin === 1 || String(pAdmin) === 'true') return true
  if (
    currentUser.roles?.some((r) => {
      const code = String(r.roleCode || '').trim().toLowerCase()
      return code === 'platformadmin' || code === 'platform_admin'
    })
  ) {
    return true
  }
  return false
})

// 当前操作人所属租户 ID
const currentLoginTenantId = computed(() => currentTenant.userTenant.currentTenant?.id)
const isCurrentLoginTenant = (id?: string | number) => {
  if (!id || !currentLoginTenantId.value) return false
  return String(id) === String(currentLoginTenantId.value)
}

// 按钮独立 Loading 状态
const saving = ref(false)
const editorOpen = ref(false)
const statusChangingId = ref<string>('')
const lockedChangingId = ref<string>('')
const deletingId = ref<string>('')
const formRef = ref<FormInstance>()
const timeRange = ref<[string, string] | undefined>(undefined)

// 使用通用表格分页 Hook
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
} = useTablePagination<TenantRecord, PageTenantParams>(
  selectTenantPage,
  {
    current: 1,
    size: 10,
    keyword: '',
    times: undefined,
  },
  { defaultSize: 10 }
)

// 使用通用密码策略 Hook
const { passwordRules, passwordPlaceholder } = usePasswordPolicy({
  required: true,
  requiredMessage: '请输入管理员密码',
  fieldLabel: '管理员密码',
})

// 租户类型字典加载
const tenantTypeDict = ref<SystemDictData[]>([])
const tenantTypeOptions = computed(() => toSystemDictOptions(tenantTypeDict.value, (value) => value))
const getTenantTypeLabel = (value: unknown) => getSystemDictLabel(tenantTypeDict.value, value)

const tenantTypeFormOptions = computed(() => {
  if (!formState.id) {
    const ordinaryItem = tenantTypeDict.value.find((item) => item.dictValue === 'ordinary')
    return [{ label: ordinaryItem ? ordinaryItem.dictLabel : '普通租户', value: 'ordinary' }]
  }
  if (tenantTypeOptions.value.length) return tenantTypeOptions.value
  return [{ label: getTenantTypeLabel(formState.tenantType), value: formState.tenantType || 'ordinary' }]
})

const loadDictionaries = async () => {
  try {
    const response = await getEnabledDictData(SYSTEM_DICT_TYPE.tenantType)
    tenantTypeDict.value = response.data || []
  } catch (err) {
    console.warn('加载租户类型字典失败:', err)
  }
}

const emptyForm = (): TenantFormState => ({
  id: undefined,
  logo: '',
  tenantName: '',
  description: '',
  creditCode: '',
  tenantType: 'ordinary',
  administrator: {
    account: '',
    password: '',
    userName: '',
    mobile: '',
  },
})

const formState = reactive<TenantFormState>(emptyForm())

// 表格列定义
const columns = computed<TableColumnsType<TenantRecord>>(() => [
  { title: '租户名称', dataIndex: 'tenantName', key: 'tenantName', width: 260, ellipsis: true },
  { title: '统一社会信用代码', dataIndex: 'creditCode', key: 'creditCode', width: 180 },
  { title: '租户类型', dataIndex: 'tenantType', key: 'tenantType', width: 100 },
  { title: '启用状态', key: 'dataStatus', width: 85, align: 'center' },
  { title: '安全锁定', key: 'locked', width: 90, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 155 },
  { title: '操作', key: 'actions', width: 280, align: 'right', fixed: 'right' },
])

const handleTimeRangeChange = (val: unknown) => {
  const dates = val as [string, string] | undefined
  query.times = dates && dates.length === 2 ? [dates[0], dates[1]] : undefined
}

const handleResetSearch = () => {
  timeRange.value = undefined
  resetSearch({ times: undefined })
}

const DEFAULT_TENANT_LOGO = '/tenant-default.svg'

/**
 * 校验并解析租户 Logo 地址：
 * 仅允许合法的 http:// 或 https:// 网络地址，否则一律使用系统默认的科技蓝租户 Logo
 */
const resolveTenantLogo = (logo?: string | null): string => {
  if (!logo) return DEFAULT_TENANT_LOGO
  const trimmed = logo.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return DEFAULT_TENANT_LOGO
}

/** 图片加载失败（如 404、破图或非法网络图片）时自动平滑回退到默认 Logo */
const handleLogoError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target && target.src !== DEFAULT_TENANT_LOGO) {
    target.src = DEFAULT_TENANT_LOGO
  }
}

// ==================== 表单校验规则 ====================
const formRules: Record<string, Rule[]> = {
  tenantName: [
    { required: true, whitespace: true, message: '请输入租户名称', trigger: 'blur' },
    { max: 64, message: '租户名称最多 64 个字符', trigger: 'blur' },
  ],
  creditCode: [
    {
      pattern: /^[0-9A-HJ-NPQRTUWXY]{18}$/,
      message: '统一社会信用代码必须由 18 位大写字母或数字组成',
      trigger: 'blur',
    },
  ],
}

const administratorAccountRules: Rule[] = [
  { required: true, whitespace: true, message: '请输入管理员账号', trigger: 'blur' },
  { max: 32, message: '账号最多 32 个字符', trigger: 'blur' },
]

const administratorUserNameRules: Rule[] = [
  { required: true, whitespace: true, message: '请输入管理员真实姓名', trigger: 'blur' },
  { max: 20, message: '姓名最多 20 个字符', trigger: 'blur' },
]

const administratorMobileRules: Rule[] = [
  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号码', trigger: 'blur' },
]

// ==================== 新增与编辑租户 ====================
const openCreate = () => {
  if (!isPlatformAdmin.value) return
  Object.assign(formState, emptyForm())
  void configStore.fetchConfigs()
  editorOpen.value = true
}

const openEdit = (record: TenantRecord) => {
  if (!isPlatformAdmin.value) return
  Object.assign(formState, {
    id: record.id,
    logo: record.logo || '',
    tenantName: record.tenantName,
    description: record.description || '',
    creditCode: record.creditCode || '',
    tenantType: record.tenantType || 'ordinary',
    administrator: { account: '', password: '', userName: '', mobile: '' },
  })
  editorOpen.value = true
}

const handleSaveTenant = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (formState.id) {
      const updateData: TenantUpdateForm = {
        tenantName: formState.tenantName.trim(),
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        logo: formState.logo?.trim() || undefined,
      }
      await updateTenant(formState.id, updateData)
      message.success('租户资料更新成功')
    } else {
      const createData: TenantCreateForm = {
        tenantName: formState.tenantName.trim(),
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        logo: formState.logo?.trim() || undefined,
        tenantType: 'ordinary',
        administrator: {
          account: formState.administrator.account.trim(),
          password: formState.administrator.password,
          userName: formState.administrator.userName.trim(),
          mobile: formState.administrator.mobile?.trim() || undefined,
        },
      }
      await createTenant(createData)
      message.success('新增租户成功')
    }
    editorOpen.value = false
    await loadTenants()
  } finally {
    saving.value = false
  }
}

// ==================== 启停与锁定操作 ====================
const confirmToggleStatus = (record: TenantRecord) => {
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
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
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
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
  if (!isPlatformAdmin.value || isCurrentLoginTenant(record.id)) return
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

// ==================== 租户设置菜单抽屉（使用 useTreeSelection 与 useTreeHelper） ====================
const menuSettingsOpen = ref(false)
const menuSettingsLoading = ref(false)
const menuSettingsSaving = ref(false)
const menuSettingsTenant = ref<TenantRecord | null>(null)
const menuTree = ref<TreeNodeItem[]>([])
const originalSelectedMenuIds = ref<string[]>([])

const {
  checkedKeys,
  expandedKeys,
  onTreeCheck,
  expandAll,
  collapseAll,
  checkAll,
  clearChecked,
  getSelectedAndHalfKeys,
} = useTreeSelection()

const openMenuSettings = async (record: TenantRecord) => {
  if (!isPlatformAdmin.value || record.tenantType !== 'ordinary') return
  menuSettingsTenant.value = record
  menuSettingsOpen.value = true
  menuSettingsLoading.value = true
  clearChecked()
  collapseAll()
  menuTree.value = []
  originalSelectedMenuIds.value = []

  try {
    const response = await getTenantMenuSettings(record.id)
    const data = response.data
    if (!data) return
    const menus = data.menus || []
    const selected = (data.selectedMenuIds || []).map(String)
    originalSelectedMenuIds.value = [...selected]
    checkedKeys.value = [...selected]

    menuTree.value = buildTreeStructure(menus, {
      titleKey: 'menuName',
      transform: (item) => ({
        key: String(item.id),
        title: item.menuName || '未命名菜单',
        parentId: item.parentId ? String(item.parentId) : null,
        menuType: item.menuType || 'MENU',
        menuIcon: item.menuIcon,
        sort: Number(item.sort ?? 0),
        children: [],
      }),
    })

    expandedKeys.value = collectAncestorKeys(selected, menus)
  } finally {
    menuSettingsLoading.value = false
  }
}

const closeMenuSettings = () => {
  menuTree.value = []
  clearChecked()
  collapseAll()
  originalSelectedMenuIds.value = []
  menuSettingsTenant.value = null
}

const executeSaveMenus = async (menuIds: string[]) => {
  if (!menuSettingsTenant.value) return
  menuSettingsSaving.value = true
  try {
    await replaceTenantMenus(menuSettingsTenant.value.id, { menuIds })
    message.success('租户菜单设置成功')
    menuSettingsOpen.value = false
    closeMenuSettings()
    await loadTenants()
  } finally {
    menuSettingsSaving.value = false
  }
}

const handleSaveMenuSettings = async () => {
  if (!menuSettingsTenant.value) return
  const finalMenuIds = getSelectedAndHalfKeys()
  const isRevoking = originalSelectedMenuIds.value.some((id) => !finalMenuIds.includes(id))
  const isClearing = finalMenuIds.length === 0 && originalSelectedMenuIds.value.length > 0

  if (isClearing || isRevoking) {
    confirmAction({
      title: '确认收回租户菜单',
      content:
        '收回租户菜单后，该租户下角色对应的菜单授权也会同步移除，且不会在重新开放菜单时自动恢复。是否继续保存？',
      okText: '确认保存',
      okType: 'danger',
      onOk: async () => {
        await executeSaveMenus(finalMenuIds)
      },
    })
  } else {
    await executeSaveMenus(finalMenuIds)
  }
}

onMounted(async () => {
  void loadTenants()
  void loadDictionaries()
  void configStore.fetchConfigs()
  try {
    await Promise.all([currentUser.getUserInfo(), currentUser.getUserRoles()])
  } catch {
    // 忽略拦截器已处理的错误
  }
})
</script>

<style scoped>
.table-panel {
  overflow: hidden;
}

.page-toolbar {
  display: flex;
  min-height: 52px;
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
  width: 260px;
}

.range-picker {
  width: 320px;
}

.tenant-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  overflow: hidden;
}

.tenant-logo-box {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  max-width: 32px;
  max-height: 32px;
  flex: 0 0 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.tenant-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tenant-name-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  overflow: hidden;
}

.tenant-title {
  color: var(--du-text);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tenant-desc {
  color: var(--du-text-muted);
  font-size: 10px;
  line-height: 1.2;
}

.code-value {
  color: var(--du-text);
  font-size: 11px;
}

.status-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-tag {
  margin-right: 0;
  font-size: 10px;
  line-height: 18px;
}

.normal-status {
  color: var(--du-text-secondary);
  font-size: 11px;
}

.create-time {
  color: var(--du-text-secondary);
  font-size: 10px;
  white-space: nowrap;
}

.row-actions {
  justify-content: flex-end;
}

.row-actions :deep(.ant-btn) {
  padding-inline: 4px;
  font-size: 10px;
}

.readonly-label {
  color: var(--du-text-muted);
  font-size: 10px;
}

.table-panel :deep(.ant-table-cell) {
  vertical-align: middle !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.table-panel :deep(.ant-table-tbody > tr > td) {
  vertical-align: middle !important;
}

.tenant-form {
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

.menu-drawer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--du-space-2) var(--du-space-3);
  margin-bottom: var(--du-space-3);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius);
  background-color: var(--du-bg-subtle);
  font-size: 11px;
}

.menu-drawer-summary strong {
  display: block;
  color: var(--du-text);
  font-weight: 600;
}

.menu-drawer-summary small {
  color: var(--du-text-muted);
}

.menu-drawer-summary span b {
  color: var(--du-accent);
}

.menu-drawer-alert {
  margin-bottom: var(--du-space-3);
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  margin-bottom: var(--du-space-2);
}

.menu-node-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.node-icon {
  font-size: 11px;
  color: var(--du-text-muted);
}

.node-name {
  color: var(--du-text);
}

.node-type-tag {
  margin-right: 0;
  font-size: 9px;
  line-height: 14px;
  padding-inline: 4px;
}
</style>
