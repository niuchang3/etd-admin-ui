/**
 * 统一系统常量定义
 */

/**
 * 认证与令牌相关键名及前缀
 */
export const AUTH_TOKEN_KEY = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const

export type AuthTokenKey = typeof AUTH_TOKEN_KEY[keyof typeof AUTH_TOKEN_KEY]

/** 授权头前缀 */
export const AUTH_TOKEN_PREFIX = 'Bearer '

/**
 * HTTP 请求头通用键名
 */
export const HTTP_HEADER = {
  AUTHORIZATION: 'Authorization',
  TENANT_CODE: 'TENANT-CODE',
  APPLICATION: 'x-application',
  VERSION: 'x-version',
  DEVICE_ID: 'x-device-id',
  DEVICE_FINGERPRINT: 'x-device-fingerprint',
} as const

export type HttpHeaderKey = typeof HTTP_HEADER[keyof typeof HTTP_HEADER]

/**
 * 后端统一业务响应码
 */
export const RESULT_CODE = {
  /** 接口调用成功业务码 */
  SUCCESS: 2000,
} as const

/**
 * 角色数据权限类型（permissionType）
 */
export const ROLE_PERMISSION_TYPE = {
  /** 1: 不限制数据权限 */
  NO_LIMIT: '1',
  /** 2: 仅本人数据权限 */
  SELF_ONLY: '2',
  /** 3: 仅当前组织数据权限 */
  CURRENT_ORG: '3',
  /** 4: 当前组织及下级组织数据权限 */
  CURRENT_AND_SUB_ORG: '4',
  /** 5: 自定义跨组织数据权限 */
  CUSTOM_ORG: '5',
} as const

export type RolePermissionTypeValue = typeof ROLE_PERMISSION_TYPE[keyof typeof ROLE_PERMISSION_TYPE]

/**
 * 系统内置受保护的角色编码（后端已统一为大写下划线格式）
 */
export const SYSTEM_ROLE_CODE = {
  /** 平台管理员角色编码 */
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  /** 租户管理员角色编码 */
  TENANT_ADMIN: 'TENANT_ADMIN',
  /** 普通用户角色编码 */
  ORDINARY: 'ORDINARY',
} as const

export const SystemRole = SYSTEM_ROLE_CODE

export type SystemRoleCodeValue = typeof SYSTEM_ROLE_CODE[keyof typeof SYSTEM_ROLE_CODE]

/**
 * 菜单访问控制级别
 */
export const MENU_ACCESS_LEVEL = {
  /** 只读 */
  READ_ONLY: 'READ_ONLY',
  /** 读写 */
  READ_WRITE: 'READ_WRITE',
} as const

export type MenuAccessLevelValue = typeof MENU_ACCESS_LEVEL[keyof typeof MENU_ACCESS_LEVEL]

/**
 * 通用启用/禁用状态
 */
export const COMMON_STATUS = {
  /** 启用 / 正常 */
  ENABLED: 1,
  /** 禁用 / 停用 */
  DISABLED: 0,
} as const

export type CommonStatusValue = typeof COMMON_STATUS[keyof typeof COMMON_STATUS]

/**
 * 菜单类型常量
 */
export const MENU_TYPE = {
  /** 目录 */
  DIRECTORY: 'DIRECTORY',
  /** 菜单 */
  MENU: 'MENU',
  /** 按钮权限 */
  BUTTON: 'BUTTON',
} as const

export type MenuTypeValue = typeof MENU_TYPE[keyof typeof MENU_TYPE]

/**
 * 默认菜单图标
 */
export const DEFAULT_MENU_ICON = 'menuoutlined'

/**
 * 事件中心权限资源码
 */
export const EVENT_PERMISSION_CODE = {
  TYPE: 'event:type',
  SUBSCRIPTION: 'event:subscription',
  MESSAGE: 'event:message',
  DELIVERY: 'event:delivery',
} as const

export type EventPermissionCodeValue = typeof EVENT_PERMISSION_CODE[keyof typeof EVENT_PERMISSION_CODE]

/**
 * 事件投递状态常量
 * 0: 待投递, 1: 投递中, 2: 成功, 3: 等待重试, 4: 死信
 */
export const EVENT_DELIVERY_STATUS = {
  PENDING: 0,
  DELIVERING: 1,
  SUCCESS: 2,
  RETRYING: 3,
  DEAD_LETTER: 4,
} as const

export type EventDeliveryStatusValue = typeof EVENT_DELIVERY_STATUS[keyof typeof EVENT_DELIVERY_STATUS]

/**
 * 事件投递状态中文标签映射
 */
export const EVENT_DELIVERY_STATUS_LABEL: Record<number, string> = {
  [EVENT_DELIVERY_STATUS.PENDING]: '待投递',
  [EVENT_DELIVERY_STATUS.DELIVERING]: '投递中',
  [EVENT_DELIVERY_STATUS.SUCCESS]: '成功',
  [EVENT_DELIVERY_STATUS.RETRYING]: '等待重试',
  [EVENT_DELIVERY_STATUS.DEAD_LETTER]: '死信',
}

/**
 * 事件投递状态对应的 Badge/Tag 状态
 */
export const EVENT_DELIVERY_STATUS_BADGE: Record<number, 'default' | 'processing' | 'success' | 'warning' | 'error'> = {
  [EVENT_DELIVERY_STATUS.PENDING]: 'default',
  [EVENT_DELIVERY_STATUS.DELIVERING]: 'processing',
  [EVENT_DELIVERY_STATUS.SUCCESS]: 'success',
  [EVENT_DELIVERY_STATUS.RETRYING]: 'warning',
  [EVENT_DELIVERY_STATUS.DEAD_LETTER]: 'error',
}

/**
 * 事件投递状态筛选下拉选项
 */
export const EVENT_DELIVERY_STATUS_OPTIONS = [
  { label: '待投递', value: EVENT_DELIVERY_STATUS.PENDING },
  { label: '投递中', value: EVENT_DELIVERY_STATUS.DELIVERING },
  { label: '成功', value: EVENT_DELIVERY_STATUS.SUCCESS },
  { label: '等待重试', value: EVENT_DELIVERY_STATUS.RETRYING },
  { label: '死信', value: EVENT_DELIVERY_STATUS.DEAD_LETTER },
]
