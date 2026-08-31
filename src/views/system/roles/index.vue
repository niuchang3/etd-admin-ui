<template>
  <!-- 角色列表遵循项目统一的查询、分页、状态切换和操作反馈规范。 -->
  <section class="management-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input v-model:value="query.keyword" allow-clear class="search-input" placeholder="搜索角色名称或角色编码" @press-enter="handleSearch">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="query.dataStatus" allow-clear class="status-select" placeholder="启用状态">
            <a-select-option :value="1">启用</a-select-option>
            <a-select-option :value="0">禁用</a-select-option>
          </a-select>
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <a-button v-if="canWrite" type="primary" @click="openCreate"><PlusOutlined />新增角色</a-button>
      </header>

      <a-table :columns="columns" :data-source="records" :loading="loading" :pagination="pagination" row-key="id" size="small" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'roleName'" class="role-name">
            <strong>{{ record.roleName }}</strong>
            <a-tag v-if="record.builtIn" color="gold">内置</a-tag>
          </div>
          <code v-else-if="column.key === 'roleCode'" class="code-value">{{ record.roleCode }}</code>
          <span v-else-if="column.key === 'permissionType'">{{ getPermissionTypeLabel(record.permissionType) }}</span>
          <a-switch
            v-else-if="column.key === 'dataStatus'"
            :checked="record.dataStatus === 1"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite"
            checked-children="启用"
            un-checked-children="禁用"
            @change="changeStatus(record, Boolean($event))"
          />
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button v-if="canWrite" type="link" size="small" @click="openAuthorization(record)"><SafetyCertificateOutlined />菜单授权</a-button>
            <a-button v-if="canWrite" type="link" size="small" @click="openEdit(record)"><EditOutlined />编辑</a-button>
            <a-popconfirm
              v-if="canWrite && !record.builtIn"
              title="已分配给用户的角色将无法删除，确认继续吗？"
              ok-text="删除"
              cancel-text="取消"
              @confirm="removeRole(record)"
            >
              <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
            </a-popconfirm>
          </div>
        </template>
        <template #emptyText><a-empty description="暂无角色数据" /></template>
      </a-table>
    </div>

    <!-- 新增和编辑共用完整表单，内置角色的角色编码只读。 -->
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
            <a-select v-model:value="formState.permissionType" :options="permissionTypeOptions" />
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
          <span>已选择 {{ checkedMenuIds.length }} 个菜单；新选择菜单默认读写</span>
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
              <span>{{ node.title }}</span>
              <a-select
                v-if="checkedMenuIds.includes(String(node.key))"
                :value="menuAccessLevels[String(node.key)] || 2"
                size="small"
                class="access-select"
                @click.stop
                @change="setMenuAccessLevel(String(node.key), $event)"
              >
                <a-select-option :value="1">只读</a-select-option>
                <a-select-option :value="2">读写</a-select-option>
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
import { message, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { selectUserMenus } from '@/apis/upms/login'
import {
  assignSystemRoleMenus,
  changeSystemRoleStatus,
  createSystemRole,
  deleteSystemRole,
  getSystemRole,
  getSystemRoleMenus,
  getSystemRolePage,
  updateSystemRole,
} from '@/apis/upms/role'
import type { MenuAccessLevel, RolePermissionType, SystemRole, SystemRoleSaveDTO } from '@/apis/upms/role/type'
import { menusStore, normalizeMenuTree } from '@/stores/modules/user'

interface RoleFormState extends SystemRoleSaveDTO { id?: string, builtIn: boolean }
interface MenuTreeNode { key: string, title: string, children?: MenuTreeNode[] }

// 当前菜单只有读写级别为 2 时才显示角色管理写操作。
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const loading = ref(false)
const saving = ref(false)
const editorOpen = ref(false)
const statusChangingId = ref('')
const records = ref<SystemRole[]>([])
const total = ref(0)
const formRef = ref<FormInstance>()
const query = reactive<{ current: number, size: number, keyword: string, dataStatus?: 0 | 1 }>({ current: 1, size: 10, keyword: '', dataStatus: undefined })

// 授权抽屉独立保存菜单树、选中项和每个菜单的访问级别。
const authorizationOpen = ref(false)
const authorizationLoading = ref(false)
const authorizationSaving = ref(false)
const authorizationRole = ref<SystemRole | null>(null)
const menuTree = ref<MenuTreeNode[]>([])
const checkedMenuIds = ref<string[]>([])
const expandedMenuIds = ref<string[]>([])
const menuAccessLevels = reactive<Record<string, MenuAccessLevel>>({})

// 数据权限编码严格使用后端约定的字符串枚举，不转换为数字。
const permissionTypeLabels: Record<RolePermissionType, string> = {
  '1': '不限制',
  '2': '仅本人',
  '3': '仅当前组织',
  '4': '当前组织及下级组织',
  '5': '自定义跨组织',
}
const permissionTypeOptions = Object.entries(permissionTypeLabels).map(([value, label]) => ({ value: value as RolePermissionType, label }))
const getPermissionTypeLabel = (value: unknown) => permissionTypeLabels[value as RolePermissionType] || '未知'
const emptyForm = (): RoleFormState => ({ roleName: '', roleCode: '', roleDesc: null, permissionType: '1', builtIn: false })
const formState = reactive<RoleFormState>(emptyForm())

const columns: TableColumnsType<SystemRole> = [
  { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 180 },
  { title: '角色编码', dataIndex: 'roleCode', key: 'roleCode', width: 190 },
  { title: '数据权限', dataIndex: 'permissionType', key: 'permissionType', width: 180 },
  { title: '角色描述', dataIndex: 'roleDesc', key: 'roleDesc', ellipsis: true },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 85 },
  { title: '操作', key: 'actions', width: 240, align: 'right' },
]
const pagination = computed(() => ({ current: query.current, pageSize: query.size, total: total.value, showSizeChanger: true, showTotal: (count: number) => `共 ${count} 条` }))
// 角色名称和编码长度与后端 DTO 校验规则保持一致。
const rules: FormProps['rules'] = {
  roleName: [{ required: true, whitespace: true, message: '请输入角色名称', trigger: 'blur' }, { max: 20, message: '角色名称不能超过 20 个字符', trigger: 'blur' }],
  roleCode: [{ required: true, whitespace: true, message: '请输入角色编码', trigger: 'blur' }, { max: 50, message: '角色编码不能超过 50 个字符', trigger: 'blur' }],
  permissionType: [{ required: true, message: '请选择数据权限', trigger: 'change' }],
}

