<template>
  <!-- 菜单管理页集中维护菜单树，不拆分当前页面专用的业务模块。 -->
  <section class="menu-page">
    <div class="menu-panel du-panel">
      <header class="page-toolbar">
        <!-- <div>
          <strong>菜单管理</strong>
          <span>{{ flatMenuCount }} 个菜单节点</span>
        </div> -->
        <div class="toolbar-actions">
          <a-input v-model:value="keyword" allow-clear class="search-input" placeholder="搜索菜单名称或路由">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button :loading="loading" @click="loadMenus"><ReloadOutlined />刷新</a-button>
          <a-button v-if="canWrite" type="primary" @click="openCreate()"><PlusOutlined />新增一级菜单</a-button>
        </div>
      </header>

      <!-- 树形表格直接使用 children 展示菜单层级。 -->
      <a-table
        :columns="columns"
        :data-source="filteredMenus"
        :loading="loading"
        :pagination="false"
        :expanded-row-keys="expandedRowKeys"
        row-key="id"
        size="small"
        @expandedRowsChange="expandedRowKeys = $event"
      >
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'menuName'" class="menu-name-cell">
            <component :is="resolveMenuIcon(record.menuIcon)" />
            <strong>{{ record.menuName || '未命名菜单' }}</strong>
          </div>

          <span v-else-if="column.key === 'menuType'" class="type-label">
            {{ getMenuTypeLabel(record) }}
          </span>

          <code v-else-if="column.key === 'menuPath'" class="route-value">
            {{ record.menuPath || '—' }}
          </code>

          <code v-else-if="column.key === 'menuRouter'" class="route-value">{{ record.menuRouter || '—' }}</code>

          <a-switch
            v-else-if="column.key === 'dataStatus'"
            :checked="record.dataStatus === 1"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite"
            :checked-children="getSystemDictLabel(statusDict, '1')"
            :un-checked-children="getSystemDictLabel(statusDict, '0')"
            @change="changeStatus(record, Boolean($event))"
          />

          <div v-else-if="column.key === 'actions' && canWrite" class="row-actions">
            <a-button type="link" size="small" @click="openCreate(record.id)"><BranchesOutlined />添加下级</a-button>
            <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined />编辑</a-button>
            <a-popconfirm title="删除后将同时删除该菜单的全部下级菜单，并清理租户、角色和接口权限关系，是否继续？" ok-text="删除" cancel-text="取消" @confirm="removeMenu(record)">
              <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
            </a-popconfirm>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无菜单数据" />
        </template>
      </a-table>
    </div>

    <!-- 新增和编辑共用同一个表单，减少重复字段和校验规则。 -->
    <a-modal
      v-model:open="editorOpen"
      :title="formState.id ? '编辑菜单' : '新增菜单'"
      :confirm-loading="saving"
      width="620px"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveMenu"
    >
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="menu-form">
        <div class="form-grid">
          <a-form-item label="上级菜单" name="parentId" class="full-row">
            <a-tree-select
              v-model:value="formState.parentId"
              :tree-data="parentTreeOptions"
              allow-clear
              tree-default-expand-all
              placeholder="不选择表示一级菜单"
            />
          </a-form-item>

          <a-form-item label="菜单名称" name="menuName">
            <a-input v-model:value="formState.menuName" :maxlength="10" show-count placeholder="例如：菜单管理" />
          </a-form-item>

          <a-form-item label="菜单类型" name="menuType">
            <a-radio-group v-model:value="formState.menuType">
              <a-radio-button v-for="option in menuTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="访问路径" name="menuPath">
            <a-input v-model:value="formState.menuPath" :maxlength="100" placeholder="例如：/system/menus" />
          </a-form-item>

          <a-form-item label="组件地址" name="menuRouter">
            <a-input v-model:value="formState.menuRouter" :maxlength="100" placeholder="例如：@/views/system/menus/index.vue" />
          </a-form-item>

          <a-form-item label="菜单图标" name="menuIcon">
            <a-select v-model:value="formState.menuIcon" :options="menuIconOptions" placeholder="请选择图标">
              <template #option="option">
                <span class="icon-option"><component :is="resolveMenuIcon(option.value)" />{{ option.label }}</span>
              </template>
            </a-select>
          </a-form-item>

          <a-form-item label="显示排序" name="sort">
            <a-input-number v-model:value="formState.sort" :min="0" :max="9999" class="number-input" />
          </a-form-item>

        </div>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import {
  BranchesOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  changeSystemMenuStatus,
  createSystemMenu,
  deleteSystemMenu,
  selectSystemMenu,
  updateSystemMenu,
} from '@/apis/upms/menu'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { MenuType, SaveSystemMenu, SystemMenu } from '@/apis/upms/menu/type'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { menuIconOptions, resolveMenuIcon } from '@/config/menuIcons'
import { menusStore } from '@/stores/modules/user'
import { getSystemDictLabel, SYSTEM_DICT_TYPE, toSystemDictOptions } from '@/utils/SystemDict'

