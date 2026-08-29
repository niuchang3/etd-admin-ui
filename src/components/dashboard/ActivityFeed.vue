<template>
  <!-- 最近活动组件可复用于总览、审计和用户详情页面。 -->
  <section class="activity-panel du-panel">
    <PanelHeader :title="title" :meta="meta" />
    <div class="activity-list">
      <article v-for="activity in items" :key="activity.time + activity.title" class="activity-item">
        <span class="activity-icon"><component :is="activity.icon" /></span>
        <div>
          <p>{{ activity.title }}</p>
          <span>{{ activity.user }} · {{ activity.time }}</span>
        </div>
      </article>
    </div>
    <button type="button" class="view-all" @click="$emit('viewAll')">查看全部活动 <RightOutlined /></button>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import PanelHeader from '@/components/ui/PanelHeader.vue'

export interface ActivityItem {
  title: string
  user: string
  time: string
  icon: Component
}

withDefaults(defineProps<{
  items: ActivityItem[]
  title?: string
  meta?: string
}>(), {
  title: '最近活动',
  meta: '实时',
})

defineEmits<{
  viewAll: []
}>()
</script>

<style scoped>
.activity-panel {
  overflow: hidden;
}

.activity-list {
  padding: var(--du-space-1) var(--du-space-3);
}

.activity-item {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: var(--du-space-2);
  border-bottom: 1px solid #edf0f4;
}

.activity-icon {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  color: #526076;
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-subtle);
  font-size: 11px;
}

.activity-item p {
  margin: 0;
  color: var(--du-text);
  font-size: 11px;
  line-height: 1.3;
}

.activity-item div > span {
  color: var(--du-text-muted);
  font-size: 9px;
}

.view-all {
  display: flex;
  width: 100%;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--du-accent);
  border: 0;
  border-top: 1px solid var(--du-border);
  background: var(--du-bg-subtle);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
}
</style>
