<template>
  <!-- 应用侧栏从当前租户的菜单接口读取树形导航。 -->
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="brand">
      <div class="brand-mark">E</div>
      <div v-if="!collapsed" class="brand-copy">
        <strong>ETD Console</strong>
        <span>Operations Suite</span>
      </div>
    </div>

    <nav class="navigation" aria-label="主导航">
      <!-- 首次请求菜单时显示紧凑加载状态。 -->
      <div v-if="loading" class="menu-state">
        <a-spin size="small" />
        <span v-if="!collapsed">正在加载菜单</span>
      </div>

      <!-- 请求失败时允许主动重试，不使用静态菜单掩盖接口问题。 -->
      <div v-else-if="loadFailed" class="menu-state menu-error">
        <ExclamationCircleOutlined />
        <span v-if="!collapsed">菜单加载失败</span>
        <button v-if="!collapsed" type="button" @click="loadMenus">重试</button>
      </div>

      <a-empty v-else-if="!menuItems?.length && !collapsed" :image="simpleImage" description="暂无可用菜单" />

      <!-- Ant Design Menu 根据 children 递归渲染任意层级菜单树。 -->
      <a-menu
        v-else
        mode="inline"
        theme="dark"
        :inline-collapsed="collapsed"
        :items="menuItems"
        :selected-keys="selectedKeys"
        @click="handleMenuClick"
      />
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="collapse-button" @click="$emit('toggle')">
        <MenuUnfoldOutlined v-if="collapsed" />
        <MenuFoldOutlined v-else />
        <span v-if="!collapsed">收起导航</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { Empty, type MenuProps } from 'ant-design-vue'
import { ExclamationCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import type { UserMenus } from '@/apis/upms/login/type'
import { resolveMenuIcon } from '@/config/menuIcons'
import { menusStore } from '@/stores/modules/user'

defineProps<{
  collapsed: boolean
}>()

defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const currentMenus = menusStore()
const loading = ref(false)
const loadFailed = ref(false)
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

// menuRouter 优先作为前端路由；未提供时兼容旧字段 menuPath。
const getMenuRoute = (menu: UserMenus) => {
  const rawPath = String(menu.menuRouter || menu.menuPath || '').trim()
  if (!rawPath || /^https?:\/\//i.test(rawPath)) return rawPath
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`
}

// 菜单 key 使用后端 ID，实际跳转地址单独保存，避免父节点没有路由时发生误跳转。
const menuRouteMap = computed(() => {
  const routeMap = new Map<string, string>()
  const collectRoutes = (menus: UserMenus[]) => {
    menus.forEach((menu) => {
      const targetPath = getMenuRoute(menu)
      if (targetPath) routeMap.set(menu.id, targetPath)
      if (menu.children?.length) collectRoutes(menu.children)
    })
  }
  collectRoutes(currentMenus.menus)
  return routeMap
})

// 将后端菜单节点转换为 Ant Design Vue 所需的树形 items。
const convertMenuItem = (menu: UserMenus): NonNullable<MenuProps['items']>[number] => ({
  key: menu.id,
  label: menu.menuName,
  icon: h(resolveMenuIcon(menu.menuIcon)),
  children: menu.children?.length ? menu.children.map(convertMenuItem) : undefined,
})

const menuItems = computed<MenuProps['items']>(() => currentMenus.menus.map(convertMenuItem))

// 当前 URL 对应的菜单会自动高亮。
const selectedKeys = computed(() => {
  const matchedEntry = Array.from(menuRouteMap.value.entries()).find(([, path]) => path === route.path)
  return matchedEntry ? [matchedEntry[0]] : []
})

const loadMenus = async () => {
  if (loading.value) return
  loading.value = true
  loadFailed.value = false
  try {
    await currentMenus.getUserMenus()
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
  const targetPath = menuRouteMap.value.get(String(key))
  if (targetPath) void router.push(targetPath)
}

// 登录流程通常已经获取菜单；刷新页面且本地没有菜单时在此补充请求。
onMounted(() => {
  if (!currentMenus.menus.length) void loadMenus()
})
</script>

<style scoped>
.sidebar {
  position: relative;
  z-index: 3;
  display: flex;
  width: var(--du-sidebar-width);
  height: 100vh;
  flex: 0 0 var(--du-sidebar-width);
  flex-direction: column;
  color: var(--du-sidebar-text);
  border-right: 1px solid #10131a;
  background: var(--du-sidebar);
  transition: width 160ms ease, flex-basis 160ms ease;
}

.sidebar.is-collapsed { width: 56px; flex-basis: 56px; }

.brand {
  display: flex;
  height: var(--du-header-height);
  flex: 0 0 var(--du-header-height);
  align-items: center;
  gap: var(--du-space-2);
  padding: 0 var(--du-space-3);
  border-bottom: 1px solid var(--du-sidebar-border);
}

.brand-mark {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  color: #fff;
  border: 1px solid #5079db;
  border-radius: var(--du-radius-sm);
  background: #2d5ec4;
  font-size: 14px;
  font-weight: 800;
}

.brand-copy { display: flex; min-width: 0; flex-direction: column; line-height: 1.15; }
.brand-copy strong { color: #f4f7fb; font-size: 12px; letter-spacing: 0.02em; }
.brand-copy span { margin-top: 3px; color: #778196; font-size: 10px; }

.navigation { min-height: 0; flex: 1; overflow: auto; padding: var(--du-space-2); }
.navigation :deep(.ant-menu) { border-inline-end: 0 !important; background: transparent; font-size: 11px; }
.navigation :deep(.ant-menu-item),
.navigation :deep(.ant-menu-submenu-title) { height: 32px; margin: 2px 0; line-height: 32px; }
.navigation :deep(.ant-menu-item-selected) { background: #2a3342 !important; box-shadow: inset 2px 0 0 #6c98ff; }
.navigation :deep(.ant-menu-sub.ant-menu-inline) { background: #151922 !important; }

.menu-state {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: var(--du-space-2);
  color: #7f8a9d;
  font-size: 10px;
}

.menu-error { flex-direction: column; }
.menu-error button { color: #8fb0ff; border: 0; background: transparent; cursor: pointer; font-size: 10px; }
.navigation :deep(.ant-empty-description) { color: #687287; font-size: 10px; }

.sidebar-footer { padding: var(--du-space-2); border-top: 1px solid var(--du-sidebar-border); }
.collapse-button {
  display: flex;
  width: 100%;
  height: 32px;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  color: inherit;
  border: 0;
  border-radius: var(--du-radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.collapse-button:hover { color: #e7ebf2; background: #222833; }
.collapse-button :deep(.anticon) { width: 16px; flex: 0 0 16px; font-size: 14px; }
.is-collapsed .brand,
.is-collapsed .collapse-button { justify-content: center; padding-right: 0; padding-left: 0; }
</style>
