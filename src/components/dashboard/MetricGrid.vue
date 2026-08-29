<template>
  <!-- 将多个关键指标组合成统一的四列摘要区域。 -->
  <section class="metric-grid du-panel" aria-label="关键指标">
    <MetricTile v-for="metric in items" :key="metric.label" v-bind="metric" />
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import MetricTile from '@/components/ui/MetricTile.vue'

export interface MetricItem {
  label: string
  value: string
  hint: string
  icon: Component
  delta?: string
  detail?: string
  tone?: 'positive' | 'negative' | 'neutral'
}

defineProps<{
  items: MetricItem[]
}>()
</script>

<style scoped>
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}
</style>
