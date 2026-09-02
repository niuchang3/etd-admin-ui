<template>
  <!-- 全局注入中文语言包与 Dense Utility 主题。 -->
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useSystemConfigStore } from '@/stores/modules/config'

const configStore = useSystemConfigStore()
const route = useRoute()

// 更新网页 Favicon
const updateFavicon = (url: string) => {
  if (!url) return
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}

// 动态合成网页标题
const updateDocumentTitle = () => {
  const siteName = configStore.branding?.name || 'ETD 后台管理系统'
  const pageTitle = route.meta?.title ? `${route.meta.title} - ${siteName}` : siteName
  document.title = pageTitle
}

// 监听 branding 数据变化，实时更新 Title 和 Favicon
watch(
  () => configStore.branding,
  (branding) => {
    if (!branding) return
    if (branding.favicon) {
      updateFavicon(branding.favicon)
    }
    updateDocumentTitle()
  },
  { deep: true, immediate: true }
)

// 监听路由变化，更新网页 Title
watch(
  () => route.path,
  () => {
    updateDocumentTitle()
  }
)

onMounted(async () => {
  if (!configStore.isBrandingLoaded) {
    try {
      await configStore.fetchBrandingConfig()
    } catch (e) {
      console.warn('App.vue failed to initialize branding config:', e)
    }
  }
})

// Ant Design Vue 全局主题：使用紧凑算法并对齐项目设计变量。
const themeConfig = {
  algorithm: theme.compactAlgorithm,
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#15803d',
    colorWarning: '#b45309',
    colorError: '#b91c1c',
    colorText: '#172033',
    colorTextSecondary: '#5c667a',
    colorBorder: '#d9dee8',
    colorBgLayout: '#eef1f5',
    borderRadius: 4,
    controlHeight: 32,
    fontSize: 13,
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}
</script>
