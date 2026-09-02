<template>
  <a-modal
    :open="open"
    :title="`设置角色 - ${user?.userName || user?.account || ''}`"
    width="520px"
    :confirm-loading="saving"
    ok-text="保存角色"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-spin :spinning="loading">
      <div class="assign-summary">
        <span>登录账号：<code class="du-mono font-bold">{{ user?.account }}</code></span>
        <span>已选 <b>{{ targetRoleIds.length }}</b> 个角色</span>
      </div>
      <a-alert message="设置将全量替换该用户的角色分配。若清空全部角色，该用户将失去角色对应菜单及功能权限。" type="info" show-icon class="mb-3" />
      <div class="tree-toolbar mb-2">
        <a-button size="small" @click="targetRoleIds = roleOptions.map(r => String(r.value))">全选</a-button>
        <a-button size="small" @click="targetRoleIds = []">清空</a-button>
      </div>
      <div class="role-select-box">
        <a-checkbox-group v-model:value="targetRoleIds" class="role-checkbox-group">
          <a-checkbox v-for="item in roleOptions" :key="item.value" :value="String(item.value)">
            {{ item.label }}
          </a-checkbox>
        </a-checkbox-group>
        <a-empty v-if="!roleOptions.length" description="暂无可分配角色" />
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getUserRoles, replaceUserRoles } from '@/apis/upms/user'
import type { UserRecord } from '@/apis/upms/user/type'
import { getSystemRolePage } from '@/apis/upms/role'
import type { SystemRole } from '@/apis/upms/role/type'
import { isRestrictedAssignRole } from '@/utils/role'
import { confirmAction } from '@/utils/confirm'

const props = defineProps<{
  open: boolean
  user: UserRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)
const saving = ref(false)
const rawRoles = ref<SystemRole[]>([])
const targetRoleIds = ref<string[]>([])

const roleOptions = computed(() =>
  rawRoles.value
    .filter((r) => !isRestrictedAssignRole(r))
    .map((r) => ({
      label: r.roleName,
      value: String(r.id),
    }))
)

const loadRoles = async () => {
  try {
    const res = await getSystemRolePage({ current: 1, size: 200, dataStatus: 1 })
    rawRoles.value = res.data?.records || []
  } catch (err) {
    console.warn('加载角色失败:', err)
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val && props.user) {
      loading.value = true
      targetRoleIds.value = []
      try {
        await loadRoles()
        const res = await getUserRoles(props.user.id)
        const allowedRoleIdSet = new Set(roleOptions.value.map((r) => String(r.value)))
        targetRoleIds.value = (res.data || [])
          .filter((r) => !isRestrictedAssignRole(r))
          .map((r) => String(r.roleId))
          .filter((id) => allowedRoleIdSet.has(id))
      } finally {
        loading.value = false
      }
    }
  }
)

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleSubmit = async () => {
  if (!props.user?.id) return
  const allowedRoleIdSet = new Set(roleOptions.value.map((r) => String(r.value)))
  const roleIds = targetRoleIds.value.filter((id) => allowedRoleIdSet.has(String(id)))

  const executeSave = async () => {
    saving.value = true
    try {
      await replaceUserRoles(props.user!.id, { roleIds })
      message.success('角色分配成功')
      emit('update:open', false)
      emit('success')
    } finally {
      saving.value = false
    }
  }

  if (roleIds.length === 0) {
    confirmAction({
      title: '确认清空用户角色',
      content: `确定要清空用户【${props.user.userName || props.user.account}】的全部角色吗？该用户将失去所有角色授权。`,
      okText: '确认清空',
      okType: 'danger',
      onOk: executeSave,
    })
  } else {
    await executeSave()
  }
}
</script>

<style scoped>
.assign-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--du-bg-subtle);
  border-radius: var(--du-radius-sm);
  margin-bottom: var(--du-space-3);
  font-size: 11px;
}

.tree-toolbar {
  display: flex;
  gap: var(--du-space-2);
}

.role-select-box {
  max-height: 280px;
  overflow: auto;
  padding: var(--du-space-3);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-surface);
}

.role-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mb-2 {
  margin-bottom: var(--du-space-2);
}

.mb-3 {
  margin-bottom: var(--du-space-3);
}

.font-bold {
  font-weight: 700;
}
</style>
