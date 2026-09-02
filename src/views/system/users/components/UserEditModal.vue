<template>
  <a-modal
    :open="open"
    title="编辑用户资料"
    width="580px"
    :confirm-loading="saving"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-spin :spinning="detailLoading">
      <a-form ref="formRef" :model="formState" layout="vertical" class="user-modal-form">
        <div class="form-grid">
          <a-form-item label="登录账号" name="account" :rules="accountRules">
            <a-input v-model:value="formState.account" :maxlength="32" show-count placeholder="请输入登录账号" />
          </a-form-item>

          <a-form-item label="真实姓名" name="userName" :rules="userNameRules">
            <a-input v-model:value="formState.userName" :maxlength="20" show-count placeholder="请输入真实姓名" />
          </a-form-item>

          <a-form-item label="用户昵称" name="nickName">
            <a-input v-model:value="formState.nickName" :maxlength="32" show-count placeholder="请输入用户昵称" />
          </a-form-item>

          <a-form-item label="手机号码" name="mobile" :rules="mobileRules">
            <a-input v-model:value="formState.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
          </a-form-item>

          <a-form-item label="出生日期" name="birthday">
            <a-date-picker
              v-model:value="formState.birthday"
              value-format="YYYY-MM-DD"
              class="w-full"
              placeholder="请选择出生日期"
            />
          </a-form-item>

          <a-form-item label="性别" name="gender">
            <a-radio-group v-model:value="formState.gender">
              <a-radio :value="1">男</a-radio>
              <a-radio :value="2">女</a-radio>
              <a-radio :value="0">未知</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="头像地址" name="avatar" class="full-row">
            <a-input v-model:value="formState.avatar" :maxlength="255" placeholder="请输入头像 URL 地址" />
          </a-form-item>
        </div>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import { getUserDetail, updateUser } from '@/apis/upms/user'
import type { UserRecord, UserUpdatePayload } from '@/apis/upms/user/type'
import { accountRules as getAccountRules, userNameRules as getUserNameRules, mobileRules as getMobileRules } from '@/utils/rules'

const props = defineProps<{
  open: boolean
  user: UserRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const detailLoading = ref(false)

const accountRules = getAccountRules({ maxLength: 32, requiredMessage: '请输入登录账号' })
const userNameRules = getUserNameRules({ maxLength: 20, requiredMessage: '请输入真实姓名' })
const mobileRules = getMobileRules({ maxLength: 20 })

const formState = reactive<UserUpdatePayload>({
  account: '',
  userName: '',
  nickName: '',
  mobile: '',
  birthday: '',
  gender: 1,
  avatar: '',
})

watch(
  () => props.open,
  async (val) => {
    if (val && props.user) {
      detailLoading.value = true
      try {
        const res = await getUserDetail(props.user.id)
        const data = res.data || props.user
        Object.assign(formState, {
          account: data.account || '',
          userName: data.userName || '',
          nickName: data.nickName || '',
          mobile: data.mobile || '',
          birthday: data.birthday ? data.birthday.slice(0, 10) : '',
          gender: data.gender ?? 1,
          avatar: data.avatar || '',
        })
      } finally {
        detailLoading.value = false
      }
    }
  }
)

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleSubmit = async () => {
  if (!props.user?.id) return
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: UserUpdatePayload = {
      account: formState.account.trim(),
      userName: formState.userName.trim(),
      nickName: formState.nickName?.trim() || undefined,
      mobile: formState.mobile?.trim() || undefined,
      birthday: formState.birthday || undefined,
      gender: formState.gender,
      avatar: formState.avatar?.trim() || undefined,
    }
    await updateUser(props.user.id, payload)
    message.success('用户资料修改成功')
    emit('update:open', false)
    emit('success')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.user-modal-form {
  padding-top: var(--du-space-2);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 var(--du-space-4);
}

.full-row {
  grid-column: span 2;
}

.w-full {
  width: 100%;
}
</style>
