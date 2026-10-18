<template>
  <!-- 通用组织架构/部门架构侧边栏树组件 -->
  <aside
    class="org-sidebar du-panel"
    :style="{
      width: sidebarWidth,
      flex: `0 0 ${sidebarWidth}`,
    }"
  >
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <span class="sidebar-title">
        <ClusterOutlined />{{ title }}
      </span>
      <a-tooltip title="刷新树结构">
        <a-button type="text" size="small" :loading="loading" @click="loadOrgTree">
          <ReloadOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <!-- 过滤搜索框 -->
    <div class="tree-search">
      <a-input
        v-model:value="searchKeyword"
        allow-clear
        :placeholder="`过滤${title}...`"
        size="small"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <!-- 树节点容器 -->
    <div class="tree-container">
      <!-- 顶部固定“全部”快捷节点（如“全部用户”、“全部可见目录”） -->
      <div
        v-if="allNodeText"
        class="all-items-node"
        :class="{ 'is-selected': !selectedOrgId }"
        @click="selectAllNode"
      >
        <component :is="allIconComponent" v-if="allIconComponent" class="all-icon" />
        <span>{{ allNodeText }}</span>
      </div>

      <a-spin :spinning="loading">
        <a-tree
          v-if="filteredTree.length"
          :selected-keys="selectedOrgKeys"
          :tree-data="filteredTree"
          :expanded-keys="expandedKeys"
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
        <a-empty
          v-else-if="!loading"
          :description="`暂无${title}`"
          class="empty-tree"
        />
      </a-spin>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ApartmentOutlined,
  ClusterOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { getUserOrganizationTree } from '@/apis/upms/user'
import type { Organization } from '@/apis/upms/organization/type'
import { filterTreeNodes } from '@/composables/useTreeHelper'

interface OrgTreeNode {
  key: string
  value: string
  title: string
  children?: OrgTreeNode[]
  raw: Organization
}

export interface OrgSidebarProps {
  /** 当前选中的部门/组织 ID */
  selectedOrgId?: string
  /** 侧边栏标题，默认“组织架构” */
  title?: string
  /** 顶部“全部”节点的显示文案（如“全部用户”、“全部可见目录”），传空则不展示 */
  allNodeText?: string
  /** 顶部“全部”节点的图标类型，可选 'team' | 'folder' | 'none'，默认 'team' */
  allNodeIcon?: 'team' | 'folder' | 'none'
  /** 组织树查询参数（如 { enabled: true }），默认不传参数以展示完整架构 */
  requestParams?: Record<string, any>
  /** 是否防 Antd 取消选中（点击已选节点时保持选中） */
  keepSelection?: boolean
  /** 侧栏宽度，默认 230px */
  width?: string | number
  /** 加载完成后，若未选中任何组织是否自动触发一次全部节点选中事件 */
  autoSelectAllOnLoad?: boolean
}

const props = withDefaults(defineProps<OrgSidebarProps>(), {
  selectedOrgId: '',
  title: '组织架构',
  allNodeText: '',
  allNodeIcon: 'team',
  requestParams: undefined,
  keepSelection: true,
  width: '230px',
  autoSelectAllOnLoad: true,
})

const emit = defineEmits<{
  (e: 'update:selectedOrgId', val: string): void
  (e: 'select', orgId: string, orgName: string): void
  (e: 'loaded', tree: Organization[]): void
}>()

const loading = ref(false)
const rawTree = ref<Organization[]>([])
const searchKeyword = ref('')
const expandedKeys = ref<string[]>([])

const sidebarWidth = computed(() => {
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

const selectedOrgKeys = computed(() => (props.selectedOrgId ? [props.selectedOrgId] : []))

const allIconComponent = computed(() => {
  if (props.allNodeIcon === 'folder') return FolderOpenOutlined
  if (props.allNodeIcon === 'team') return TeamOutlined
  return null
})

const mapOrgToTree = (items: Organization[]): OrgTreeNode[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    raw: org,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const filteredTree = computed(() => {
  const tree = mapOrgToTree(rawTree.value)
  return filterTreeNodes(tree, searchKeyword.value)
})

const findOrgById = (items: Organization[], id: string): Organization | null => {
  if (!id) return null
  for (const org of items) {
    if (String(org.id) === id) return org
    if (org.children?.length) {
      const found = findOrgById(org.children, id)
      if (found) return found
    }
  }
  return null
}

const selectOrg = (orgId: string, orgName: string) => {
  emit('update:selectedOrgId', orgId)
  emit('select', orgId, orgName)
}

const selectAllNode = () => {
  selectOrg('', props.allNodeText || '')
}

const onOrgSelect = (keys: unknown[], info: { node?: { key?: string | number } }) => {
  let targetKey = keys[0] ? String(keys[0]) : ''
  // 当用户点击已选中的节点时 Antd 会触发取消选中导致 keys 为空，此时从 info.node.key 保持选中
  if (!targetKey && props.keepSelection && info?.node?.key !== undefined) {
    targetKey = String(info.node.key)
  }
  if (!targetKey) {
    return
  }
  const org = findOrgById(rawTree.value, targetKey)
  const orgName = org?.orgName || (org as Record<string, any>)?.name || ''
  selectOrg(targetKey, orgName)
}

const onOrgExpand = (keys: unknown) => {
  expandedKeys.value = (keys as string[]) || []
}

const loadOrgTree = async () => {
  loading.value = true
  try {
    const response = await getUserOrganizationTree(props.requestParams)
    rawTree.value = response.data || []

    if (expandedKeys.value.length === 0) {
      expandedKeys.value = rawTree.value.map((o) => String(o.id))
    }

    emit('loaded', rawTree.value)

    if (props.autoSelectAllOnLoad) {
      if (!props.selectedOrgId || !findOrgById(rawTree.value, props.selectedOrgId)) {
        if (props.allNodeText) {
          selectOrg('', props.allNodeText)
        }
      } else {
        const currentOrg = findOrgById(rawTree.value, props.selectedOrgId)
        selectOrg(props.selectedOrgId, currentOrg?.orgName || '')
      }
    }
  } catch (err) {
    console.warn('[OrgSidebar] 加载组织架构树失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOrgTree()
})

defineExpose({
  loadOrgTree,
  rawTree,
})
</script>

<style scoped>
.org-sidebar {
  display: flex;
  flex-direction: column;
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-surface);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
  background: var(--du-bg-subtle);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--du-text);
}

.tree-search {
  padding: var(--du-space-2) var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: var(--du-space-2) var(--du-space-2);
}

.all-items-node {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  padding: 6px 8px;
  margin-bottom: 4px;
  border-radius: var(--du-radius-sm);
  font-size: 12px;
  color: var(--du-text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.all-items-node:hover {
  background: var(--du-bg-hover);
}

.all-items-node.is-selected {
  background: var(--du-primary-subtle, #e8f3ff);
  color: var(--du-primary);
  font-weight: 600;
}

.all-icon {
  font-size: 13px;
}

.org-node-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 155px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--du-font-size-sm, 12px);
}

.org-icon {
  font-size: var(--du-font-size-sm, 12px);
  color: var(--du-text-muted);
}

.org-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tree {
  margin-top: 30px;
}
</style>
