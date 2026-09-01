<template>
  <!-- 组织架构管理页面采用高信息密度的紧凑表格与统一弹窗表单 -->
  <section class="org-page">
    <div class="org-panel du-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input v-model:value="query.keyword" allow-clear class="search-input" placeholder="搜索组织名称或组织编码" @press-enter="handleSearch">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="query.enabled" allow-clear class="status-select" placeholder="启用状态">
            <a-select-option :value="true">启用</a-select-option>
            <a-select-option :value="false">禁用</a-select-option>
          </a-select>
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <div class="toolbar-actions">
          <a-button v-if="canWrite" type="primary" @click="openCreate()"><PlusOutlined />新增根组织</a-button>
        </div>
      </header>

      <!-- 树形表格展示组织树，通过 children 展示层级 -->
      <a-table
        :columns="columns"
        :data-source="orgTree"
        :loading="loading"
        :pagination="false"
        :expanded-row-keys="expandedRowKeys"
        row-key="id"
        size="small"
        @expandedRowsChange="expandedRowKeys = $event"
      >
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'orgName'" class="org-name-cell">
            <strong>{{ record.orgName }}</strong>
          </div>

          <code v-else-if="column.key === 'orgCode'" class="code-value">{{ record.orgCode }}</code>

          <a-tag v-else-if="column.key === 'orgType'" color="blue">
            {{ getOrgTypeLabel(record.orgType) }}
          </a-tag>

          <span v-else-if="column.key === 'sort'" class="sort-value">
            {{ record.sort ?? '—' }}
          </span>

          <a-switch
            v-else-if="column.key === 'enabled'"
            :checked="record.enabled"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite"
            checked-children="启用"
            un-checked-children="禁用"
            @change="changeStatus(record, Boolean($event))"
          />

          <div v-else-if="column.key === 'actions' && canWrite" class="row-actions">
            <a-button type="link" size="small" @click="openCreate(record.id)"><BranchesOutlined />添加下级</a-button>
            <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined />编辑</a-button>
            <a-popconfirm
              ok-text="删除"
              cancel-text="取消"
              @confirm="removeOrg(record)"
            >
              <template #title>
                <div>确定要删除此组织及其全部下级组织吗？</div>
                <div style="color: var(--du-negative); margin-top: 4px;">该操作不可逆，且将同时清除关联的角色和组织关系。</div>
              </template>
              <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
            </a-popconfirm>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无组织架构数据" />
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑弹窗表单 -->
    <a-modal
      v-model:open="editorOpen"
      :title="formState.id ? '编辑组织' : '新增组织'"
      :confirm-loading="saving"
      width="600px"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveOrg"
    >
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="org-form">
        <div class="form-grid">
          <a-form-item label="上级组织" name="parentId" class="full-row">
            <a-tree-select
              v-model:value="formState.parentId"
              :tree-data="parentTreeOptions"
              allow-clear
              tree-default-expand-all
              placeholder="请选择上级组织（不选择表示根组织）"
            />
          </a-form-item>

          <a-form-item label="组织名称" name="orgName">
            <a-input v-model:value="formState.orgName" :maxlength="50" show-count placeholder="例如：集团总部" />
          </a-form-item>

          <a-form-item label="组织编码" name="orgCode">
            <a-input v-model:value="formState.orgCode" :maxlength="50" show-count placeholder="例如：HEAD_OFFICE" />
          </a-form-item>

          <a-form-item label="组织类型" name="orgType">
            <a-select v-model:value="formState.orgType" :options="orgTypeOptions" placeholder="请选择组织类型" allow-clear />
          </a-form-item>

          <a-form-item label="排序" name="sort">
            <a-input-number v-model:value="formState.sort" :min="0" :max="9999" class="number-input" placeholder="请输入排序值" />
          </a-form-item>

          <a-form-item label="负责人" name="leaderUserId" class="full-row">
            <a-input v-model:value="formState.leaderUserId" placeholder="请输入负责人ID（当前可为空）" allow-clear />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Modal, message, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import {
  BranchesOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  changeOrganizationStatus,
  createOrganization,
  deleteOrganization,
  getOrganizationDetail,
  getOrganizationTree,
  updateOrganization,
} from '@/apis/upms/organization'
import type { Organization, OrganizationSaveRequest } from '@/apis/upms/organization/type'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { menusStore } from '@/stores/modules/user'
import { useSystemConfigStore } from '@/stores/modules/config'
import { getSystemDictLabel, SYSTEM_DICT_TYPE, toSystemDictOptions } from '@/utils/SystemDict'

