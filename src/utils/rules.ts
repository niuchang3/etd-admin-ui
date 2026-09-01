import type { Rule } from 'ant-design-vue/es/form'

/**
 * 通用必填规则
 */
export const requiredRule = (message: string, trigger: 'blur' | 'change' | ('blur' | 'change')[] = ['blur', 'change']): Rule => ({
  required: true,
  whitespace: true,
  message,
  trigger,
})

/**
 * 账号校验规则（必填、最大长度、支持自定义提示）
 */
export const accountRules = (options?: { maxLength?: number; requiredMessage?: string }): Rule[] => {
  const max = options?.maxLength ?? 32
  const msg = options?.requiredMessage ?? '请输入登录账号'
  return [
    { required: true, whitespace: true, message: msg, trigger: ['blur', 'change'] },
    { max, message: `账号最多 ${max} 个字符`, trigger: ['blur', 'change'] },
  ]
}

/**
 * 真实姓名校验规则
 */
export const userNameRules = (options?: { maxLength?: number; requiredMessage?: string }): Rule[] => {
  const max = options?.maxLength ?? 20
  const msg = options?.requiredMessage ?? '请输入真实姓名'
  return [
    { required: true, whitespace: true, message: msg, trigger: ['blur', 'change'] },
    { max, message: `姓名最多 ${max} 个字符`, trigger: ['blur', 'change'] },
  ]
}

/**
 * 手机号码格式与长度校验规则
 */
export const mobileRules = (options?: { required?: boolean; maxLength?: number }): Rule[] => {
  const max = options?.maxLength ?? 20
  const rules: Rule[] = [
    { max, message: `手机号码最多 ${max} 个字符`, trigger: ['blur', 'change'] },
  ]
  if (options?.required) {
    rules.unshift({ required: true, whitespace: true, message: '请输入手机号码', trigger: ['blur', 'change'] })
  }
  return rules
}

/**
 * 统一社会信用代码校验规则（18位字母或数字）
 */
export const creditCodeRules = (options?: { required?: boolean }): Rule[] => {
  const rules: Rule[] = [
    { max: 18, message: '统一社会信用代码最多 18 个字符', trigger: ['blur', 'change'] },
    {
      validator: async (_rule, value) => {
        if (!value) return
        const val = String(value).trim()
        if (val.length !== 18) {
          throw new Error('统一社会信用代码必须为 18 位')
        }
      },
      trigger: 'blur',
    },
  ]
  if (options?.required) {
    rules.unshift({ required: true, whitespace: true, message: '请输入统一社会信用代码', trigger: ['blur', 'change'] })
  }
  return rules
}

/**
 * 编码校验规则（如角色编码、组织编码、字典编码等）
 */
export const codeRules = (fieldLabel = '编码', maxLength = 50, required = true): Rule[] => {
  const rules: Rule[] = [
    { max: maxLength, message: `${fieldLabel}不能超过 ${maxLength} 个字符`, trigger: ['blur', 'change'] },
  ]
  if (required) {
    rules.unshift({ required: true, whitespace: true, message: `请输入${fieldLabel}`, trigger: ['blur', 'change'] })
  }
  return rules
}

/**
 * 排序值校验规则
 */
export const sortRules = (max = 9999): Rule[] => [
  {
    type: 'number',
    min: 0,
    max,
    message: `排序值必须在 0 到 ${max} 之间`,
    trigger: ['blur', 'change'],
  },
]

/**
 * 备注多行文本校验规则
 */
export const remarkRules = (maxLength = 500): Rule[] => [
  { max: maxLength, message: `备注最多 ${maxLength} 个字符`, trigger: ['blur', 'change'] },
]
