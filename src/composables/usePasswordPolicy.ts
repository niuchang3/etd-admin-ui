import { computed, type ComputedRef } from 'vue'
import type { Rule } from 'ant-design-vue/es/form'
import { useSystemConfigStore } from '@/stores/modules/config'

export interface UsePasswordPolicyOptions {
  required?: boolean
  requiredMessage?: string
  fieldLabel?: string
}

export interface UsePasswordPolicyReturn {
  passwordRules: ComputedRef<Rule[]>
  passwordPlaceholder: ComputedRef<string>
  minLength: ComputedRef<number>
}

/**
 * 全局统一的密码策略与安全强度校验 Hook
 * 自动与服务端 security.policy 保持动态响应
 */
export function usePasswordPolicy(options: UsePasswordPolicyOptions = {}): UsePasswordPolicyReturn {
  const {
    required = true,
    requiredMessage = '请输入登录密码',
    fieldLabel = '密码',
  } = options

  const configStore = useSystemConfigStore()

  const minLength = computed(() => configStore.security?.password?.minLength || 8)

  const passwordPlaceholder = computed(() => {
    return `请输入${fieldLabel}（至少 ${minLength.value} 位，需符合安全强度要求）`
  })

  const passwordRules = computed<Rule[]>(() => {
    const min = minLength.value
    const regexpStr = configStore.security?.password?.regexp

    const rules: Rule[] = []

    if (required) {
      rules.push({
        required: true,
        whitespace: true,
        message: requiredMessage,
        trigger: ['blur', 'change'],
      })
    }

    rules.push({
      validator: async (_rule: Rule, value: string) => {
        if (!value) {
          return Promise.resolve()
        }
        if (value.length < min) {
          return Promise.reject(new Error(`${fieldLabel}长度不能少于 ${min} 个字符`))
        }
        if (value.length > 72) {
          return Promise.reject(new Error(`${fieldLabel}长度不能超过 72 个字符`))
        }
        if (regexpStr) {
          try {
            const reg = new RegExp(regexpStr)
            if (!reg.test(value)) {
              return Promise.reject(
                new Error(`${fieldLabel}强度不符合系统安全策略（建议包含大小写字母与数字）`)
              )
            }
          } catch (e) {
            console.warn('Invalid security.password regexp:', regexpStr, e)
          }
        }
        return Promise.resolve()
      },
      trigger: ['blur', 'change'],
    })

    return rules
  })

  return {
    passwordRules,
    passwordPlaceholder,
    minLength,
  }
}