interface TreeSelectOption {
  value: string
  title: string
  disabled?: boolean
  children?: TreeSelectOption[]
}

interface OrgFormState extends OrganizationSaveRequest {
  id?: string
  leaderUserId?: string | null
}

const currentMenus = menusStore()
const route = useRoute()
const canWrite = computed(() => currentMenus.canWritePath(route.path))

const loading = ref(false)
const saving = ref(false)
const statusChangingId = ref('')
const editorOpen = ref(false)

const orgTree = ref<Organization[]>([])
const orgTypeDict = ref<SystemDictData[]>([])
const expandedRowKeys = ref<string[]>([])
const formRef = ref<FormInstance>()

const query = reactive({
  keyword: '',
  enabled: undefined as boolean | undefined,
})

const createEmptyForm = (): OrgFormState => ({
  parentId: null,
  orgCode: '',
  orgName: '',
  orgType: null,
  leaderUserId: null,
  sort: 10,
})

const formState = reactive<OrgFormState>(createEmptyForm())
const orgTypeOptions = computed(() => toSystemDictOptions(orgTypeDict.value, (value) => value))

const loadDictionaries = async () => {
  try {
    const response = await getEnabledDictData(SYSTEM_DICT_TYPE.orgType)
    orgTypeDict.value = response.data || []
  } catch (err) {
    console.error('加载组织类型字典失败', err)
  }
}

const getOrgTypeLabel = (value: unknown) => getSystemDictLabel(orgTypeDict.value, value)

const columns: TableColumnsType<Organization> = [
  { title: '组织名称', dataIndex: 'orgName', key: 'orgName', width: 250 },
  { title: '组织编码', dataIndex: 'orgCode', key: 'orgCode', width: 180 },
  { title: '组织类型', dataIndex: 'orgType', key: 'orgType', width: 120 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80, align: 'center' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 220, align: 'right' },
]

const rules: FormProps['rules'] = {
  orgCode: [
    { required: true, whitespace: true, message: '请输入组织编码', trigger: 'blur' },
    { max: 50, message: '组织编码不能超过 50 个字符', trigger: 'blur' },
  ],
  orgName: [
    { required: true, whitespace: true, message: '请输入组织名称', trigger: 'blur' },
    { max: 50, message: '组织名称不能超过 50 个字符', trigger: 'blur' },
  ],
}

// 递归展开所有含有子级的节点
const autoExpandTree = (orgs: Organization[]) => {
  const keys: string[] = []
  const collect = (list: Organization[]) => {
    list.forEach((item) => {
      if (item.children && item.children.length > 0) {
        keys.push(item.id)
        collect(item.children)
      }
    })
  }
  collect(orgs)
  expandedRowKeys.value = keys
}

