<template>
  <!-- 用户管理页面：左侧组织树筛选，右侧紧凑表格与系统操作 -->
  <section class="user-page">
    <!-- 左侧组织树面板 -->
    <aside class="org-sidebar du-panel">
      <div class="sidebar-header">
        <span class="sidebar-title">
          <ClusterOutlined />组织架构
        </span>
        <a-tooltip title="刷新组织树">
          <a-button type="text" size="small" :loading="orgTreeLoading" @click="loadOrgTree">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </div>

      <div class="tree-search">
        <a-input v-model:value="orgSearchKeyword" allow-clear placeholder="过滤组织..." size="small">
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </div>

      <div class="tree-container">
        <!-- 顶部全部用户固定节点 -->
        <div
          class="all-users-node"
          :class="{ 'is-selected': selectedOrgId === '' }"
          @click="selectOrg('')"
        >
          <TeamOutlined />
          <span>全部用户</span>
          <a-badge v-if="total !== undefined" :count="selectedOrgId === '' ? total : undefined" class="all-count-badge" />
        </div>

        <a-spin :spinning="orgTreeLoading">
          <a-tree
            v-if="filteredOrgTree.length"
            v-model:selectedKeys="selectedOrgKeys"
            :tree-data="filteredOrgTree"
            :expanded-keys="orgExpandedKeys"
            :auto-expand-parent="true"
            block-node
            @select="onOrgSelect"
            @expand="onOrgExpand"
          >
            <template #title="node">
              <span class="org-node-title" :title="node.title">
                <ApartmentOutlined class="org-icon" />
                <span class="org-text">{{ node.title }}</span>
              </span>
            </template>
          </a-tree>
          <a-empty v-else-if="!orgTreeLoading" description="暂无组织" class="empty-tree" />
        </a-spin>
      </div>
    </aside>

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
          <a-button v-if="canWrite" type="primary" @click="openCreate">
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
              <!-- 编辑基础信息（始终允许） -->
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

    <!-- 弹窗 1：新增用户弹窗 -->
    <a-modal
      v-model:open="createModalOpen"
      title="新增用户"
      width="680px"
      :confirm-loading="savingUser"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleCreateUser"
    >
      <a-form ref="createFormRef" :model="createForm" layout="vertical" class="user-modal-form">
        <div class="form-section-title">基础账号信息</div>
        <div class="form-grid">
          <a-form-item label="登录账号" name="account" :rules="accountRules">
            <a-input v-model:value="createForm.account" :maxlength="32" show-count placeholder="请输入账号（字母或数字）" autocomplete="off" />
          </a-form-item>

          <a-form-item label="登录密码" name="password" :rules="passwordRules">
            <a-input-password
              v-model:value="createForm.password"
              :maxlength="72"
              :placeholder="passwordPlaceholder"
              autocomplete="new-password"
            />
          </a-form-item>

          <a-form-item label="真实姓名" name="userName" :rules="userNameRules">
            <a-input v-model:value="createForm.userName" :maxlength="20" show-count placeholder="请输入真实姓名" />
          </a-form-item>

          <a-form-item label="用户昵称" name="nickName">
            <a-input v-model:value="createForm.nickName" :maxlength="32" show-count placeholder="请输入昵称" />
          </a-form-item>

          <a-form-item label="手机号码" name="mobile" :rules="mobileRules">
            <a-input v-model:value="createForm.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
          </a-form-item>

          <a-form-item label="出生日期" name="birthday">
            <a-date-picker
              v-model:value="createForm.birthday"
              value-format="YYYY-MM-DD"
              class="w-full"
              placeholder="请选择出生日期"
            />
          </a-form-item>

          <a-form-item label="性别" name="gender">
            <a-radio-group v-model:value="createForm.gender">
              <a-radio :value="1">男</a-radio>
              <a-radio :value="2">女</a-radio>
              <a-radio :value="0">未知</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="头像地址" name="avatar">
            <a-input v-model:value="createForm.avatar" :maxlength="255" placeholder="请输入头像 URL 地址" />
          </a-form-item>
        </div>

        <div class="form-section-title">权限与组织归属</div>
        <div class="form-grid">
          <a-form-item label="分配角色" name="roleIds" class="full-row">
            <a-select
              v-model:value="createForm.roleIds"
              mode="multiple"
              allow-clear
              :options="roleOptions"
              :loading="roleListLoading"
              placeholder="请选择分配给该用户的角色"
            />
          </a-form-item>

          <a-form-item label="分配组织" name="organizationIds" class="full-row">
            <a-tree-select
              v-model:value="createForm.organizationIds"
              :tree-data="orgSelectTreeData"
              tree-checkable
              tree-default-expand-all
              allow-clear
              placeholder="请勾选所属组织机构"
              @change="onCreateOrgChange"
            />
          </a-form-item>

          <a-form-item label="主组织" name="primaryOrganizationId" class="full-row">
            <a-select
              v-model:value="createForm.primaryOrganizationId"
              allow-clear
              :disabled="!createForm.organizationIds?.length"
              :options="createPrimaryOrgOptions"
              placeholder="请从已勾选的组织中选定主组织"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <!-- 弹窗 2：编辑用户基础信息弹窗 -->
    <a-modal
      v-model:open="editModalOpen"
      title="编辑用户资料"
      width="580px"
      :confirm-loading="savingUser"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleUpdateUser"
    >
      <a-spin :spinning="detailLoading">
        <a-form ref="editFormRef" :model="editForm" layout="vertical" class="user-modal-form">
          <div class="form-grid">
            <a-form-item label="登录账号" name="account" :rules="accountRules">
              <a-input v-model:value="editForm.account" :maxlength="32" show-count placeholder="请输入登录账号" />
            </a-form-item>

            <a-form-item label="真实姓名" name="userName" :rules="userNameRules">
              <a-input v-model:value="editForm.userName" :maxlength="20" show-count placeholder="请输入真实姓名" />
            </a-form-item>

            <a-form-item label="用户昵称" name="nickName">
              <a-input v-model:value="editForm.nickName" :maxlength="32" show-count placeholder="请输入用户昵称" />
            </a-form-item>

            <a-form-item label="手机号码" name="mobile" :rules="mobileRules">
              <a-input v-model:value="editForm.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
            </a-form-item>

            <a-form-item label="出生日期" name="birthday">
              <a-date-picker
                v-model:value="editForm.birthday"
                value-format="YYYY-MM-DD"
                class="w-full"
                placeholder="请选择出生日期"
              />
            </a-form-item>

            <a-form-item label="性别" name="gender">
              <a-radio-group v-model:value="editForm.gender">
                <a-radio :value="1">男</a-radio>
                <a-radio :value="2">女</a-radio>
                <a-radio :value="0">未知</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="头像地址" name="avatar" class="full-row">
              <a-input v-model:value="editForm.avatar" :maxlength="255" placeholder="请输入头像 URL 地址" />
            </a-form-item>
          </div>
        </a-form>
      </a-spin>
    </a-modal>

    <!-- 弹窗 3：设置角色弹窗 -->
    <a-modal
      v-model:open="roleModalOpen"
      :title="`设置角色 - ${currentRecord?.userName || currentRecord?.account || ''}`"
      width="520px"
      :confirm-loading="savingRoles"
      ok-text="保存角色"
      cancel-text="取消"
      @ok="handleSaveRoles"
    >
      <a-spin :spinning="roleAssignLoading">
        <div class="assign-summary">
          <span>登录账号：<code class="du-mono font-bold">{{ currentRecord?.account }}</code></span>
          <span>已选 <b>{{ targetRoleIds.length }}</b> 个角色</span>
        </div>
        <a-alert message="设置将全量替换该用户的角色分配。若清空全部角色，该用户将失去角色对应菜单及功能权限。" type="info" show-icon class="mb-3" />
        <div class="tree-toolbar mb-2">
          <a-button size="small" @click="targetRoleIds = roleOptions.map(r => String(r.value))">全选</a-button>
          <a-button size="small" @click="targetRoleIds = []">清空</a-button>
        </div>
        <div class="role-select-box">
          <a-checkbox-group v-model:value="targetRoleIds" class="role-checkbox-group">
            <a-checkbox v-for="item in roleOptions" :key="item.value" :value="String(item.value)">
              {{ item.label }}
            </a-checkbox>
          </a-checkbox-group>
          <a-empty v-if="!roleOptions.length" description="暂无可分配角色" />
        </div>
      </a-spin>
    </a-modal>

    <!-- 弹窗 4：设置组织弹窗 -->
    <a-modal
      v-model:open="orgModalOpen"
      :title="`设置组织 - ${currentRecord?.userName || currentRecord?.account || ''}`"
      width="560px"
      :confirm-loading="savingOrgs"
      ok-text="保存组织"
      cancel-text="取消"
      @ok="handleSaveOrgs"
    >
      <a-spin :spinning="orgAssignLoading">
        <div class="assign-summary">
          <span>登录账号：<code class="du-mono font-bold">{{ currentRecord?.account }}</code></span>
          <span>已归属 <b>{{ targetOrgIds.length }}</b> 个组织</span>
        </div>
        <a-alert message="全量替换用户所属组织机构。如需设置主组织，请先勾选对应组织后在下方下拉框中指定。" type="info" show-icon class="mb-3" />
        <a-form layout="vertical">
          <a-form-item label="所属组织">
            <a-tree-select
              v-model:value="targetOrgIds"
              :tree-data="orgSelectTreeData"
              tree-checkable
              tree-default-expand-all
              allow-clear
              placeholder="请勾选用户所属的组织架构"
              @change="onAssignOrgChange"
            />
          </a-form-item>

          <a-form-item label="主组织">
            <a-select
              v-model:value="targetPrimaryOrgId"
              allow-clear
              :disabled="!targetOrgIds.length"
              :options="assignPrimaryOrgOptions"
              placeholder="请从已选组织中选择主组织"
            />
          </a-form-item>
        </a-form>
      </a-spin>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  ApartmentOutlined,
  ClusterOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import type { Id } from '@/apis/types'
