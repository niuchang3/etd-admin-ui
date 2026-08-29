<template>
  <!-- 紧凑型主导航，支持完整与收起两种状态。 -->
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="brand">
      <div class="brand-mark">E</div>
      <div v-if="!collapsed" class="brand-copy">
        <strong>ETD Console</strong>
        <span>Operations Suite</span>
      </div>
    </div>

    <!-- 根据分组配置渲染导航项和数量标记。 -->
    <nav class="navigation" aria-label="Main navigation">
      <div v-for="group in navigation" :key="group.label" class="nav-group">
        <p v-if="!collapsed" class="nav-label">{{ group.label }}</p>
        <button
          v-for="item in group.items"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ 'is-active': route.path === item.path }"
          :title="collapsed ? item.label : undefined"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" />
          <span v-if="!collapsed">{{ item.label }}</span>
          <span v-if="!collapsed && item.count" class="nav-count">{{ item.count }}</span>
        </button>
      </div>
    </nav>

    <!-- 底部按钮用于切换侧边栏宽度。 -->
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
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { navigation } from '@/config/navigation'

// 由应用外壳控制收起状态。
defineProps<{
  collapsed: boolean
}>()

// 向外通知收起操作，菜单跳转由 Vue Router 负责。
defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
/* 侧边栏基础布局与收起动画。 */
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

.sidebar.is-collapsed {
  width: 56px;
  flex-basis: 56px;
}

/* 顶部品牌标识。 */
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

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.15;
}

.brand-copy strong {
  color: #f4f7fb;
  font-size: 12px;
  letter-spacing: 0.02em;
}

.brand-copy span {
  margin-top: 3px;
  color: #778196;
  font-size: 10px;
}

/* 中部导航可独立滚动。 */
.navigation {
  flex: 1;
  overflow: auto;
  padding: var(--du-space-2);
}

.nav-group + .nav-group {
  margin-top: var(--du-space-4);
}

.nav-label {
  margin: 0 0 var(--du-space-1) var(--du-space-2);
  color: #687287;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* 导航项与收起按钮共用紧凑交互样式。 */
.nav-item,
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

.nav-item:hover,
.collapse-button:hover {
  color: #e7ebf2;
  background: #222833;
}

/* 当前选中项使用左侧高亮线标识。 */
.nav-item.is-active {
  color: var(--du-sidebar-text-active);
  background: #2a3342;
  box-shadow: inset 2px 0 0 #6c98ff;
}

.nav-item :deep(.anticon),
.collapse-button :deep(.anticon) {
  width: 16px;
  flex: 0 0 16px;
  font-size: 14px;
}

.nav-count {
  min-width: 18px;
  margin-left: auto;
  padding: 0 5px;
  border-radius: 8px;
  background: #343d4c;
  color: #cbd3df;
  font-family: var(--du-font-mono);
  font-size: 10px;
  line-height: 17px;
  text-align: center;
}

/* 侧边栏底部操作区。 */
.sidebar-footer {
  padding: var(--du-space-2);
  border-top: 1px solid var(--du-sidebar-border);
}

.is-collapsed .brand,
.is-collapsed .nav-item,
.is-collapsed .collapse-button {
  justify-content: center;
  padding-right: 0;
  padding-left: 0;
}
</style>
