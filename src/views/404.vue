<template>
  <!-- 缺省页面使用友好的建设中提示，不直接向用户展示 404。 -->
  <section>
    <div class="placeholder-panel du-panel">
      <ToolOutlined />
      <strong>{{ title }}正在搭建</strong>
      <span>{{ description }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ToolOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const title = computed(() => String(route.meta.title ?? '功能页面'))
const description = computed(() => String(route.meta.description ?? '该功能将在这里接入。'))
</script>

<style scoped>
/* 缺省区域维持与管理平台一致的边框和紧凑间距。 */
.placeholder-panel {
  display: grid;
  min-height: 320px;
  place-items: center;
  align-content: center;
  gap: var(--du-space-2);
  color: var(--du-text-muted);
}

.placeholder-panel :deep(.anticon) {
  margin-bottom: var(--du-space-2);
  font-size: 28px;
}

.placeholder-panel strong {
  color: var(--du-text);
  font-size: 14px;
}

.placeholder-panel span {
  font-size: 11px;
}
</style>
