<template>
  <a-modal
    :open="open"
    :title="formState.id ? '编辑租户资料' : '新增租户'"
    :confirm-loading="saving"
    width="640px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-form ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="tenant-form">
      <!-- 租户基础资料分区 -->
      <div class="form-section-title">租户基本信息</div>
      <div class="form-grid">
        <a-form-item label="租户名称" name="tenantName" class="full-row">
          <a-input v-model:value="formState.tenantName" :maxlength="64" show-count placeholder="请输入租户名称" />
        </a-form-item>

        <a-form-item label="统一社会信用代码" name="creditCode">
          <a-input v-model:value="formState.creditCode" :maxlength="18" show-count placeholder="18位统一社会信用代码" />
        </a-form-item>

        <a-form-item label="租户类型" name="tenantType">
          <a-select
            v-model:value="formState.tenantType"
            :options="tenantTypeOptions"
            :disabled="Boolean(formState.id)"
            placeholder="请选择租户类型"
          />
        </a-form-item>

        <a-form-item label="租户描述" name="description" class="full-row">
          <a-textarea v-model:value="formState.description" :maxlength="255" :rows="2" show-count placeholder="请输入租户简要描述" />
        </a-form-item>

        <a-form-item label="Logo 地址" name="logo" class="full-row">
          <a-input v-model:value="formState.logo" :maxlength="255" placeholder="请输入 Logo 图片 URL 地址（选填）" />
        </a-form-item>
      </div>

      <!-- 管理员资料分区（仅新增租户时显示） -->
      <template v-if="!formState.id">
        <div class="form-section-title">租户管理员初始配置</div>
        <div class="form-grid">
          <a-form-item label="管理员账号" :name="['administrator', 'account']" :rules="administratorAccountRules">
            <a-input v-model:value="formState.administrator.account" :maxlength="32" show-count placeholder="请输入管理员登录账号" autocomplete="off" />
          </a-form-item>
          <a-form-item label="管理员姓名" :name="['administrator', 'userName']" :rules="administratorUserNameRules">
            <a-input v-model:value="formState.administrator.userName" :maxlength="20" show-count placeholder="请输入管理员真实姓名" />
          </a-form-item>
          <a-form-item label="管理员密码" :name="['administrator', 'password']" :rules="passwordRules">
            <a-input-password
              v-model:value="formState.administrator.password"
              :maxlength="72"
              :placeholder="passwordPlaceholder"
              autocomplete="new-password"
            />
            <template #extra>
              <span class="form-item-extra">已填充系统默认初始密码，创建后可由用户自行修改</span>
            </template>
          </a-form-item>
          <a-form-item label="手机号码" :name="['administrator', 'mobile']" :rules="administratorMobileRules">
            <a-input v-model:value="formState.administrator.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
          </a-form-item>
        </div>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { createTenant, updateTenant } from '@/apis/upms/tenant'
import type { TenantCreateForm, TenantRecord, TenantUpdateForm } from '@/apis/upms/tenant/type'
import { SYSTEM_DICT_TYPE } from '@/utils/SystemDict'
import { useSystemDict } from '@/composables/useSystemDict'
import { usePasswordPolicy } from '@/composables/usePasswordPolicy'
import {
  accountRules as getAccountRules,
  creditCodeRules as getCreditCodeRules,
  mobileRules as getMobileRules,
  userNameRules as getUserNameRules,
} from '@/utils/rules'

interface TenantFormState {
  id?: string
  logo?: string
  tenantName: string
  description?: string
  creditCode?: string
  tenantType?: string
  administrator: {
    account: string
    password: string
    userName: string
    mobile?: string
  }
}

const props = defineProps<{
  open: boolean
  record: TenantRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)

const { getDict, getOptions, getLabel } = useSystemDict([SYSTEM_DICT_TYPE.tenantType])

const { passwordRules, passwordPlaceholder, defaultPassword } = usePasswordPolicy({
  required: true,
  requiredMessage: '请输入管理员密码',
  fieldLabel: '管理员密码',
})

const emptyForm = (): TenantFormState => ({
  id: undefined,
  logo: '',
  tenantName: '',
  description: '',
  creditCode: '',
  tenantType: 'ordinary',
  administrator: {
    account: '',
    password: defaultPassword.value,
    userName: '',
    mobile: '',
  },
})

const formState = reactive<TenantFormState>(emptyForm())

const tenantTypeOptions = computed(() => {
  if (!formState.id) {
    const ordinaryItem = getDict(SYSTEM_DICT_TYPE.tenantType).find((item) => item.dictValue === 'ordinary')
    return [{ label: ordinaryItem ? ordinaryItem.dictLabel : '普通租户', value: 'ordinary' }]
  }
  const opts = getOptions(SYSTEM_DICT_TYPE.tenantType)
  if (opts.length) return opts
  return [{ label: getLabel(SYSTEM_DICT_TYPE.tenantType, formState.tenantType), value: formState.tenantType || 'ordinary' }]
})

const formRules: Record<string, Rule[]> = {
  tenantName: [
    { required: true, whitespace: true, message: '请输入租户名称', trigger: 'blur' },
    { max: 64, message: '租户名称不能超过 64 个字符', trigger: 'blur' },
  ],
  creditCode: getCreditCodeRules({ required: false }),
  tenantType: [{ required: true, message: '请选择租户类型', trigger: 'change' }],
  description: [{ max: 255, message: '租户描述不能超过 255 个字符', trigger: 'blur' }],
}

const administratorAccountRules = getAccountRules({ maxLength: 32, requiredMessage: '请输入管理员登录账号' })
const administratorUserNameRules = getUserNameRules({ maxLength: 20, requiredMessage: '请输入管理员真实姓名' })
const administratorMobileRules = getMobileRules({ maxLength: 20 })

watch(
  () => props.open,
  (val) => {
    if (val) {
      if (props.record) {
        Object.assign(formState, {
          id: props.record.id,
          logo: props.record.logo || '',
          tenantName: props.record.tenantName,
          description: props.record.description || '',
          creditCode: props.record.creditCode || '',
          tenantType: props.record.tenantType || 'ordinary',
          administrator: { account: '', password: '', userName: '', mobile: '' },
        })
      } else {
        Object.assign(formState, emptyForm())
      }
    }
  }
)

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (formState.id) {
      const updateData: TenantUpdateForm = {
        tenantName: formState.tenantName.trim(),
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        logo: formState.logo?.trim() || undefined,
      }
      await updateTenant(formState.id, updateData)
      message.success('租户资料更新成功')
    } else {
      const createData: TenantCreateForm = {
        tenantName: formState.tenantName.trim(),
        description: formState.description?.trim() || undefined,
        creditCode: formState.creditCode?.trim() || undefined,
        logo: formState.logo?.trim() || undefined,
        tenantType: 'ordinary',
        administrator: {
          account: formState.administrator.account.trim(),
          password: formState.administrator.password,
          userName: formState.administrator.userName.trim(),
          mobile: formState.administrator.mobile?.trim() || undefined,
        },
      }
      await createTenant(createData)
      message.success('新增租户成功')
    }
    emit('update:open', false)
    emit('success')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.tenant-form {
  padding-top: var(--du-space-2);
}

.form-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--du-text);
  margin-bottom: var(--du-space-3);
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--du-border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 var(--du-space-4);
}

.full-row {
  grid-column: span 2;
}

.form-item-extra {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-tertiary, #8c8c8c);
  line-height: 1.4;
  margin-top: 2px;
  display: block;
}
</style>