/** 按查询条件加载一页角色。 */
const loadRoles = async () => {
  loading.value = true
  try {
    const response = await getSystemRolePage({ ...query, keyword: query.keyword.trim() })
    records.value = response.data?.records || []
    total.value = response.data?.total || 0
  } finally { loading.value = false }
}
const handleSearch = () => { query.current = 1; void loadRoles() }
const resetSearch = () => { Object.assign(query, { current: 1, size: 10, keyword: '', dataStatus: undefined }); void loadRoles() }
const handleTableChange = (page: { current?: number, pageSize?: number }) => { query.current = page.current || 1; query.size = page.pageSize || 10; void loadRoles() }

/** 打开角色新增表单。 */
const openCreate = () => { Object.assign(formState, emptyForm()); editorOpen.value = true }
/** 编辑前重新读取角色详情，确保 builtIn 和完整字段均为最新值。 */
const openEdit = async (record: SystemRole) => {
  const response = await getSystemRole(record.id)
  if (!response.data) return void message.warning('该角色已不存在，请刷新列表')
  Object.assign(formState, { id: response.data.id, roleName: response.data.roleName, roleCode: response.data.roleCode, roleDesc: response.data.roleDesc, permissionType: response.data.permissionType, builtIn: response.data.builtIn })
  editorOpen.value = true
}
/** 校验后新增或全量修改角色。 */
const saveRole = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: SystemRoleSaveDTO = { roleName: formState.roleName.trim(), roleCode: formState.roleCode.trim(), roleDesc: formState.roleDesc?.trim() || null, permissionType: formState.permissionType }
    const response = formState.id ? await updateSystemRole(formState.id, payload) : await createSystemRole(payload)
    if (formState.id && !response.data) return void message.warning('角色修改未生效，请刷新后重试')
    message.success(formState.id ? '角色修改成功' : '角色新增成功')
    editorOpen.value = false
    await loadRoles()
  } finally { saving.value = false }
}
/** 角色状态使用独立 PATCH 接口维护。 */
const changeStatus = async (record: SystemRole, enabled: boolean) => {
  statusChangingId.value = record.id
  try {
    const response = await changeSystemRoleStatus(record.id, enabled ? 1 : 0)
    if (!response.data) return void message.warning('状态修改未生效，请刷新后重试')
    message.success(enabled ? '角色已启用' : '角色已禁用')
    await loadRoles()
  } finally { statusChangingId.value = '' }
}
/** 删除非内置角色；已分配用户时展示后端返回的拒绝原因。 */
const removeRole = async (record: SystemRole) => {
  const response = await deleteSystemRole(record.id)
  if (!response.data) return void message.warning('角色删除未生效，请刷新后重试')
  message.success('角色删除成功')
  if (records.value.length === 1 && query.current > 1) query.current -= 1
  await loadRoles()
}

