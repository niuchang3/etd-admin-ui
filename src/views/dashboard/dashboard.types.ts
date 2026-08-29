/** 仪表盘任务状态。 */
export type TaskStatus = '运行中' | '待处理' | '已完成' | '异常'

/** 任务表格单行数据。 */
export interface TaskRecord {
  id: string
  name: string
  description: string
  status: TaskStatus
  progress: number
  owner: string
  updatedAt: string
}
