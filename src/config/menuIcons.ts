import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BellOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOutlined,
  MenuOutlined,
  MessageOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import type { Component } from 'vue'

// 后端只返回图标名称，前端在这里统一转换为实际图标组件。
const menuIconMap: Record<string, Component> = {
  apartment: ApartmentOutlined,
  apartmentoutlined: ApartmentOutlined,
  api: ApiOutlined,
  apioutlined: ApiOutlined,
  appstore: AppstoreOutlined,
  appstoreoutlined: AppstoreOutlined,
  bell: BellOutlined,
  belloutlined: BellOutlined,
  database: DatabaseOutlined,
  databaseoutlined: DatabaseOutlined,
  file: FileTextOutlined,
  filetextoutlined: FileTextOutlined,
  folder: FolderOutlined,
  folderoutlined: FolderOutlined,
  message: MessageOutlined,
  messageoutlined: MessageOutlined,
  notification: NotificationOutlined,
  notificationoutlined: NotificationOutlined,
  safety: SafetyCertificateOutlined,
  safetycertificateoutlined: SafetyCertificateOutlined,
  send: SendOutlined,
  sendoutlined: SendOutlined,
  setting: SettingOutlined,
  settingoutlined: SettingOutlined,
  tags: TagsOutlined,
  tagsoutlined: TagsOutlined,
  team: TeamOutlined,
  teamoutlined: TeamOutlined,
  list: UnorderedListOutlined,
  unorderedlistoutlined: UnorderedListOutlined,
  menu: MenuOutlined,
  menuoutlined: MenuOutlined,
  user: UserOutlined,
  useroutlined: UserOutlined,
}

/** 菜单管理表单中允许选择的图标。 */
export const menuIconOptions = [
  { label: '首页', value: 'appstoreoutlined' },
  { label: '租户/团队', value: 'teamoutlined' },
  { label: '用户', value: 'useroutlined' },
  { label: '系统设置', value: 'settingoutlined' },
  { label: '系统字典', value: 'databaseoutlined' },
  { label: '角色/权限', value: 'safetycertificateoutlined' },
  { label: '菜单', value: 'menuoutlined' },
  { label: '部门', value: 'apartmentoutlined' },
  { label: '文件', value: 'filetextoutlined' },
  { label: '目录', value: 'folderoutlined' },
  { label: '列表', value: 'unorderedlistoutlined' },
  { label: '通知', value: 'belloutlined' },
  { label: '事件中心', value: 'notificationoutlined' },
  { label: '事件类型', value: 'tagsoutlined' },
  { label: '事件订阅', value: 'apioutlined' },
  { label: '事件消息', value: 'messageoutlined' },
  { label: '投递管理', value: 'sendoutlined' },
]

/** 未识别的后端图标使用通用菜单图标兜底。 */
export const resolveMenuIcon = (iconName?: string): Component => {
  const normalizedName = String(iconName || '').replace(/[-_\s]/g, '').toLowerCase()
  return menuIconMap[normalizedName] || MenuOutlined
}