interface TreeSelectOption {
  value: string
  title: string
  disabled?: boolean
  children?: TreeSelectOption[]
}

// 表单额外保存正在编辑的 ID；dataStatus 按接口文档由独立状态接口维护。
interface MenuFormState extends SaveSystemMenu {
  id?: string
  menuName: string
  menuPath: string
  menuRouter: string
  menuIcon: string
  menuType: MenuType
  sort: number
}

const currentMenus = menusStore()
const route = useRoute()
const router = useRouter()
const canWrite = computed(() => currentMenus.canWritePath(route.path))
const loading = ref(false)
const saving = ref(false)
const statusChangingId = ref('')
const editorOpen = ref(false)
const keyword = ref('')
const menuTree = ref<SystemMenu[]>([])
const statusDict = ref<SystemDictData[]>([])
const menuTypeDict = ref<SystemDictData[]>([])
const expandedRowKeys = ref<string[]>([])
const formRef = ref<FormInstance>()

const createEmptyForm = (): MenuFormState => ({
  parentId: null,
  menuName: '',
  menuPath: '',
  menuRouter: '',
  menuIcon: 'menuoutlined',
  menuType: 'MENU',
  sort: 0,
})

const formState = reactive<MenuFormState>(createEmptyForm())
const menuTypeOptions = computed(() => toSystemDictOptions(menuTypeDict.value, (value) => value as MenuType))

const loadDictionaries = async () => {
  const [statusResponse, menuTypeResponse] = await Promise.all([
    getEnabledDictData(SYSTEM_DICT_TYPE.commonStatus),
    getEnabledDictData(SYSTEM_DICT_TYPE.menuType),
  ])
  statusDict.value = statusResponse.data || []
  menuTypeDict.value = menuTypeResponse.data || []
}

const columns: TableColumnsType<SystemMenu> = [
  { title: '菜单名称', dataIndex: 'menuName', key: 'menuName', width: 230 },
  { title: '类型', dataIndex: 'menuType', key: 'menuType', width: 80 },
  { title: '访问路径', dataIndex: 'menuPath', key: 'menuPath', width: 180 },
  { title: '组件地址', dataIndex: 'menuRouter', key: 'menuRouter', width: 220 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 70, align: 'center' },
  { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 80 },
  { title: '操作', key: 'actions', width: 250, align: 'center' },
]

// 菜单名称最多 10 个字符，与数据库字段长度保持一致。
const rules: FormProps['rules'] = {
  menuName: [
    { required: true, message: '请输入菜单名称', trigger: 'blur' },
    { max: 10, message: '菜单名称不能超过 10 个字符', trigger: 'blur' },
  ],
  menuType: [
    { required: true, message: '请选择菜单类型', trigger: 'change' },
    { max: 20, message: '菜单类型不能超过 20 个字符', trigger: 'change' },
  ],
  menuPath: [{
    max: 100,
    message: '访问路径不能超过 100 个字符',
    trigger: 'blur',
  }, {
    validator: async () => {
      if (formState.menuType === 'MENU' && !formState.menuPath.trim()) {
        throw new Error('页面菜单必须填写访问路径')
      }
    },
    trigger: 'blur',
  }],
  menuRouter: [{ max: 100, message: '组件地址不能超过 100 个字符', trigger: 'blur' }],
  menuIcon: [
    { required: true, message: '请选择菜单图标', trigger: 'change' },
    { max: 200, message: '菜单图标不能超过 200 个字符', trigger: 'change' },
  ],
}

