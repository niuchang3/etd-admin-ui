<template>
  <!-- 资源配额组件使用统一进度条展示多项容量使用情况。 -->
  <section class="quota-panel du-panel">
    <PanelHeader :title="title" :meta="meta" />
    <div v-for="quota in items" :key="quota.label" class="quota-row">
      <div><span>{{ quota.label }}</span><strong class="du-mono">{{ quota.value }}</strong></div>
      <CompactProgress :value="quota.percent" :show-value="false" />
    </div>
  </section>
</template>

<script setup lang="ts">
import CompactProgress from '@/components/data/CompactProgress.vue'
import PanelHeader from '@/components/ui/PanelHeader.vue'

export interface QuotaItem {
  label: string
  value: string
  percent: number
}

withDefaults(defineProps<{
  items: QuotaItem[]
  title?: string
  meta?: string
}>(), {
  title: '资源配额',
  meta: '本月',
})
</script>

<style scoped>
.quota-panel {
  overflow: hidden;
  padding-bottom: var(--du-space-1);
}

.quota-row {
  padding: var(--du-space-2) var(--du-space-3);
}

.quota-row > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--du-text-secondary);
  font-size: 10px;
}

.quota-row strong {
  color: var(--du-text-secondary);
  font-size: 9px;
  font-weight: 500;
}

.quota-row :deep(.progress-track) {
  width: 100%;
}
</style>
