/** 项目支持的运行环境类型。 */
export type RuntimeEnvironmentKey = 'development' | 'test' | 'staging' | 'production'

interface RuntimeEnvironment {
  key: RuntimeEnvironmentKey
  label: string
  className: string
}

// 将常见的环境简写统一转换为项目内部环境类型。
const environmentAliases: Record<string, RuntimeEnvironmentKey> = {
  dev: 'development',
  development: 'development',
  local: 'development',
  test: 'test',
  testing: 'test',
  stage: 'staging',
  staging: 'staging',
  pre: 'staging',
  preproduction: 'staging',
  prod: 'production',
  production: 'production',
}

const environmentLabels: Record<RuntimeEnvironmentKey, string> = {
  development: 'Development',
  test: 'Testing',
  staging: 'Staging',
  production: 'Production',
}

// 优先读取项目变量；未配置时使用 Vite 当前运行模式作为兜底。
const configuredEnvironment = String(import.meta.env.VITE_APP_ENV || import.meta.env.MODE).toLowerCase()
const environmentKey = environmentAliases[configuredEnvironment] || 'development'

/** 登录页和管理平台共用的当前环境信息。 */
export const runtimeEnvironment: RuntimeEnvironment = {
  key: environmentKey,
  label: environmentLabels[environmentKey],
  className: `runtime-environment--${environmentKey}`,
}
