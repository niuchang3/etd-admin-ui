<template>
  <!-- 角色列表遵循项目统一的查询、分页、状态切换和操作反馈规范。 -->
  <section class="management-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input v-model:value="query.keyword" allow-clear class="search-input" placeholder="搜索角色名称或角色编码" @press-enter="handleSearch">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="query.dataStatus" :options="statusOptions" allow-clear class="status-select" placeholder="启用状态" />
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <a-button v-if="canWrite" type="primary" @click="openCreate"><PlusOutlined />新增角色</a-button>
      </header>

      <a-table :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" row-key="id" size="small" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'roleName'">{{ record.roleName }}</span>
          <code v-else-if="column.key === 'roleCode'" class="code-value">{{ record.roleCode }}</code>
          <span v-else-if="column.key === 'permissionType'">{{ getPermissionTypeLabel(record.permissionType) }}</span>
          <EllipsisText v-else-if="column.key === 'roleDesc'" :text="record.roleDesc" max-width="260px" />
          <a-switch
            v-else-if="column.key === 'dataStatus'"
            :checked="record.dataStatus === COMMON_STATUS.ENABLED"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite || record.builtIn"
            :checked-children="getLabel(SYSTEM_DICT_TYPE.commonStatus, String(COMMON_STATUS.ENABLED))"
            :un-checked-children="getLabel(SYSTEM_DICT_TYPE.commonStatus, String(COMMON_STATUS.DISABLED))"
            @change="changeStatus(record, Boolean($event))"
          />
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <span v-if="record.builtIn" class="readonly-label">内置数据只读</span>
              <a-button v-if="!record.builtIn" type="link" size="small" @click="openAuthorization(record)"><SafetyCertificateOutlined />菜单授权</a-button>
              <a-button v-if="!record.builtIn" type="link" size="small" @click="openEdit(record)"><EditOutlined />编辑</a-button>
              <a-popconfirm
                v-if="!record.builtIn"
                title="已分配给用户的角色将无法删除，确认继续吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="removeRole(record)"
              >
                <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
              </a-popconfirm>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>
        <template #emptyText><a-empty description="暂无角色数据" /></template>
      </a-table>
    </div>

    <!-- 新增和编辑共用完整表单；内置角色不提供编辑入口。 -->
    <a-modal v-model:open="editorOpen" :title="formState.id ? '编辑角色' : '新增角色'" :confirm-loading="saving" width="620px" ok-text="保存" cancel-text="取消" @ok="saveRole">
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="editor-form">
        <div class="form-grid">
          <a-form-item label="角色名称" name="roleName">
            <a-input v-model:value="formState.roleName" :maxlength="20" show-count placeholder="请输入角色名称" />
          </a-form-item>
          <a-form-item label="角色编码" name="roleCode">
            <a-input v-model:value="formState.roleCode" :disabled="formState.builtIn" :maxlength="50" show-count placeholder="请输入角色编码" />
          </a-form-item>
          <a-form-item label="数据权限" name="permissionType" class="full-row">
            <a-select v-model:value="formState.permissionType" :options="permissionTypeOptions" @change="onPermissionTypeChange" />
          </a-form-item>
          <a-form-item
            v-if="formState.permissionType === ROLE_PERMISSION_TYPE.CUSTOM_ORG"
            label="授权组织"
            name="organizationIds"
            class="full-row"
          >
            <a-tree-select
              v-model:value="formState.organizationIds"
              :tree-data="orgTreeData"
              tree-checkable
              tree-default-expand-all
              :show-checked-strategy="TreeSelect.SHOW_ALL"
              tree-node-filter-prop="title"
              :loading="orgTreeLoading"
              allow-clear
              :max-tag-count="6"
              placeholder="请选择授权组织机构"
            />
          </a-form-item>
          <a-form-item label="角色描述" name="roleDesc" class="full-row">
            <a-textarea v-model:value="formState.roleDesc" :rows="4" placeholder="请输入角色描述" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <!-- 菜单授权使用抽屉承载菜单树，并支持逐菜单选择只读或读写。 -->
    <a-drawer v-model:open="authorizationOpen" title="菜单授权" width="560" :closable="!authorizationSaving">
      <template #extra>
        <a-button :disabled="authorizationSaving" @click="authorizationOpen = false">取消</a-button>
        <a-button type="primary" :loading="authorizationSaving" @click="saveAuthorization">保存授权</a-button>
      </template>
      <a-spin :spinning="authorizationLoading">
        <div class="authorization-summary">
          <div>
            <strong>{{ authorizationRole?.roleName }}</strong>
            <code>{{ authorizationRole?.roleCode }}</code>
          </div>
          <span>已选择 {{ selectedCount }} 个菜单；新选择菜单默认{{ getLabel(SYSTEM_DICT_TYPE.menuAccessLevel, 'READ_WRITE') }}</span>
        </div>
        <a-alert message="取消全部勾选并保存，将清空该角色的菜单权限。" type="info" show-icon />
        <div class="tree-toolbar">
          <a-button size="small" @click="expandAll">展开全部</a-button>
          <a-button size="small" @click="expandedMenuIds = []">收起全部</a-button>
          <a-button size="small" @click="clearCheckedMenus">清空选择</a-button>
        </div>
        <a-tree
          v-if="menuTree.length"
          v-model:expandedKeys="expandedMenuIds"
          :tree-data="menuTree"
          :checked-keys="checkedMenuIds"
          checkable
          block-node
          @check="handleMenuCheck"
        >
          <template #title="node">
            <div class="menu-tree-title">
              <div class="menu-node-info">
                <span>{{ node.title }}</span>
                <code v-if="node.permissionCode" class="permission-code-tag">{{ node.permissionCode }}</code>
              </div>
              <a-select
                v-if="isNodeChecked(node)"
                :value="menuAccessLevels[String(node.key)] || 'READ_WRITE'"
                size="small"
                class="access-select"
                @click.stop
                @change="setMenuAccessLevel(String(node.key), $event)"
              >
                <a-select-option v-for="option in accessLevelOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </a-select-option>
              </a-select>
            </div>
          </template>
        </a-tree>
        <a-empty v-else-if="!authorizationLoading" description="暂无可授权菜单" />
      </a-spin>
    </a-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, TreeSelect, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { selectUserMenus } from '@/apis/upms/login'
