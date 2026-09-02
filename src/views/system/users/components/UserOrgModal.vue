<template>
  <a-modal
    :open="open"
    :title="`设置组织 - ${user?.userName || user?.account || ''}`"
    width="560px"
    :confirm-loading="saving"
    ok-text="保存组织"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-spin :spinning="loading">
      <div class="assign-summary">
        <span>登录账号：<code class="du-mono font-bold">{{ user?.account }}</code></span>
        <span>已归属 <b>{{ targetOrgIds.length }}</b> 个组织</span>
      </div>
      <a-alert message="全量替换用户所属组织机构。如需设置主组织，请先勾选对应组织后在下方下拉框中指定。" type="info" show-icon class="mb-3" />
      <a-form layout="vertical">
        <a-form-item label="所属组织">
          <a-tree-select
            v-model:value="targetOrgIds"
            :tree-data="orgSelectTreeData"
            tree-checkable
            tree-default-expand-all
            allow-clear
            placeholder="请勾选用户所属的组织架构"
            @change="onAssignOrgChange"
          />
        </a-form-item>

        <a-form-item label="主组织">
          <a-select
            v-model:value="targetPrimaryOrgId"
            allow-clear
            :disabled="!targetOrgIds.length"
            :options="primaryOrgOptions"
            placeholder="请从已选组织中选择主组织"
          />
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { Id } from '@/apis/types'
import { getUserOrganizations, replaceUserOrganizations } from '@/apis/upms/user'
import type { UserRecord } from '@/apis/upms/user/type'
import type { Organization } from '@/apis/upms/organization/type'
import { confirmAction } from '@/utils/confirm'

const props = defineProps<{
  open: boolean
  user: UserRecord | null
  orgTree: Organization[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)
const saving = ref(false)
const targetOrgIds = ref<string[]>([])
const targetPrimaryOrgId = ref<string | undefined>(undefined)

const mapOrgToTree = (items: Organization[]): any[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const orgSelectTreeData = computed(() => mapOrgToTree(props.orgTree))

const findOrgNames = (ids: Id[], tree: Organization[]): { label: string; value: string }[] => {
  const result: { label: string; value: string }[] = []
  const idSet = new Set(ids.map(String))
  const walk = (nodes: Organization[]) => {
    nodes.forEach((n) => {
      if (idSet.has(String(n.id))) {
        result.push({ label: n.orgName, value: String(n.id) })
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(tree)
  return result
}

const primaryOrgOptions = computed(() => {
  if (!targetOrgIds.value.length) return []
  return findOrgNames(targetOrgIds.value, props.orgTree)
})

const onAssignOrgChange = (selected: unknown[]) => {
  const ids = (selected as string[]) || []
  if (targetPrimaryOrgId.value && !ids.includes(String(targetPrimaryOrgId.value))) {
    targetPrimaryOrgId.value = undefined
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val && props.user) {
      loading.value = true
      targetOrgIds.value = []
      targetPrimaryOrgId.value = undefined
      try {
        const res = await getUserOrganizations(props.user.id)
        const orgs = res.data || []
        targetOrgIds.value = orgs.map((o) => String(o.organizationId))
        const primary = orgs.find((o) => o.primaryOrganization)
        targetPrimaryOrgId.value = primary ? String(primary.organizationId) : undefined
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
  const organizationIds = targetOrgIds.value
  const primaryOrganizationId = targetPrimaryOrgId.value || null

  const executeSave = async () => {
    saving.value = true
    try {
      await replaceUserOrganizations(props.user!.id, {
        organizationIds,
        primaryOrganizationId,
      })
      message.success('组织分配成功')
      emit('update:open', false)
      emit('success')
    } finally {
      saving.value = false
    }
  }

  if (organizationIds.length === 0) {
    confirmAction({
      title: '确认清空用户组织',
      content: `确定要清空用户【${props.user.userName || props.user.account}】的组织绑定吗？`,
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
  font-size: var(--du-font-size-xs, 11px);
}

.mb-3 {
  margin-bottom: var(--du-space-3);
}

.font-bold {
  font-weight: 700;
}
</style>