const loadOrgTree = async () => {
  loading.value = true
  try {
    const response = await getOrganizationTree({
      keyword: query.keyword.trim() || undefined,
      enabled: query.enabled,
    })
    orgTree.value = response.data || []
    
    // 如果是第一次加载或重置搜索，则自动展开树
    if (expandedRowKeys.value.length === 0) {
      autoExpandTree(orgTree.value)
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  void loadOrgTree()
}

const resetSearch = () => {
  query.keyword = ''
  query.enabled = undefined
  expandedRowKeys.value = []
  void loadOrgTree()
}

// 扁平化组织树，方便查找当前节点及下级节点以实现“防成环”禁用
const flattenOrgs = (orgs: Organization[]): Organization[] => {
  return orgs.flatMap((org) => [org, ...flattenOrgs(org.children || [])])
}

const disabledParentIds = computed(() => {
  if (!formState.id) return new Set<string>()
  const current = flattenOrgs(orgTree.value).find((org) => org.id === formState.id)
  return new Set([formState.id, ...flattenOrgs(current?.children || []).map((org) => org.id)])
})

const parentTreeOptions = computed<TreeSelectOption[]>(() => {
  const convert = (orgs: Organization[]): TreeSelectOption[] => orgs.map((org) => ({
    value: org.id,
    title: org.orgName,
    disabled: disabledParentIds.value.has(org.id),
    children: convert(org.children || []),
  }))
  return convert(orgTree.value)
})

const resetForm = () => Object.assign(formState, createEmptyForm())

const openCreate = (parentId?: string) => {
  if (!canWrite.value) return
  resetForm()
  formState.parentId = parentId || null
  editorOpen.value = true
}

const openEdit = async (org: Organization) => {
  if (!canWrite.value) return
  const response = await getOrganizationDetail(org.id)
  if (!response.data) {
    message.warning('该组织已不存在，请刷新列表')
    return
  }
  const detail = response.data
  Object.assign(formState, {
    id: detail.id,
    parentId: detail.parentId,
    orgCode: detail.orgCode,
    orgName: detail.orgName,
    orgType: detail.orgType || null,
    leaderUserId: detail.leaderUserId || null,
    sort: detail.sort ?? 10,
  })
  editorOpen.value = true
}

const configStore = useSystemConfigStore()

// 递归寻找组织节点深度（根节点为 1）
const getDepthById = (nodes: Organization[], id: string, currentDepth = 1): number => {
  for (const node of nodes) {
    if (node.id === id) return currentDepth
    if (node.children && node.children.length > 0) {
      const depth = getDepthById(node.children, id, currentDepth + 1)
      if (depth > 0) return depth
    }
  }
  return 0
}

// 递归计算子树的最大高度（单节点为 1）
const getSubtreeHeight = (node: Organization): number => {
  if (!node.children || node.children.length === 0) return 1
  return 1 + Math.max(...node.children.map(getSubtreeHeight))
}

const saveOrg = async () => {
  if (!canWrite.value) return

  // 校验最大层级深度限制
  if (formState.parentId) {
    const parentDepth = getDepthById(orgTree.value, formState.parentId)
    let subtreeHeight = 1
    if (formState.id) {
      const currentNode = flattenOrgs(orgTree.value).find((org) => org.id === formState.id)
      if (currentNode) {
        subtreeHeight = getSubtreeHeight(currentNode)
      }
    }
    const totalDepth = parentDepth + subtreeHeight
    const maxDepth = configStore.resource.organization.maxDepth
    if (totalDepth > maxDepth) {
      message.error(`组织架构的最大层级深度限制为 ${maxDepth} 层（当前选择将导致深度达到 ${totalDepth} 层）`)
      return
    }
  }

  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: OrganizationSaveRequest = {
      parentId: formState.parentId || null,
      orgCode: formState.orgCode.trim(),
      orgName: formState.orgName.trim(),
      orgType: formState.orgType || null,
      leaderUserId: formState.leaderUserId?.trim() || null,
      sort: formState.sort,
    }
    if (formState.id) {
      await updateOrganization(formState.id, payload)
    } else {
      await createOrganization(payload)
    }

    message.success(formState.id ? '组织修改成功' : '组织新增成功')
    editorOpen.value = false
    await loadOrgTree()
  } finally {
    saving.value = false
  }
}

const changeStatus = (record: Organization, enabled: boolean) => {
  if (!canWrite.value) return
  Modal.confirm({
    title: '修改组织状态',
    content: `确定要${enabled ? '启用' : '停用'}组织“${record.orgName}”吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        await changeOrganizationStatus(record.id, enabled)
        message.success(enabled ? '组织已启用' : '组织已停用')
        await loadOrgTree()
      } finally {
        statusChangingId.value = ''
      }
    },
  })
}

const removeOrg = async (record: Organization) => {
  if (!canWrite.value) return
  await deleteOrganization(record.id)
  message.success('组织删除成功')
  await loadOrgTree()
}

onMounted(() => {
  void loadOrgTree()
  void loadDictionaries()
})
</script>

<style scoped>
.org-panel { overflow: hidden; }

.page-toolbar {
  display: flex;
  min-height: 52px;
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

.toolbar-actions {
  display: flex;
  align-items: center;
}

.search-input { width: 220px; }
.status-select { width: 110px; }

.org-name-cell {
  display: flex;
  align-items: center;
}
.org-name-cell strong { font-size: 11px; font-weight: 600; }

.code-value {
  color: var(--du-text-secondary);
  font-family: var(--du-font-mono);
  font-size: 10px;
}

.sort-value {
  color: var(--du-text-secondary);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.row-actions :deep(.ant-btn) { padding-inline: 5px; font-size: 10px; }

.org-panel :deep(.ant-table-cell) { padding-top: 7px !important; padding-bottom: 7px !important; }
.org-panel :deep(.ant-table-row-expand-icon) { transform: scale(.88); }

.org-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
.number-input { width: 100%; }
</style>