// 同时兼容管理接口返回树形数组或扁平数组。
const buildMenuTree = (source: SystemMenu[]): SystemMenu[] => {
  const hasChildren = source.some((item) => item.children?.length)
  if (hasChildren) {
    return source.map((item) => ({
      ...item,
      children: item.children ? buildMenuTree(item.children) : [],
    })).sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
  }

  const menuMap = new Map<string, SystemMenu>()
  source.forEach((item) => menuMap.set(String(item.id), { ...item, id: String(item.id), children: [] }))
  const roots: SystemMenu[] = []
  menuMap.forEach((item) => {
    const parent = item.parentId ? menuMap.get(String(item.parentId)) : undefined
    if (parent) parent.children?.push(item)
    else roots.push(item)
  })

  const sortTree = (items: SystemMenu[]): SystemMenu[] => items
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .map((item) => ({ ...item, children: sortTree(item.children || []) }))
  return sortTree(roots)
}

const flattenMenus = (menus: SystemMenu[]): SystemMenu[] => menus.flatMap((menu) => [
  menu,
  ...flattenMenus(menu.children || []),
])

// 搜索时保留命中的菜单及其完整上级，保证树形上下文不会丢失。
const filteredMenus = computed(() => {
  const searchText = keyword.value.trim().toLowerCase()
  if (!searchText) return menuTree.value

  const filterTree = (menus: SystemMenu[]): SystemMenu[] => menus.flatMap((menu) => {
    const children = filterTree(menu.children || [])
    const matched = `${menu.menuName || ''}${menu.menuRouter || ''}${menu.menuPath || ''}`.toLowerCase().includes(searchText)
    return matched || children.length ? [{ ...menu, children }] : []
  })
  return filterTree(menuTree.value)
})

const disabledParentIds = computed(() => {
  if (!formState.id) return new Set<string>()
  const current = flattenMenus(menuTree.value).find((menu) => menu.id === formState.id)
  return new Set([formState.id, ...flattenMenus(current?.children || []).map((menu) => menu.id)])
})

const parentTreeOptions = computed<TreeSelectOption[]>(() => {
  const convert = (menus: SystemMenu[]): TreeSelectOption[] => menus.map((menu) => ({
    value: menu.id,
    title: menu.menuName || '未命名菜单',
    disabled: disabledParentIds.value.has(menu.id),
    children: convert(menu.children || []),
  }))
  return convert(menuTree.value)
})

const loadMenus = async () => {
  loading.value = true
  try {
    // 列表必须使用当前用户菜单接口，确保租户和角色权限过滤始终生效。
    // 页面每次都直接请求用户菜单接口，不读取 Pinia 中可能已经过期的持久化数据。
    const userMenus = await currentMenus.getUserMenus()

    // 用户菜单接口不返回状态和类型；能返回的菜单必然已启用，类型在树组装后推断显示。
    const convertAuthorizedMenus = (menus: typeof userMenus): SystemMenu[] => menus.map((menu) => ({
      id: menu.id,
      parentId: menu.parentId,
      createTime: menu.createTime,
      dataStatus: 1,
      menuName: menu.menuName,
      menuPath: menu.menuPath,
      menuRouter: menu.menuRouter,
      menuIcon: menu.menuIcon,
      menuType: null,
      sort: menu.sort ?? 0,
      children: convertAuthorizedMenus(menu.children || []),
    }))
    const authorizedMenus = convertAuthorizedMenus(userMenus)
    menuTree.value = buildMenuTree(authorizedMenus)
    expandedRowKeys.value = flattenMenus(menuTree.value)
      .filter((menu) => menu.children?.length)
      .map((menu) => menu.id)
    if (!currentMenus.findByPath(route.path)) {
      const fallback = currentMenus.firstReadablePath()
      await router.replace(fallback ? (fallback.startsWith('/') ? fallback : `/${fallback}`) : '/no-permission')
    }
  } finally {
    loading.value = false
  }
}

