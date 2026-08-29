import {
  ApiOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import type { ActivityItem } from '@/components/dashboard/ActivityFeed.vue'
import type { MetricItem } from '@/components/dashboard/MetricGrid.vue'
import type { QuotaItem } from '@/components/dashboard/QuotaPanel.vue'
import type { ServiceHealthItem } from '@/components/dashboard/ServiceHealthPanel.vue'
import type { TaskRecord } from './dashboard.types'

/** 仪表盘模拟数据集中存放，后续接入接口时页面组件无需改动。 */
export const metrics: MetricItem[] = [
  { label: '活跃任务', value: '128', hint: '过去 24 小时', delta: '+12.4%', tone: 'positive', detail: '16 RUNNING', icon: SyncOutlined },
  { label: '成功率', value: '98.7%', hint: '近 7 日平均', delta: '+0.8%', tone: 'positive', detail: '1.3% FAILED', icon: CheckCircleOutlined },
  { label: '平均耗时', value: '04:18', hint: '较昨日', delta: '-00:32', tone: 'positive', detail: 'P95 12:40', icon: FieldTimeOutlined },
  { label: '待处理告警', value: '4', hint: '其中高优先级', delta: '+2', tone: 'negative', detail: '2 HIGH', icon: ExclamationCircleOutlined },
]

export const tasks: TaskRecord[] = [
  { id: 'JOB-2841', name: '租户数据增量同步', description: 'cn-east-1 / customer-core', status: '运行中', progress: 68, owner: '陈宇', updatedAt: '10:31:42' },
  { id: 'JOB-2840', name: '月度账单汇总', description: 'billing / 2026-08', status: '待处理', progress: 0, owner: '王璐', updatedAt: '10:28:06' },
  { id: 'JOB-2839', name: '访问策略一致性检查', description: 'iam-policy / all tenants', status: '已完成', progress: 100, owner: '林峰', updatedAt: '10:17:33' },
  { id: 'JOB-2838', name: '对象存储归档', description: 'oss-archive / audit-log', status: '异常', progress: 42, owner: '陈宇', updatedAt: '09:58:21' },
  { id: 'JOB-2837', name: '用户目录全量同步', description: 'directory / enterprise', status: '已完成', progress: 100, owner: '赵敏', updatedAt: '09:42:19' },
  { id: 'JOB-2836', name: '服务配置快照', description: 'config-center / production', status: '运行中', progress: 81, owner: '林峰', updatedAt: '09:31:55' },
  { id: 'JOB-2835', name: '历史审计日志清理', description: 'audit / retention-180d', status: '待处理', progress: 0, owner: '王璐', updatedAt: '09:20:12' },
]

export const services: ServiceHealthItem[] = [
  { name: 'API Gateway', latency: '42ms', availability: '99.99%', tone: 'healthy' },
  { name: 'Identity Service', latency: '68ms', availability: '99.97%', tone: 'healthy' },
  { name: 'Job Scheduler', latency: '124ms', availability: '99.82%', tone: 'warning' },
  { name: 'Data Pipeline', latency: '51ms', availability: '99.99%', tone: 'healthy' },
]

export const serviceTrend = [100, 82, 72, 91, 68, 86, 100, 73, 94, 78, 100, 84, 90, 95, 89, 96, 55, 83, 100, 87, 94, 90, 98, 86]

export const activities: ActivityItem[] = [
  { title: '任务 JOB-2839 执行完成', user: 'System', time: '2 分钟前', icon: FileDoneOutlined },
  { title: '更新了租户访问策略', user: '林峰', time: '8 分钟前', icon: TeamOutlined },
  { title: '数据源连接已恢复', user: 'System', time: '16 分钟前', icon: DatabaseOutlined },
  { title: '部署 API Gateway v2.8.4', user: '陈宇', time: '31 分钟前', icon: ApiOutlined },
]

export const quotas: QuotaItem[] = [
  { label: 'API 请求', value: '6.8M / 10M', percent: 68 },
  { label: '对象存储', value: '742GB / 1TB', percent: 74 },
  { label: '计算时长', value: '418h / 800h', percent: 52 },
]