import {
  assignSystemRoleMenus,
  changeSystemRoleStatus,
  createSystemRole,
  deleteSystemRole,
  getSystemRole,
  getSystemRoleMenus,
  getSystemRoleOrganizations,
  getSystemRolePage,
  updateSystemRole,
} from '@/apis/upms/role'
import type { MenuAccessLevel, RolePermissionType, SystemRole, SystemRoleQuery, SystemRoleSaveDTO } from '@/apis/upms/role/type'
import { getOrganizationTree } from '@/apis/upms/organization'
import type { Organization } from '@/apis/upms/organization/type'
import { menusStore, normalizeMenuTree } from '@/stores/modules/user'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { COMMON_STATUS, MENU_ACCESS_LEVEL, ROLE_PERMISSION_TYPE } from '@/constant'
import { useTablePagination } from '@/composables/useTablePagination'
import { useSystemDict } from '@/composables/useSystemDict'
import { codeRules, requiredRule } from '@/utils/rules'
import EllipsisText from '@/components/EllipsisText.vue'

interface RoleFormState extends SystemRoleSaveDTO { id?: string, builtIn: boolean }
interface MenuTreeNode { key: string, title: string, permissionCode?: string | null, children?: MenuTreeNode[] }
interface OrgTreeNode { key: string, value: string, title: string, children?: OrgTreeNode[] }

// 当前菜单只有读写级别为 2 时才显示角色管理写操作。
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const saving = ref(false)
const editorOpen = ref(false)
const statusChangingId = ref('')
const formRef = ref<FormInstance>()

// 组织架构树数据与加载状态
const rawOrgTree = ref<Organization[]>([])
const orgTreeLoading = ref(false)

