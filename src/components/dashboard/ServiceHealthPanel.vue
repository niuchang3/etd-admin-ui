<template>
  <!-- 服务健康组件统一展示整体可用性、趋势和单服务延迟。 -->
  <section class="health-panel du-panel">
    <PanelHeader title="服务健康度" :meta="period">
      <a-button type="link" size="small" @click="$emit('detail')">查看详情</a-button>
    </PanelHeader>
    <div class="health-summary">
      <div class="health-score">
        <span class="du-mono">{{ availability }}</span>
        <small>整体可用性</small>
      </div>
      <div class="health-bars" aria-hidden="true">
        <span v-for="(point, index) in trend" :key="index" :style="{ height: `${point}%` }" :class="{ warning: point < 65 }" />
      </div>
    </div>
    <div class="service-list">
      <div v-for="service in services" :key="service.name" class="service-row">
        <span class="service-state" :class="service.tone" />
        <span class="service-name">{{ service.name }}</span>
        <span class="du-mono latency">{{ service.latency }}</span>
        <span class="du-mono availability">{{ service.availability }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import PanelHeader from '@/components/ui/PanelHeader.vue'

export interface ServiceHealthItem {
  name: string
  latency: string
  availability: string
  tone: 'healthy' | 'warning' | 'danger'
}

withDefaults(defineProps<{
  availability: string
  services: ServiceHealthItem[]
  trend: number[]
  period?: string
}>(), {
  period: '最近 5 分钟',
})

defineEmits<{
  detail: []
}>()
</script>

<style scoped>
.health-panel {
  overflow: hidden;
}

.health-summary {
  padding: var(--du-space-3);
  border-bottom: 1px solid var(--du-border);
}

.health-score {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.health-score span {
  font-size: 20px;
  font-weight: 650;
}

.health-score small {
  color: var(--du-text-muted);
  font-size: 10px;
}

.health-bars {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  height: 22px;
  margin-top: var(--du-space-3);
  align-items: end;
  gap: 2px;
}

.health-bars span {
  border-radius: 1px;
  background: #5dbb76;
}

.health-bars span.warning {
  background: #d59135;
}

.service-list {
  padding: var(--du-space-1) var(--du-space-3) var(--du-space-2);
}

.service-row {
  display: grid;
  grid-template-columns: 7px 1fr auto auto;
  min-height: 30px;
  align-items: center;
  gap: var(--du-space-2);
  border-bottom: 1px solid #edf0f4;
  font-size: 10px;
}

.service-row:last-child {
  border-bottom: 0;
}

.service-state {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #27a451;
}

.service-state.warning { background: #d88717; }
.service-state.danger { background: var(--du-negative); }
.service-name { color: var(--du-text-secondary); }
.latency { color: var(--du-text-muted); }
.availability { width: 46px; text-align: right; }
</style>
