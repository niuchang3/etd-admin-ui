import {
  ApartmentOutlined,
  AppstoreOutlined,
  BellOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import type { Component } from 'vue'

// 后端只返回图标名称，前端在这里统一转换为实际图标组件。
const menuIconMap: Record<string, Component> = {
  apartment: ApartmentOutlined,
  apartmentoutlined: ApartmentOutlined,
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
  safety: SafetyCertificateOutlined,
  safetycertificateoutlined: SafetyCertificateOutlined,
  setting: SettingOutlined,
  settingoutlined: SettingOutlined,
  team: TeamOutlined,
  teamoutlined: TeamOutlined,
  list: UnorderedListOutlined,
  unorderedlistoutlined: UnorderedListOutlined,
  user: UserOutlined,
  useroutlined: UserOutlined,
}

/** 未识别的后端图标使用通用菜单图标兜底。 */
export const resolveMenuIcon = (iconName?: string): Component => {
  const normalizedName = String(iconName || '').replace(/[-_\s]/g, '').toLowerCase()
  return menuIconMap[normalizedName] || MenuOutlined
}
