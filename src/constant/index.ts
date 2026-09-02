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
 * 系统内置受保护的角色编码
 */
export const SYSTEM_ROLE_CODE = {
  /** 平台管理员角色编码 */
  PLATFORM_ADMIN: 'platformAdmin',
  /** 租户管理员角色编码 */
  TENANT_ADMIN: 'tenantAdmin',
} as const

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
  DIR: 'DIR',
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
