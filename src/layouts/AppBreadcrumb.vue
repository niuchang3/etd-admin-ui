<template>
  <!-- 应用面包屑根据当前路由自动生成，并支持点击返回上级页面。 -->
  <nav class="app-breadcrumb" aria-label="页面面包屑">
    <router-link class="breadcrumb-link root-link" :to="homePath">ETD Console</router-link>
    <RightOutlined />

    <!-- 知识库工作区动态面包屑 -->
    <template v-if="isKbWorkspace">
      <router-link class="breadcrumb-link" :to="{ path: '/ai/knowledge-bases', query: kbListQuery }">知识库</router-link>
      <RightOutlined />
      <span class="breadcrumb-text">{{ kbStore.currentKb?.name || '知识库' }}</span>
      <RightOutlined />
      <template v-if="isChunksPage">
        <router-link class="breadcrumb-link" :to="`/ai/knowledge-bases/${currentKbId}/documents`">文档管理</router-link>
        <RightOutlined />
        <span class="breadcrumb-current" aria-current="page">{{ currentTitle }}</span>
      </template>
      <span v-else class="breadcrumb-current" aria-current="page">{{ currentTitle }}</span>
    </template>

    <!-- 详情页可以通过路由 meta.breadcrumb 增加任意数量的中间层级。 -->
    <template v-else>
      <template v-for="item in parentItems" :key="`${item.label}-${item.path}`">
        <router-link v-if="item.path" class="breadcrumb-link" :to="item.path">{{ item.label }}</router-link>
        <span v-else class="breadcrumb-text">{{ item.label }}</span>
        <RightOutlined />
      </template>

      <span class="breadcrumb-current" aria-current="page">{{ currentTitle }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RightOutlined } from '@ant-design/icons-vue'
import { menusStore } from '@/stores/modules/user'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'

interface BreadcrumbItem {
  label: string
  path?: string
}

const route = useRoute()
const currentMenus = menusStore()
const kbStore = useKnowledgeBaseStore()

const homePath = computed(() => {
  const path = currentMenus.firstReadablePath()
  if (!path) return '/no-permission'
  return path.startsWith('/') ? path : `/${path}`
})

const currentKbId = computed(() => {
  if (route.path.startsWith('/ai/knowledge-bases/')) {
    return String(route.params.id || '')
  }
  if (route.path.includes('/chunks')) {
    return String(route.query.kbId || kbStore.currentKb?.id || '')
  }
  return ''
})

const isKbWorkspace = computed(() => {
  if (route.path.startsWith('/ai/knowledge-bases/') && Boolean(route.params.id)) {
    return true
  }
  if (route.path.includes('/chunks') && Boolean(currentKbId.value)) {
    return true
  }
  return false
})

const isChunksPage = computed(() => route.path.includes('/chunks'))

const kbListQuery = computed(() => {
  const q: Record<string, any> = {}
  if (kbStore.listQuery.current > 1) q.current = kbStore.listQuery.current
  if (kbStore.listQuery.keyword) q.keyword = kbStore.listQuery.keyword
  return q
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
