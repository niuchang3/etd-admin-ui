import { Modal } from 'ant-design-vue'

export interface ConfirmActionOptions {
  title: string
  content: string
  okText?: string
  cancelText?: string
  okType?: 'primary' | 'danger'
  onOk: () => Promise<void> | void
  onCancel?: () => void
}

/**
 * 统一的操作二次确认弹窗辅助函数
 */
export const confirmAction = (options: ConfirmActionOptions) => {
  Modal.confirm({
    title: options.title,
    content: options.content,
    okText: options.okText || (options.okType === 'danger' ? '确定删除' : '确定'),
    cancelText: options.cancelText || '取消',
    okType: options.okType || 'primary',
    onOk: options.onOk,
    onCancel: options.onCancel,
  })
}