// 递归收集菜单键，仅用于一键展开树，不对字符串 ID 做数值转换。
const flattenTreeKeys = (nodes: MenuTreeNode[]): string[] => nodes.flatMap((node) => [node.key, ...flattenTreeKeys(node.children || [])])
/** 同时加载当前用户可见菜单和角色已有授权，避免抽屉出现错误回显。 */
const openAuthorization = async (role: SystemRole) => {
  authorizationRole.value = role
  authorizationOpen.value = true
  authorizationLoading.value = true
  checkedMenuIds.value = []
  menuTree.value = []
  Object.keys(menuAccessLevels).forEach((key) => delete menuAccessLevels[key])
  try {
    const [menuResponse, assignedResponse] = await Promise.all([selectUserMenus(), getSystemRoleMenus(role.id)])
    const normalized = normalizeMenuTree(menuResponse.data || [])
    const convertTree = (nodes: typeof normalized.tree): MenuTreeNode[] => nodes.map((node) => ({
      key: node.id,
      title: node.menuName || '未命名菜单',
      children: node.children?.length ? convertTree(node.children) : undefined,
    }))
    menuTree.value = convertTree(normalized.tree)
    expandedMenuIds.value = flattenTreeKeys(menuTree.value)
    // 使用 Map 按 menuId 去重，保证后续全量提交同一个菜单最多出现一次。
    const uniqueAssigned = new Map((assignedResponse.data || []).map((item) => [item.menuId, item.accessLevel]))
    checkedMenuIds.value = Array.from(uniqueAssigned.keys())
    uniqueAssigned.forEach((level, menuId) => { menuAccessLevels[menuId] = level === 1 ? 1 : 2 })
  } finally { authorizationLoading.value = false }
}

/** 同步树的勾选结果，新勾选的菜单默认赋予读写级别。 */
const handleMenuCheck = (keys: unknown) => {
  const rawKeys = Array.isArray(keys)
    ? keys
    : typeof keys === 'object' && keys && 'checked' in keys && Array.isArray((keys as { checked: unknown }).checked)
      ? (keys as { checked: Array<string | number> }).checked
      : []
  const uniqueKeys = Array.from(new Set(rawKeys.map(String)))
  checkedMenuIds.value = uniqueKeys
  uniqueKeys.forEach((menuId) => { if (!menuAccessLevels[menuId]) menuAccessLevels[menuId] = 2 })
}
const setMenuAccessLevel = (menuId: string, level: unknown) => { menuAccessLevels[menuId] = level === 1 ? 1 : 2 }
const expandAll = () => { expandedMenuIds.value = flattenTreeKeys(menuTree.value) }
const clearCheckedMenus = () => { checkedMenuIds.value = [] }
/** 全量保存授权；未勾选任何菜单时明确提交 { menus: [] } 清空权限。 */
const saveAuthorization = async () => {
  if (!authorizationRole.value) return
  authorizationSaving.value = true
  try {
    const uniqueMenuIds = Array.from(new Set(checkedMenuIds.value))
    const response = await assignSystemRoleMenus(authorizationRole.value.id, {
      menus: uniqueMenuIds.map((menuId) => ({ menuId, accessLevel: menuAccessLevels[menuId] || 2 })),
    })
    if (!response.data) return void message.warning('菜单授权未生效，请刷新后重试')
    message.success('菜单授权保存成功')
    authorizationOpen.value = false
  } finally { authorizationSaving.value = false }
}

onMounted(() => void loadRoles())
</script>

<style scoped>
.table-panel { overflow: hidden; }
.page-toolbar { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: var(--du-space-3); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.filters, .row-actions, .role-name { display: flex; align-items: center; gap: var(--du-space-2); }
.search-input { width: 250px; }
.status-select { width: 120px; }
.role-name strong { font-size: 11px; }
.code-value, .authorization-summary code { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: 10px; }
.row-actions { justify-content: flex-end; }
.row-actions :deep(.ant-btn) { padding-inline: 5px; font-size: 10px; }
.table-panel :deep(.ant-table-cell) { padding-top: 8px !important; padding-bottom: 8px !important; }
.editor-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
.authorization-summary { display: flex; align-items: center; justify-content: space-between; gap: var(--du-space-3); margin-bottom: var(--du-space-3); }
.authorization-summary > div { display: flex; flex-direction: column; gap: 3px; }
.authorization-summary > span { color: var(--du-text-muted); font-size: 10px; }
.tree-toolbar { display: flex; gap: var(--du-space-2); margin: var(--du-space-3) 0; }
.menu-tree-title { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: var(--du-space-3); }
.access-select { width: 82px; }
</style>