const mapOrgToTree = (items: Organization[]): OrgTreeNode[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const orgTreeData = computed(() => mapOrgToTree(rawOrgTree.value))

const loadOrgTree = async () => {
  if (rawOrgTree.value.length > 0) return
  orgTreeLoading.value = true
  try {
    const res = await getOrganizationTree({ enabled: true })
    rawOrgTree.value = res.data || []
  } finally {
    orgTreeLoading.value = false
  }
}

// 通用系统字典 Hook
const { getOptions, getLabel } = useSystemDict([
  SYSTEM_DICT_TYPE.commonStatus,
  SYSTEM_DICT_TYPE.commonBuiltIn,
  SYSTEM_DICT_TYPE.rolePermissionType,
  SYSTEM_DICT_TYPE.menuAccessLevel,
])

// 字典选项与标签辅助计算
const statusOptions = computed(() => getOptions(SYSTEM_DICT_TYPE.commonStatus, (value) => Number(value) as 0 | 1))
const permissionTypeOptions = computed(() => getOptions(SYSTEM_DICT_TYPE.rolePermissionType, (value) => value as RolePermissionType))
const accessLevelOptions = computed(() => getOptions(SYSTEM_DICT_TYPE.menuAccessLevel, (value) => value as MenuAccessLevel))
const getPermissionTypeLabel = (value: unknown) => getLabel(SYSTEM_DICT_TYPE.rolePermissionType, value)

// 使用通用表格分页 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadRoles,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<SystemRole, SystemRoleQuery>(
  (params) => getSystemRolePage({ ...params, keyword: params.keyword?.trim() || '' }),
  { current: 1, size: 10, keyword: '', dataStatus: undefined },
  { defaultSize: 10 }
)

// 授权抽屉独立保存菜单树、选中项和每个菜单的访问级别。
const authorizationOpen = ref(false)
const authorizationLoading = ref(false)
const authorizationSaving = ref(false)
const authorizationRole = ref<SystemRole | null>(null)
const menuTree = ref<MenuTreeNode[]>([])
const checkedMenuIds = ref<string[]>([])
const expandedMenuIds = ref<string[]>([])
const menuAccessLevels = reactive<Record<string, MenuAccessLevel>>({})

const emptyForm = (): RoleFormState => ({
  roleName: '',
  roleCode: '',
  roleDesc: null,
  permissionType: ROLE_PERMISSION_TYPE.NO_LIMIT,
  organizationIds: [],
  builtIn: false,
})
const formState = reactive<RoleFormState>(emptyForm())

const columns: TableColumnsType<SystemRole> = [
  { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 180 },
  { title: '角色编码', dataIndex: 'roleCode', key: 'roleCode', width: 190 },
  { title: '数据权限', dataIndex: 'permissionType', key: 'permissionType', width: 180 },
  { title: '角色描述', dataIndex: 'roleDesc', key: 'roleDesc', ellipsis: true },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 85 },
  { title: '操作', key: 'actions', width: 240, align: 'right' },
]

// 角色名称和编码长度与后端 DTO 校验规则保持一致。
const rules: FormProps['rules'] = {
  roleName: [{ required: true, whitespace: true, message: '请输入角色名称', trigger: 'blur' }, { max: 20, message: '角色名称不能超过 20 个字符', trigger: 'blur' }],
  roleCode: codeRules('角色编码', 50),
  permissionType: [requiredRule('请选择数据权限', 'change')],
  organizationIds: [
    {
      validator: async (_rule, value: string[]) => {
        if (formState.permissionType === ROLE_PERMISSION_TYPE.CUSTOM_ORG && (!value || value.length === 0)) {
          throw new Error('自定义跨组织数据权限至少需要选择一个组织')
        }
      },
      trigger: ['change', 'blur'],
    },
  ],
}

/** 切换数据权限类型时联动处理组织选择与数据加载。 */
const onPermissionTypeChange = (val: unknown) => {
  if (val === ROLE_PERMISSION_TYPE.CUSTOM_ORG) {
    void loadOrgTree()
  } else {
    formState.organizationIds = []
    formRef.value?.clearValidate('organizationIds')
  }
}

/** 打开角色新增表单。 */
const openCreate = () => {
  Object.assign(formState, emptyForm())
  editorOpen.value = true
}

