<template>
  <aside class="org-sidebar du-panel">
    <div class="sidebar-header">
      <span class="sidebar-title">
        <ClusterOutlined />组织架构
      </span>
      <a-tooltip title="刷新组织树">
        <a-button type="text" size="small" :loading="loading" @click="loadOrgTree">
          <ReloadOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <div class="tree-search">
      <a-input v-model:value="searchKeyword" allow-clear placeholder="过滤组织..." size="small">
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
        <a-empty v-else-if="!loading" description="暂无组织" class="empty-tree" />
      </a-spin>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApartmentOutlined, ClusterOutlined, ReloadOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { getUserOrganizationTree } from '@/apis/upms/user'
import type { Organization } from '@/apis/upms/organization/type'
import { filterTreeNodes } from '@/composables/useTreeHelper'

interface OrgTreeNode {
  key: string
  value: string
  title: string
  children?: OrgTreeNode[]
}

const props = defineProps<{
  selectedOrgId?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedOrgId', val: string): void
  (e: 'select', orgId: string): void
  (e: 'loaded', tree: Organization[]): void
}>()

const loading = ref(false)
const rawTree = ref<Organization[]>([])
const searchKeyword = ref('')
const expandedKeys = ref<string[]>([])

const selectedOrgKeys = computed(() => (props.selectedOrgId ? [props.selectedOrgId] : []))

const mapOrgToTree = (items: Organization[]): OrgTreeNode[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const filteredTree = computed(() => {
  const tree = mapOrgToTree(rawTree.value)
  return filterTreeNodes(tree, searchKeyword.value)
})

const loadOrgTree = async () => {
  loading.value = true
  try {
    const response = await getUserOrganizationTree({ enabled: true })
    rawTree.value = response.data || []
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = rawTree.value.map((o) => String(o.id))
    }
    emit('loaded', rawTree.value)
  } catch (err) {
    console.warn('加载组织树失败:', err)
  } finally {
    loading.value = false
  }
}

const selectOrg = (orgId: string) => {
  emit('update:selectedOrgId', orgId)
  emit('select', orgId)
}

const onOrgSelect = (keys: unknown[]) => {
  const firstKey = keys[0] ? String(keys[0]) : ''
  selectOrg(firstKey)
}

const onOrgExpand = (keys: unknown) => {
  expandedKeys.value = (keys as string[]) || []
}

onMounted(() => {
  void loadOrgTree()
})

defineExpose({
  loadOrgTree,
})
</script>

<style scoped>
.org-sidebar {
  display: flex;
  width: 230px;
  flex: 0 0 230px;
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

.all-users-node {
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

.all-users-node:hover {
  background: var(--du-bg-hover);
}

.all-users-node.is-selected {
  background: var(--du-primary-subtle, #e8f3ff);
  color: var(--du-primary);
  font-weight: 600;
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