import {
  changeUserEnabled,
  changeUserLocked,
  createUser,
  deleteUser,
  getUserDetail,
  getUserOrganizations,
  getUserPage,
  getUserRoles,
  replaceUserOrganizations,
  replaceUserRoles,
  updateUser,
} from '@/apis/upms/user'
import type {
  UserCreatePayload,
  UserQueryParams,
  UserRecord,
  UserUpdatePayload,
} from '@/apis/upms/user/type'
import { getOrganizationTree } from '@/apis/upms/organization'
import type { Organization } from '@/apis/upms/organization/type'
import { getSystemRolePage } from '@/apis/upms/role'
import type { SystemRole } from '@/apis/upms/role/type'
import { menusStore, tenantsStore, userStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { usePasswordPolicy } from '@/composables/usePasswordPolicy'
import { filterTreeNodes } from '@/composables/useTreeHelper'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()
const currentMenus = menusStore()
const currentUser = userStore()

// 权限控制
const canWrite = computed(() => currentMenus.canWritePath(route.path))

interface AdminStatusInfo {
  isPlatformAdmin: boolean
  isTenantAdmin: boolean
  isProtected: boolean
  label: string
}

/**
 * 判断用户是否为平台管理员或租户管理员
 * 严格依据系统内置角色 code（platformAdmin / tenantAdmin）与后端字段判断，绝不依赖中文名称
 */
const getAdminStatus = (record: UserRecord): AdminStatusInfo => {
  const currentTenant = tenantsStore().userTenant.currentTenant
  const currentTenantAdminId = currentTenant?.tenantAdminUser ? String(currentTenant.tenantAdminUser) : ''
  const userId = String(record.id || '')

  const rawRecord = record as unknown as Record<string, unknown>

  // 1. 判断平台管理员：依据 platformAdmin 字段或系统内置角色 code 'platformAdmin'
  const isPlatformByProp = rawRecord.platformAdmin === true || rawRecord.platformAdmin === 1
  const isPlatformByRole = (record.roles || []).some((r) => {
    const code = String(r.roleCode || '').trim().toLowerCase().replace(/[-_]/g, '')
    return code === 'platformadmin'
  })
  const isPlatformAdmin = isPlatformByProp || isPlatformByRole

  // 2. 判断租户管理员：依据 tenantAdmin 字段、租户绑定的 tenantAdminUser ID、或系统内置角色 code 'tenantAdmin'
  const isTenantByProp = rawRecord.tenantAdmin === true || rawRecord.tenantAdmin === 1
  const isTenantById = Boolean(currentTenantAdminId && userId && currentTenantAdminId === userId)
  const isTenantByRole = (record.roles || []).some((r) => {
    const code = String(r.roleCode || '').trim().toLowerCase().replace(/[-_]/g, '')
    return code === 'tenantadmin'
  })
  const isTenantAdmin = isTenantByProp || isTenantById || isTenantByRole

  const isBuiltIn = Boolean(rawRecord.builtIn)
  const isProtected = isPlatformAdmin || isTenantAdmin || isBuiltIn
  const label = isPlatformAdmin ? '平台管理员' : isTenantAdmin ? '租户管理员' : isBuiltIn ? '系统内置' : ''

  return {
    isPlatformAdmin,
    isTenantAdmin,
    isProtected,
    label,
  }
}

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
const selectedOrgKeys = ref<string[]>([])
const orgExpandedKeys = ref<string[]>([])
const orgSearchKeyword = ref('')
const rawOrgTree = ref<Organization[]>([])
const orgTreeLoading = ref(false)

const statusChangingId = ref<string>('')
const lockChangingId = ref<string>('')
const deletingId = ref<string>('')

// 使用通用的 useTablePagination 逻辑 Hook
const {
  loading,
  records,
  total,
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
  { defaultSize: 10 }
)

// 使用通用的 usePasswordPolicy 密码策略 Hook
const { passwordRules, passwordPlaceholder } = usePasswordPolicy({
  required: true,
  requiredMessage: '请输入登录密码',
  fieldLabel: '登录密码',
})

// ==================== 组织树转换与筛选 ====================
interface OrgTreeNode {
  key: string
  value: string
  title: string
  children?: OrgTreeNode[]
}

const mapOrgToTree = (items: Organization[]): OrgTreeNode[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const orgSelectTreeData = computed(() => mapOrgToTree(rawOrgTree.value))

const filteredOrgTree = computed(() => {
  const tree = mapOrgToTree(rawOrgTree.value)
  return filterTreeNodes(tree, orgSearchKeyword.value)
})

const loadOrgTree = async () => {
  orgTreeLoading.value = true
  try {
    const response = await getOrganizationTree({ enabled: true })
    rawOrgTree.value = response.data || []
    if (orgExpandedKeys.value.length === 0) {
      orgExpandedKeys.value = rawOrgTree.value.map((o) => String(o.id))
    }
  } catch (err) {
    console.warn('加载组织树失败:', err)
  } finally {
    orgTreeLoading.value = false
  }
}

const onOrgExpand = (keys: unknown) => {
  orgExpandedKeys.value = (keys as string[]) || []
}

const selectOrg = (orgId: string) => {
  selectedOrgId.value = orgId
  selectedOrgKeys.value = orgId ? [orgId] : []
  query.organizationId = orgId || undefined
  handleSearch()
}

const onOrgSelect = (selectedKeys: unknown[]) => {
  const firstKey = selectedKeys[0] ? String(selectedKeys[0]) : ''
  selectOrg(firstKey)
}

// ==================== 角色列表加载 ====================
const rawRoles = ref<SystemRole[]>([])
const roleListLoading = ref(false)
const roleOptions = computed(() =>
  rawRoles.value.map((r) => ({
    label: r.roleName,
    value: String(r.id),
  }))
)

const loadRoles = async () => {
  roleListLoading.value = true
  try {
    const res = await getSystemRolePage({ current: 1, size: 200, dataStatus: 1 })
    rawRoles.value = res.data?.records || []
  } catch (err) {
    console.warn('加载角色失败:', err)
  } finally {
    roleListLoading.value = false
  }
}

// ==================== 表单约束规则 ====================
const accountRules: Rule[] = [
  { required: true, whitespace: true, message: '请输入登录账号', trigger: ['blur', 'change'] },
  { max: 32, message: '账号最多 32 个字符', trigger: ['blur', 'change'] },
]

const userNameRules: Rule[] = [
  { required: true, whitespace: true, message: '请输入真实姓名', trigger: ['blur', 'change'] },
  { max: 20, message: '真实姓名最多 20 个字符', trigger: ['blur', 'change'] },
]

const mobileRules: Rule[] = [
  { max: 20, message: '手机号码最多 20 个字符', trigger: ['blur', 'change'] },
]

// ==================== 新增用户 ====================
const createModalOpen = ref(false)
const savingUser = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive<UserCreatePayload>({
  account: '',
  password: '',
  userName: '',
  nickName: '',
  mobile: '',
  birthday: '',
  gender: 1,
  avatar: '',
  roleIds: [],
  organizationIds: [],
  primaryOrganizationId: undefined,
})

const findOrgNames = (ids: Id[], tree: Organization[]): { label: string; value: string }[] => {
  const result: { label: string; value: string }[] = []
  const idSet = new Set(ids.map(String))
  const walk = (nodes: Organization[]) => {
    nodes.forEach((n) => {
      if (idSet.has(String(n.id))) {
        result.push({ label: n.orgName, value: String(n.id) })
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(tree)
  return result
}

const createPrimaryOrgOptions = computed(() => {
  if (!createForm.organizationIds?.length) return []
  return findOrgNames(createForm.organizationIds, rawOrgTree.value)
})

const onCreateOrgChange = (selected: unknown[]) => {
  const ids = (selected as string[]) || []
  if (createForm.primaryOrganizationId && !ids.includes(String(createForm.primaryOrganizationId))) {
    createForm.primaryOrganizationId = undefined
  }
}

const openCreate = () => {
  if (!canWrite.value) return
  Object.assign(createForm, {
    account: '',
    password: '',
    userName: '',
    nickName: '',
    mobile: '',
    birthday: '',
    gender: 1,
    avatar: '',
    roleIds: [],
    organizationIds: selectedOrgId.value ? [selectedOrgId.value] : [],
    primaryOrganizationId: selectedOrgId.value ? selectedOrgId.value : undefined,
  })
  void loadRoles()
  createModalOpen.value = true
}

const handleCreateUser = async () => {
  await createFormRef.value?.validate()
  savingUser.value = true
  try {
    const payload: UserCreatePayload = {
      account: createForm.account.trim(),
      password: createForm.password,
      userName: createForm.userName.trim(),
      nickName: createForm.nickName?.trim() || undefined,
      mobile: createForm.mobile?.trim() || undefined,
      birthday: createForm.birthday || undefined,
      gender: createForm.gender,
      avatar: createForm.avatar?.trim() || undefined,
      roleIds: createForm.roleIds || [],
      organizationIds: createForm.organizationIds || [],
      primaryOrganizationId: createForm.primaryOrganizationId || undefined,
    }
    await createUser(payload)
    message.success('用户新增成功')
    createModalOpen.value = false
    handleSearch()
  } finally {
    savingUser.value = false
  }
}

// ==================== 编辑基础资料 ====================
const editModalOpen = ref(false)
const detailLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editingUserId = ref<string>('')
const editForm = reactive<UserUpdatePayload>({
  account: '',
  userName: '',
  nickName: '',
  mobile: '',
  birthday: '',
  gender: 1,
  avatar: '',
})

const openEdit = async (record: UserRecord) => {
  if (!canWrite.value) return
  editingUserId.value = record.id
  editModalOpen.value = true
  detailLoading.value = true
  try {
    const res = await getUserDetail(record.id)
    const data = res.data || record
    Object.assign(editForm, {
      account: data.account || '',
      userName: data.userName || '',
      nickName: data.nickName || '',
      mobile: data.mobile || '',
      birthday: data.birthday ? data.birthday.slice(0, 10) : '',
      gender: data.gender ?? 1,
      avatar: data.avatar || '',
    })
  } finally {
    detailLoading.value = false
  }
}

const handleUpdateUser = async () => {
  await editFormRef.value?.validate()
  savingUser.value = true
  try {
    const payload: UserUpdatePayload = {
      account: editForm.account.trim(),
      userName: editForm.userName.trim(),
      nickName: editForm.nickName?.trim() || undefined,
      mobile: editForm.mobile?.trim() || undefined,
      birthday: editForm.birthday || undefined,
      gender: editForm.gender,
      avatar: editForm.avatar?.trim() || undefined,
    }
    await updateUser(editingUserId.value, payload)
    message.success('用户资料修改成功')
    editModalOpen.value = false
    await loadUsers()
  } finally {
    savingUser.value = false
  }
}

// ==================== 设置角色 ====================
const roleModalOpen = ref(false)
const roleAssignLoading = ref(false)
const savingRoles = ref(false)
const targetRoleIds = ref<string[]>([])
const currentRecord = ref<UserRecord | null>(null)

const openRoleAssign = async (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止分配角色`)
    return
  }
  currentRecord.value = record
  roleModalOpen.value = true
  roleAssignLoading.value = true
  targetRoleIds.value = []
  try {
    await loadRoles()
    const res = await getUserRoles(record.id)
    targetRoleIds.value = (res.data || []).map((r) => String(r.roleId))
  } finally {
    roleAssignLoading.value = false
  }
}

const handleSaveRoles = async () => {
  if (!currentRecord.value) return
  const roleIds = targetRoleIds.value
  const executeSave = async () => {
    savingRoles.value = true
    try {
      await replaceUserRoles(currentRecord.value!.id, { roleIds })
      message.success('角色分配成功')
      roleModalOpen.value = false
      await loadUsers()
    } finally {
      savingRoles.value = false
    }
  }

  if (roleIds.length === 0) {
    confirmAction({
      title: '确认清空用户角色',
      content: `确定要清空用户【${currentRecord.value.userName || currentRecord.value.account}】的全部角色吗？该用户将失去所有角色授权。`,
      okText: '确认清空',
      okType: 'danger',
      onOk: executeSave,
    })
  } else {
    await executeSave()
  }
}

// ==================== 设置组织 ====================
const orgModalOpen = ref(false)
const orgAssignLoading = ref(false)
const savingOrgs = ref(false)
const targetOrgIds = ref<string[]>([])
const targetPrimaryOrgId = ref<string | undefined>(undefined)

const assignPrimaryOrgOptions = computed(() => {
  if (!targetOrgIds.value.length) return []
  return findOrgNames(targetOrgIds.value, rawOrgTree.value)
})

const onAssignOrgChange = (selected: unknown[]) => {
  const ids = (selected as string[]) || []
  if (targetPrimaryOrgId.value && !ids.includes(String(targetPrimaryOrgId.value))) {
    targetPrimaryOrgId.value = undefined
  }
}

const openOrgAssign = async (record: UserRecord) => {
  if (!canWrite.value) return
  const adminStatus = getAdminStatus(record)
  if (adminStatus.isProtected) {
    message.warning(`${adminStatus.label}账号受系统安全保护，禁止分配所属组织`)
    return
  }
  currentRecord.value = record
  orgModalOpen.value = true
  orgAssignLoading.value = true
  targetOrgIds.value = []
  targetPrimaryOrgId.value = undefined
  try {
    const res = await getUserOrganizations(record.id)
    const orgs = res.data || []
    targetOrgIds.value = orgs.map((o) => String(o.organizationId))
    const primary = orgs.find((o) => o.primaryOrganization)
    targetPrimaryOrgId.value = primary ? String(primary.organizationId) : undefined
  } finally {
    orgAssignLoading.value = false
  }
}

const handleSaveOrgs = async () => {
  if (!currentRecord.value) return
  const organizationIds = targetOrgIds.value
  const primaryOrganizationId = targetPrimaryOrgId.value || null

  const executeSave = async () => {
    savingOrgs.value = true
    try {
      await replaceUserOrganizations(currentRecord.value!.id, {
        organizationIds,
        primaryOrganizationId,
      })
      message.success('组织分配成功')
      orgModalOpen.value = false
      await loadUsers()
    } finally {
      savingOrgs.value = false
    }
  }

  if (organizationIds.length === 0) {
    confirmAction({
      title: '确认清空用户组织',
      content: `确定要清空用户【${currentRecord.value.userName || currentRecord.value.account}】的组织绑定吗？`,
      okText: '确认清空',
      okType: 'danger',
      onOk: executeSave,
    })
  } else {
    await executeSave()
  }
}

// ==================== 状态切换与删除 ====================
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
    content: isSelf
      ? `您正在操作当前登录账号，${actionText}可能导致无法继续登录。是否确认${actionText}？`
      : `确定要${actionText}用户【${record.userName || record.account}】吗？${nextEnabled ? '启用后用户可正常登录。' : '停用后用户将无法登录系统。'}`,
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
  const actionText = nextLocked ? '锁定' : '解锁'

  confirmAction({
    title: `确认${actionText}用户`,
    content: nextLocked
      ? `安全锁定后，用户【${record.userName || record.account}】将不能通过正常身份验证登录。是否继续锁定？`
      : `确定要解除用户【${record.userName || record.account}】的安全锁定状态吗？`,
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
  confirmAction({
    title: '确认删除用户',
    content: `确定要删除用户【${record.userName || record.account}】吗？此操作不可逆。`,
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

onMounted(() => {
  void loadOrgTree()
  void loadUsers()
})
</script>

<style scoped>
.user-page {
  display: flex;
  gap: var(--du-space-3);
  height: 100%;
  min-height: 0;
}

/* 左侧组织树面板 */
.org-sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 220px;
  max-width: 280px;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--du-text);
  font-size: 12px;
  font-weight: 700;
}

.tree-search {
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border-subtle, #f0f2f5);
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--du-space-2);
}

.all-users-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--du-radius);
  color: var(--du-text);
  font-size: 11px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.15s ease;
}

.all-users-node:hover {
  background-color: var(--du-bg-hover, #f5f7fa);
}

.all-users-node.is-selected {
  background-color: #e6f4ff;
  color: #1677ff;
  font-weight: 600;
}

.all-count-badge :deep(.ant-badge-count) {
  height: 16px;
  line-height: 16px;
  font-size: 10px;
  background-color: var(--du-border);
  color: var(--du-text-secondary);
}

.org-node-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-icon {
  font-size: 11px;
  color: var(--du-text-muted);
}

.org-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tree {
  margin-top: 32px;
}

/* 右侧主面板 */
.user-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  width: 240px;
}

.status-select {
  width: 110px;
}

.code-value {
  color: var(--du-text);
  font-size: 11px;
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.text-secondary {
  color: var(--du-text-secondary);
  font-size: 11px;
}

.center-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-time-cell {
  color: var(--du-text-secondary);
  font-size: 10px;
  white-space: nowrap;
}

.account-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-role-badge {
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 2px;
  margin-inline-end: 0;
}

.row-actions {
  justify-content: flex-end;
}

.row-actions :deep(.ant-btn) {
  padding-inline: 4px;
  font-size: 10px;
}

.action-btn-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.readonly-label {
  color: var(--du-text-muted);
  font-size: 10px;
}

.user-content :deep(.ant-table-cell) {
  vertical-align: middle !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.user-content :deep(.ant-table-tbody > tr > td) {
  vertical-align: middle !important;
}

/* 弹窗与表单布局 */
.user-modal-form {
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

.w-full {
  width: 100%;
}

.mb-2 {
  margin-bottom: var(--du-space-2);
}

.mb-3 {
  margin-bottom: var(--du-space-3);
}

.assign-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--du-space-2) var(--du-space-3);
  margin-bottom: var(--du-space-3);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius);
  background-color: var(--du-bg-subtle);
  font-size: 11px;
  color: var(--du-text-secondary);
}

.assign-summary strong,
.assign-summary b {
  color: var(--du-accent);
}

.role-select-box {
  max-height: 280px;
  overflow-y: auto;
  padding: var(--du-space-2);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius);
}

.role-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-2);
}
</style>