/** 编辑前重新读取角色详情及关联组织，确保 builtIn 和完整字段均为最新值。 */
const openEdit = async (record: SystemRole) => {
  // 内置角色由系统初始化维护，事件层再次拦截所有修改入口。
  if (record.builtIn) return
  const response = await getSystemRole(record.id)
  if (!response.data) return void message.warning('该角色已不存在，请刷新列表')

  let orgIds: string[] = []
  if (response.data.permissionType === ROLE_PERMISSION_TYPE.CUSTOM_ORG) {
    void loadOrgTree()
    const orgResponse = await getSystemRoleOrganizations(record.id)
    orgIds = (orgResponse.data || []).map(String)
  }

  Object.assign(formState, {
    id: response.data.id,
    roleName: response.data.roleName,
    roleCode: response.data.roleCode,
    roleDesc: response.data.roleDesc,
    permissionType: response.data.permissionType,
    organizationIds: orgIds,
    builtIn: response.data.builtIn,
  })
  editorOpen.value = true
}

/** 校验后新增或全量修改角色。 */
const saveRole = async () => {
  await formRef.value?.validate()
  if (formState.permissionType === ROLE_PERMISSION_TYPE.CUSTOM_ORG && (!formState.organizationIds || formState.organizationIds.length === 0)) {
    message.warning('自定义跨组织数据权限至少需要选择一个组织')
    return
  }
  saving.value = true
  try {
    const orgIds = formState.permissionType === ROLE_PERMISSION_TYPE.CUSTOM_ORG ? (formState.organizationIds || []) : []
    const payload: SystemRoleSaveDTO = {
      roleName: formState.roleName.trim(),
      roleCode: formState.roleCode.trim(),
      roleDesc: formState.roleDesc?.trim() || null,
      permissionType: formState.permissionType,
      organizationIds: orgIds,
    }
    const response = formState.id ? await updateSystemRole(formState.id, payload) : await createSystemRole(payload)
    if (formState.id && !response.data) return void message.warning('角色修改未生效，请刷新后重试')
    message.success(formState.id ? '角色修改成功' : '角色新增成功')
    editorOpen.value = false
    await loadRoles()
  } finally { saving.value = false }
}
/** 角色状态使用独立 PATCH 接口维护。 */
const changeStatus = async (record: SystemRole, enabled: boolean) => {
  if (record.builtIn) return
  statusChangingId.value = record.id
  try {
    const response = await changeSystemRoleStatus(record.id, enabled ? COMMON_STATUS.ENABLED : COMMON_STATUS.DISABLED)
    if (!response.data) return void message.warning('状态修改未生效，请刷新后重试')
    message.success(enabled ? '角色已启用' : '角色已禁用')
    await loadRoles()
  } finally { statusChangingId.value = '' }
}
/** 删除非内置角色；已分配用户时展示后端返回的拒绝原因。 */
const removeRole = async (record: SystemRole) => {
  if (record.builtIn) return
  const response = await deleteSystemRole(record.id)
  if (!response.data) return void message.warning('角色删除未生效，请刷新后重试')
  message.success('角色删除成功')
  await refreshAfterDelete()
}

// 半选父节点 ID 列表，用于保存时合并提交，确保菜单层级完整
const halfCheckedMenuIds = ref<string[]>([])

// 递归收集菜单键，仅用于一键展开树，不对字符串 ID 做数值转换。
const flattenTreeKeys = (nodes: MenuTreeNode[]): string[] => nodes.flatMap((node) => [node.key, ...flattenTreeKeys(node.children || [])])

// 收集节点及其所有子孙的叶子节点 key
const getAllDescendantLeafKeys = (node: MenuTreeNode): string[] => {
  if (!node.children || node.children.length === 0) {
    return [node.key]
  }
  return node.children.flatMap(getAllDescendantLeafKeys)
}

// 递归收集整个树的所有叶子节点 key
const getLeafNodeKeys = (nodes: MenuTreeNode[]): string[] => {
  return nodes.flatMap((node) => getAllDescendantLeafKeys(node))
}

const checkedKeySet = computed(() => new Set(checkedMenuIds.value))

/**
 * 判断节点是否处于完全勾选状态（全选的父节点或被勾选的叶子节点）
 */
