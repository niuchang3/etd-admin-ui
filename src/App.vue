<template>
  <!-- 全局注入中文语言包与 Dense Utility 主题。 -->
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

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
