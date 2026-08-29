<template>
  <!-- 页面头部统一展示层级路径、标题、说明与主操作。 -->
  <div class="page-header">
    <div>
      <div class="eyebrow">
        <span>{{ section }}</span>
        <RightOutlined />
        <span>{{ title }}</span>
      </div>
      <div class="title-row">
        <h1>{{ title }}</h1>
        <slot name="badge" />
      </div>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="actions"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'

// 页面头部所需的文本信息。
defineProps<{
  section: string
  title: string
  description?: string
}>()
</script>

<style scoped>
/* 标题信息与右侧操作区的两端布局。 */
.page-header {
  display: flex;
  min-height: 62px;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--du-space-4);
  margin-bottom: var(--du-space-3);
}

.eyebrow,
.title-row,
.actions {
  display: flex;
  align-items: center;
}

/* 页面层级路径使用弱化的大写标记。 */
.eyebrow {
  gap: 5px;
  margin-bottom: 3px;
  color: var(--du-text-muted);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.eyebrow :deep(.anticon) {
  font-size: 8px;
}

.title-row {
  gap: var(--du-space-2);
}

h1 {
  margin: 0;
  color: var(--du-text);
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

p {
  margin: 3px 0 0;
  color: var(--du-text-secondary);
  font-size: 12px;
}

.actions {
  gap: var(--du-space-2);
}
</style>