// 用户菜单接口未返回 menuType 时，有下级的节点按目录展示，其余按菜单展示。
const getMenuTypeLabel = (menu: SystemMenu) => {
  const menuType = menu.menuType || (menu.children?.length ? 'DIRECTORY' : 'MENU')
  return getSystemDictLabel(menuTypeDict.value, menuType)
}

const resetForm = () => Object.assign(formState, createEmptyForm())

const openCreate = (parentId?: string) => {
  if (!canWrite.value) return
  resetForm()
  formState.parentId = parentId || null
  editorOpen.value = true
}

const openEdit = async (menu: SystemMenu) => {
  if (!canWrite.value) return
  const response = await selectSystemMenu(menu.id)
  if (!response.data) {
    message.warning('该菜单已不存在，请刷新列表')
    return
  }
  const detail = response.data
  Object.assign(formState, {
    id: detail.id,
    parentId: detail.parentId,
    menuName: detail.menuName || '',
    menuPath: detail.menuPath || '',
    menuRouter: detail.menuRouter || '',
    menuIcon: String(detail.menuIcon || 'menuoutlined').toLowerCase(),
    menuType: String(detail.menuType || 'MENU').toUpperCase() as MenuType,
    sort: detail.sort ?? 0,
  })
  editorOpen.value = true
}

const saveMenu = async () => {
  if (!canWrite.value) return
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: SaveSystemMenu = {
      parentId: formState.parentId || null,
      menuPath: formState.menuPath.trim() || null,
      menuRouter: formState.menuRouter.trim() || null,
      menuName: formState.menuName.trim(),
      menuIcon: formState.menuIcon || null,
      menuType: formState.menuType || null,
      sort: formState.sort,
    }
    if (formState.id) await updateSystemMenu(formState.id, payload)
    else await createSystemMenu(payload)

    message.success(formState.id ? '菜单修改成功' : '菜单新增成功')
    editorOpen.value = false
    await loadMenus()
  } finally {
    saving.value = false
  }
}

// 菜单状态不随编辑表单提交，严格调用文档规定的独立 PATCH 接口。
const changeStatus = async (menu: SystemMenu, enabled: boolean) => {
  if (!canWrite.value) return
  statusChangingId.value = menu.id
  try {
    await changeSystemMenuStatus(menu.id, enabled ? 1 : 0)
    message.success(enabled ? '菜单已启用' : '菜单已禁用')
    await loadMenus()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '菜单状态修改失败')
  } finally {
    statusChangingId.value = ''
  }
}

const removeMenu = async (menu: SystemMenu) => {
  if (!canWrite.value) return
  await deleteSystemMenu(menu.id)
  message.success('菜单删除成功')
  await loadMenus()
}

onMounted(() => {
  void loadMenus()
  void loadDictionaries()
})
</script>

<style scoped>
.menu-panel { overflow: hidden; }

.page-toolbar {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3);
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.page-toolbar > div,
.toolbar-actions,
.menu-name-cell,
.row-actions {
  display: flex;
  align-items: center;
}

.page-toolbar > div:first-child { gap: var(--du-space-2); }
.page-toolbar strong { font-size: 13px; }
.page-toolbar span { color: var(--du-text-muted); font-size: 10px; }
.toolbar-actions { gap: var(--du-space-2); }
.search-input { width: 220px; }

.menu-name-cell { gap: var(--du-space-2); }
.menu-name-cell :deep(.anticon) { color: var(--du-text-muted); font-size: 13px; }
.menu-name-cell strong { font-size: 11px; font-weight: 600; }
.type-label { color: var(--du-text-secondary); font-size: 10px; }
.route-value { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: 10px; }

.row-actions { justify-content: flex-end; }
.row-actions :deep(.ant-btn) { padding-inline: 5px; font-size: 10px; }

.menu-panel :deep(.ant-table-cell) { padding-top: 7px !important; padding-bottom: 7px !important; }
.menu-panel :deep(.ant-table-row-expand-icon) { transform: scale(.88); }

.menu-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
.number-input { width: 100%; }
.icon-option { display: inline-flex; align-items: center; gap: var(--du-space-2); }
</style>
