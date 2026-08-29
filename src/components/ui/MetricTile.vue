<template>
  <!-- 指标单元展示名称、主数值、变化量和补充信息。 -->
  <article class="metric-tile">
    <div class="metric-head">
      <span>{{ label }}</span>
      <component :is="icon" />
    </div>
    <div class="metric-body">
      <strong class="du-mono">{{ value }}</strong>
      <span v-if="delta" class="delta" :class="`delta--${tone}`">{{ delta }}</span>
    </div>
    <div class="metric-foot">
      <span>{{ hint }}</span>
      <span v-if="detail" class="du-mono">{{ detail }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

// 指标内容和变化趋势均由父组件配置。
withDefaults(defineProps<{
  label: string
  value: string
  hint: string
  icon: Component
  delta?: string
  detail?: string
  tone?: 'positive' | 'negative' | 'neutral'
}>(), {
  delta: '',
  detail: '',
  tone: 'neutral',
})
</script>

<style scoped>
/* 多个指标单元使用分隔线组成密集指标条。 */
.metric-tile {
  min-width: 0;
  padding: var(--du-space-3);
  border-right: 1px solid var(--du-border);
  background: var(--du-bg-surface);
}

.metric-tile:last-child {
  border-right: 0;
}

/* 指标的上、中、下三层都使用水平对齐。 */
.metric-head,
.metric-body,
.metric-foot {
  display: flex;
  align-items: center;
}

.metric-head {
  justify-content: space-between;
  color: var(--du-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.metric-head :deep(.anticon) {
  color: var(--du-text-muted);
  font-size: 14px;
}

.metric-body {
  gap: var(--du-space-2);
  margin-top: var(--du-space-2);
}

.metric-body strong {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.035em;
}

/* 变化量标记及涨跌颜色。 */
.delta {
  padding: 1px 5px;
  border-radius: 3px;
  background: #eef0f3;
  color: var(--du-text-secondary);
  font-family: var(--du-font-mono);
  font-size: 9px;
  font-weight: 650;
}

.delta--positive { color: var(--du-positive); background: #edf8f0; }
.delta--negative { color: var(--du-negative); background: #fff0f0; }

.metric-foot {
  justify-content: space-between;
  margin-top: 5px;
  color: var(--du-text-muted);
  font-size: 10px;
}
</style>
