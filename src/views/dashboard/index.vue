<template>
  <!-- Dashboard 页面只负责编排已经封装好的业务组件。 -->
  <section>
    <PageHeader
      section="ETD Console"
      title="运营总览"
      description="统一查看关键指标、待处理任务和平台运行状态。"
    >
      <template #badge><StatusBadge tone="success">系统正常</StatusBadge></template>
      <a-button @click="refresh"><ReloadOutlined />刷新</a-button>
      <a-button type="primary" @click="createTask"><PlusOutlined />新建任务</a-button>
    </PageHeader>

    <MetricGrid :items="metrics" />

    <div class="dashboard-grid">
      <TaskTable :tasks="tasks" />
      <aside class="dashboard-sidebar">
        <ServiceHealthPanel availability="99.98%" :services="services" :trend="serviceTrend" />
        <ActivityFeed :items="activities" />
        <QuotaPanel :items="quotas" />
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import MetricGrid from '@/components/dashboard/MetricGrid.vue'
import QuotaPanel from '@/components/dashboard/QuotaPanel.vue'
import ServiceHealthPanel from '@/components/dashboard/ServiceHealthPanel.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import TaskTable from './components/TaskTable.vue'
import { activities, metrics, quotas, services, serviceTrend, tasks } from './dashboard.mock'

const refresh = () => message.success('仪表盘数据已刷新')
const createTask = () => message.info('新建任务流程将在任务模块中接入')
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(680px, 1fr) 304px;
  align-items: start;
  gap: var(--du-space-3);
  margin-top: var(--du-space-3);
}

.dashboard-sidebar {
  display: grid;
  min-width: 0;
  gap: var(--du-space-3);
}

@media (max-width: 1240px) {
  .dashboard-grid {
    grid-template-columns: minmax(680px, 1fr) 272px;
  }
}
</style>
