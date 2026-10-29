<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    :width="780"
    :mask-closable="true"
    :destroy-on-close="true"
    body-style="padding: 0; display: flex; flex-direction: column; overflow: hidden;"
    class="agent-chat-drawer"
    @close="handleClose"
  >
    <template #extra>
      <div class="drawer-header-extra">
        <a-tag v-if="agent?.published" color="green" class="status-tag">已发布上线</a-tag>
        <a-tag v-else color="orange" class="status-tag">未正式发布</a-tag>
      </div>
    </template>

    <div v-if="agent" class="chat-drawer-container">
      <AgentChatBox
        :agent-id="String(agent.id)"
        conversation-type="chat"
        @close="handleClose"
      />
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AgentChatBox from './AgentChatBox.vue'
import type { AgentSummary } from '@/apis/ai/agent/type'

interface Props {
  open: boolean
  agent: AgentSummary | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const drawerTitle = computed(() => {
  return props.agent?.name ? `与 ${props.agent.name} 对话` : 'Agent 在线对话'
})

const handleClose = () => {
  emit('update:open', false)
}
</script>

<style scoped>
.agent-chat-drawer :deep(.ant-drawer-body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.chat-drawer-container {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-tag {
  font-size: 11px;
  line-height: 20px;
  margin: 0;
}
</style>