const isNodeChecked = (node: { key: string | number; children?: unknown[] }): boolean => {
  const nodeKey = String(node.key)
  if (checkedKeySet.value.has(nodeKey)) {
    return true
  }
  const fullNode = findNodeInTree(menuTree.value, nodeKey)
  if (fullNode && fullNode.children && fullNode.children.length > 0) {
    const leaves = getAllDescendantLeafKeys(fullNode)
    return leaves.length > 0 && leaves.every((leafKey) => checkedKeySet.value.has(leafKey))
  }
  return false
}

/**
 * 计算当前勾选的菜单总数（含完全选中的父节点与叶子节点）
 */
const selectedCount = computed(() => {
  let count = checkedMenuIds.value.length
  const checkedSet = checkedKeySet.value
  const walk = (nodes: MenuTreeNode[]) => {
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        walk(n.children)
        if (!checkedSet.has(n.key)) {
          const leaves = getAllDescendantLeafKeys(n)
          if (leaves.length > 0 && leaves.every((l) => checkedSet.has(l))) {
            count++
          }
        }
      }
    })
  }
  walk(menuTree.value)
  return count
})

/** 同时加载当前用户可见菜单和角色已有授权，避免抽屉出现错误回显。 */
const openAuthorization = async (role: SystemRole) => {
  if (role.builtIn) return
  authorizationRole.value = role
  authorizationOpen.value = true
  authorizationLoading.value = true
  checkedMenuIds.value = []
  halfCheckedMenuIds.value = []
  menuTree.value = []
  Object.keys(menuAccessLevels).forEach((key) => delete menuAccessLevels[key])
  try {
    const [menuResponse, assignedResponse] = await Promise.all([selectUserMenus(), getSystemRoleMenus(role.id)])
    const normalized = normalizeMenuTree(menuResponse.data || [])
    const convertTree = (nodes: typeof normalized.tree): MenuTreeNode[] => nodes.map((node) => ({
      key: node.id,
      title: node.menuName || '未命名菜单',
      permissionCode: node.permissionCode || null,
      children: node.children?.length ? convertTree(node.children) : undefined,
    }))
    menuTree.value = convertTree(normalized.tree)
    expandedMenuIds.value = flattenTreeKeys(menuTree.value)

    // 使用 Map 按 menuId 去重，保证后续全量提交同一个菜单最多出现一次。
    const uniqueAssigned = new Map((assignedResponse.data || []).map((item) => [String(item.menuId), item.accessLevel]))
    uniqueAssigned.forEach((level, menuId) => {
      menuAccessLevels[menuId] = level === MENU_ACCESS_LEVEL.READ_ONLY ? MENU_ACCESS_LEVEL.READ_ONLY : MENU_ACCESS_LEVEL.READ_WRITE
    })

    const leafKeySet = new Set(getLeafNodeKeys(menuTree.value))
    const assignedIds = Array.from(uniqueAssigned.keys())

    // 关键修正：checkedMenuIds 回显时只设置纯叶子节点！
    // Ant Design Vue 会自动计算父节点是全选还是半选，绝不会把未授权的子节点误显示为勾选状态！
    checkedMenuIds.value = assignedIds.filter((id) => leafKeySet.has(id))
    // 记录原本已授权但属于非叶子的父级目录
    halfCheckedMenuIds.value = assignedIds.filter((id) => !leafKeySet.has(id))
  } finally { authorizationLoading.value = false }
}

