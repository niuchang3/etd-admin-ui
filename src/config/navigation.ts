import {
  AppstoreOutlined,
  BellOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import type { Component } from 'vue'

/** 单个侧边导航项。 */
export interface NavigationItem {
  key: string
  label: string
  path: string
  icon: Component
  count?: number
}

/** 侧边导航分组。 */
export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

/**
 * 全局导航配置。
 * 菜单名称、图标和路由只在这里维护，避免页面和侧边栏重复声明。
 */
export const navigation: NavigationGroup[] = [
  {
    label: '运营中心',
    items: [
      { key: 'dashboard', label: '运营总览', path: '/dashboard', icon: AppstoreOutlined },
      { key: 'tasks', label: '任务中心', path: '/tasks', icon: FileTextOutlined, count: 12 },
      { key: 'alerts', label: '告警与事件', path: '/alerts', icon: BellOutlined, count: 4 },
    ],
  },
  {
    label: '资源管理',
    items: [
      { key: 'tenants', label: '账户与租户', path: '/tenants', icon: TeamOutlined },
      { key: 'resources', label: '资源目录', path: '/resources', icon: DatabaseOutlined },
      { key: 'permissions', label: '权限策略', path: '/permissions', icon: SafetyCertificateOutlined },
    ],
  },
  {
    label: '系统',
    items: [{ key: 'settings', label: '系统设置', path: '/settings', icon: SettingOutlined }],
  },
]
