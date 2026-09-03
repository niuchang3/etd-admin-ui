<template>
  <a-drawer
    :open="open"
    :title="`设置菜单 - ${tenant?.tenantName || ''}`"
    width="580"
    :closable="!saving"
    :mask-closable="!saving"
    @close="onClose"
    @update:open="onOpenChange"
  >
    <template #extra>
      <a-button :disabled="saving" @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSaveMenuSettings">保存菜单</a-button>
    </template>

    <a-spin :spinning="loading">
      <div class="menu-drawer-summary">
        <div>
          <strong>{{ tenant?.tenantName }}</strong>
          <small class="du-mono code-value">{{ tenant?.creditCode || '普通租户' }}</small>
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
            <code v-if="node.permissionCode" class="permission-code-tag">{{ node.permissionCode }}</code>
            <a-tag :color="node.menuType === 'DIRECTORY' ? 'orange' : 'blue'" class="node-type-tag">
              {{ node.menuType === 'DIRECTORY' ? '目录' : '菜单' }}
            </a-tag>
          </div>
        </template>
      </a-tree>
      <a-empty v-else-if="!loading" description="暂无可分配的已启用菜单" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import * as antIcons from '@ant-design/icons-vue'
import { AppstoreOutlined, FolderOutlined } from '@ant-design/icons-vue'
import { getTenantMenuSettings, replaceTenantMenus } from '@/apis/upms/tenant'
import type { TenantRecord } from '@/apis/upms/tenant/type'
import { buildTreeStructure, useTreeSelection, type TreeNodeItem } from '@/composables/useTreeHelper'
import { confirmAction } from '@/utils/confirm'

const props = defineProps<{
  open: boolean
  tenant: TenantRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)
const saving = ref(false)
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

const resolveMenuIcon = (iconName?: string) => {
  if (!iconName) return FolderOutlined
  const icons = antIcons as unknown as Record<string, unknown>
  const matched = icons[iconName]
  return matched || AppstoreOutlined
}

const loadMenuSettings = async () => {
  if (!props.tenant?.id) return
  loading.value = true
  clearChecked()
  collapseAll()
  try {
    const response = await getTenantMenuSettings(props.tenant.id)
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
        permissionCode: item.permissionCode || null,
        children: [],
      }),
    })

    if (expandedKeys.value.length === 0) {
      expandAll(menuTree.value)
    }
  } catch (error) {
    console.error('加载租户菜单配置失败:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val && props.tenant) {
      void loadMenuSettings()
    }
  }
)

const onClose = () => {
  if (saving.value) return
  emit('update:open', false)
}

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleSaveMenuSettings = async () => {
  if (!props.tenant) return
  const finalSelectedIds = getSelectedAndHalfKeys()
  const removedMenuCount = originalSelectedMenuIds.value.filter((id) => !finalSelectedIds.includes(id)).length

  const executeSave = async () => {
    saving.value = true
    try {
      await replaceTenantMenus(props.tenant!.id, { menuIds: finalSelectedIds })
      message.success('租户可用菜单已保存')
      emit('update:open', false)
      emit('success')
    } finally {
      saving.value = false
    }
  }

  if (removedMenuCount > 0) {
    confirmAction({
      title: '确认调整租户菜单权限',
      content: `本次修改将移除该租户下 ${removedMenuCount} 个已有菜单。该租户下所有角色对这些菜单的权限将被同步收回。是否继续？`,
      okText: '确认保存',
      okType: 'danger',
      onOk: executeSave,
    })
  } else {
    await executeSave()
  }
}
</script>

<style scoped>
.menu-drawer-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--du-bg-subtle);
  border-radius: var(--du-radius-sm);
  margin-bottom: var(--du-space-3);
  font-size: 11px;
}

.menu-drawer-summary strong {
  display: block;
  font-size: 12px;
  color: var(--du-text);
}

.code-value {
  font-size: 11px;
  color: var(--du-text-muted);
}

.menu-drawer-alert {
  margin-bottom: var(--du-space-3);
}

.tree-toolbar {
  display: flex;
  gap: var(--du-space-2);
  margin-bottom: var(--du-space-2);
}

.menu-node-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.node-icon {
  font-size: 12px;
  color: var(--du-text-secondary);
}

.node-name {
  font-weight: 500;
}

.permission-code-tag {
  font-family: var(--du-font-mono);
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary);
}

.node-type-tag {
  font-size: var(--du-font-size-xs, 11px);
  line-height: 16px;
  padding: 0 4px;
}
</style>