/** 同步树的勾选结果，新勾选的菜单默认赋予读写级别。 */
const handleMenuCheck = (keys: unknown, e?: { halfCheckedKeys?: unknown[] }) => {
  const rawKeys = Array.isArray(keys)
    ? keys
    : typeof keys === 'object' && keys && 'checked' in keys && Array.isArray((keys as { checked: unknown }).checked)
      ? (keys as { checked: Array<string | number> }).checked
      : []
  const uniqueKeys = Array.from(new Set(rawKeys.map(String)))
  checkedMenuIds.value = uniqueKeys

  if (e && e.halfCheckedKeys && Array.isArray(e.halfCheckedKeys)) {
    halfCheckedMenuIds.value = Array.from(new Set(e.halfCheckedKeys.map(String)))
  } else {
    halfCheckedMenuIds.value = []
  }

  uniqueKeys.forEach((menuId) => {
    if (!menuAccessLevels[menuId]) {
      menuAccessLevels[menuId] = MENU_ACCESS_LEVEL.READ_WRITE
    }
  })
}
const findNodeInTree = (nodes: MenuTreeNode[], key: string): MenuTreeNode | null => {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children?.length) {
      const found = findNodeInTree(node.children, key)
      if (found) return found
    }
  }
  return null
}
const syncSubtreeAccessLevel = (node: MenuTreeNode, level: MenuAccessLevel) => {
  menuAccessLevels[node.key] = level
  if (node.children?.length) {
    node.children.forEach((child) => {
      syncSubtreeAccessLevel(child, level)
    })
  }
}
const setMenuAccessLevel = (menuId: string, level: unknown) => {
  const targetLevel = (level === MENU_ACCESS_LEVEL.READ_ONLY ? MENU_ACCESS_LEVEL.READ_ONLY : MENU_ACCESS_LEVEL.READ_WRITE) as MenuAccessLevel
  menuAccessLevels[menuId] = targetLevel
  const node = findNodeInTree(menuTree.value, menuId)
  if (node && node.children?.length) {
    node.children.forEach((child) => {
      syncSubtreeAccessLevel(child, targetLevel)
    })
  }
}
const expandAll = () => { expandedMenuIds.value = flattenTreeKeys(menuTree.value) }
const clearCheckedMenus = () => {
  checkedMenuIds.value = []
  halfCheckedMenuIds.value = []
}
/** 全量保存授权；未勾选任何菜单时明确提交 { menus: [] } 清空权限。 */
const saveAuthorization = async () => {
  if (!authorizationRole.value) return
  authorizationSaving.value = true
  try {
    const allSelectedKeys = new Set<string>(checkedMenuIds.value)

    // 若父节点名下的所有叶子均被勾选，父节点本身也补齐提交
    const addParentIfChildrenChecked = (nodes: MenuTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          addParentIfChildrenChecked(node.children)
          const leaves = getAllDescendantLeafKeys(node)
          if (leaves.length > 0 && leaves.every((k) => allSelectedKeys.has(k))) {
            allSelectedKeys.add(node.key)
          }
        }
      })
    }
    addParentIfChildrenChecked(menuTree.value)

    // 半选的父级节点也必须提交，确保角色登录后能正常渲染出父级导航目录
    halfCheckedMenuIds.value.forEach((id) => allSelectedKeys.add(id))

    const response = await assignSystemRoleMenus(authorizationRole.value.id, {
      menus: Array.from(allSelectedKeys).map((menuId) => ({
        menuId,
        accessLevel: menuAccessLevels[menuId] || MENU_ACCESS_LEVEL.READ_WRITE,
      })),
    })
    if (!response.data) return void message.warning('菜单授权未生效，请刷新后重试')
    message.success('菜单授权保存成功，相关用户重新登录或刷新会话后生效')
    authorizationOpen.value = false
  } finally { authorizationSaving.value = false }
}

onMounted(() => {
  void loadRoles()
})
</script>

<style scoped>
.table-panel { overflow: hidden; }
.page-toolbar { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: var(--du-space-3); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.filters, .row-actions, .role-name { display: flex; align-items: center; gap: var(--du-space-2); }
.search-input { width: 250px; }
.status-select { width: 120px; }
.role-name span { font-size: var(--du-font-size-sm, 12px); font-weight: var(--du-font-weight-normal, 400); }
.code-value, .authorization-summary code { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: var(--du-font-size-xs, 11px); }
.readonly-label { color: var(--du-text-muted); font-size: var(--du-font-size-xs, 11px); }
.editor-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
.authorization-summary { display: flex; align-items: center; justify-content: space-between; gap: var(--du-space-3); margin-bottom: var(--du-space-3); }
.authorization-summary > div { display: flex; flex-direction: column; gap: 3px; }
.authorization-summary > span { color: var(--du-text-muted); font-size: var(--du-font-size-xs, 11px); }
.tree-toolbar { display: flex; gap: var(--du-space-2); margin: var(--du-space-3) 0; }
.menu-tree-title { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: var(--du-space-3); }
.menu-node-info { display: inline-flex; align-items: center; gap: var(--du-space-2); }
.permission-code-tag { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: var(--du-font-size-xs, 11px); }
.access-select { width: 82px; }
</style>
