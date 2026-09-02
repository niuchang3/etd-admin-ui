<template>
  <!-- 应用面包屑根据当前路由自动生成，并支持点击返回上级页面。 -->
  <nav class="app-breadcrumb" aria-label="页面面包屑">
    <router-link class="breadcrumb-link root-link" :to="homePath">ETD Console</router-link>
    <RightOutlined />

    <!-- 详情页可以通过路由 meta.breadcrumb 增加任意数量的中间层级。 -->
    <template v-for="item in parentItems" :key="`${item.label}-${item.path}`">
      <router-link v-if="item.path" class="breadcrumb-link" :to="item.path">{{ item.label }}</router-link>
      <span v-else class="breadcrumb-text">{{ item.label }}</span>
      <RightOutlined />
    </template>

    <span class="breadcrumb-current" aria-current="page">{{ currentTitle }}</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RightOutlined } from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'

interface BreadcrumbItem {
  label: string
  path?: string
}

const route = useRoute()
const currentMenus = menusStore()
const homePath = computed(() => {
  const path = currentMenus.firstReadablePath()
  if (!path) return '/no-permission'
  return path.startsWith('/') ? path : `/${path}`
})

// 菜单页面直接读取 title；详情页面可额外配置可点击的父级 breadcrumb。
const currentTitle = computed(() => String(route.meta.title || '当前页面'))
const parentItems = computed(() => (route.meta.breadcrumb || []) as BreadcrumbItem[])
</script>

<style scoped>
.app-breadcrumb {
  display: flex;
  min-height: 20px;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--du-space-3);
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.app-breadcrumb :deep(.anticon) {
  color: #aab2c0;
  font-size: 10px;
}

.breadcrumb-link {
  color: var(--du-text-muted);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--du-accent);
}

.root-link {
  text-transform: uppercase;
}

.breadcrumb-text {
  color: var(--du-text-secondary);
}

.breadcrumb-current {
  color: var(--du-text-secondary);
}
</style>
