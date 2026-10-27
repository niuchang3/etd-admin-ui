<template>
  <a-modal
    :open="open"
    title="Agent 基本信息"
    :width="600"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container">
        <!-- 头部摘要 -->
        <div class="agent-header-row">
          <div class="agent-avatar-wrap">
            <img
              v-if="detail.avatarPath"
              :src="detail.avatarPath"
              alt="avatar"
              class="agent-avatar-img"
              @error="handleImgError"
            />
            <div v-else class="agent-avatar-fallback">
              <RobotOutlined />
            </div>
          </div>
          <div class="agent-title-wrap">
            <div class="agent-name-line">
              <span class="agent-name">{{ detail.name }}</span>
              <a-tag :color="detail.isPublic ? 'blue' : 'default'">
                {{ detail.isPublic ? '租户公开' : '组织私有' }}
              </a-tag>
              <a-tag :color="detail.dataStatus === 1 ? 'success' : 'error'">
                {{ detail.dataStatus === 1 ? '已启用' : '已停用' }}
              </a-tag>
            </div>
            <div class="agent-id-line du-mono">
              ID: {{ detail.id }}
            </div>
          </div>
        </div>

        <!-- 详细字段网格 -->
        <a-descriptions bordered size="small" :column="2" class="agent-descriptions">
          <a-descriptions-item label="所属组织">
            <span class="du-mono">{{ orgName || detail.orgId }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="版本号">
            <span class="du-mono">v{{ detail.version }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="发布状态">
            <a-tag :color="detail.published ? 'green' : 'orange'">
              {{ detail.published ? '已发布' : '未发布' }}
            </a-tag>
          </a-descriptions-item>

          <a-descriptions-item label="草稿变更">
            <span v-if="detail.unpublishedChanges" class="text-warning">待发布变更</span>
            <span v-else class="text-muted">无待发布变更</span>
          </a-descriptions-item>

          <a-descriptions-item label="发布时间" :span="2">
            <span class="du-mono">{{ detail.publishedTime || '尚未发布' }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="创建时间">
            <span class="du-mono">{{ detail.createTime || '—' }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="更新时间">
            <span class="du-mono">{{ detail.updateTime || '—' }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="简介说明" :span="2">
            <div class="description-content">
              {{ detail.description || '暂无简介' }}
            </div>
          </a-descriptions-item>
        </a-descriptions>

        <div class="modal-actions">
          <a-button @click="handleClose">关闭</a-button>
        </div>
      </div>
      <a-empty v-else-if="!loading" description="未获取到 Agent 详情" />
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RobotOutlined } from '@ant-design/icons-vue'
import { getAgent } from '@/apis/ai/agent'
import type { AgentSummary } from '@/apis/ai/agent/type'
import { getOrganizationLookup } from '@/apis/upms/organization'

const props = defineProps<{
  open: boolean
  agentId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const loading = ref(false)
const detail = ref<AgentSummary | null>(null)
const orgName = ref<string>('')

const loadDetail = async (id: string) => {
  loading.value = true
  detail.value = null
  orgName.value = ''
  try {
    const res = await getAgent(id)
    detail.value = res.data
    if (res.data?.orgId) {
      void loadOrgName(res.data.orgId)
    }
  } catch {
    // 拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}

const loadOrgName = async (orgId: string) => {
  try {
    const res = await getOrganizationLookup(orgId)
    if (res.data?.orgName) {
      orgName.value = res.data.orgName
    }
  } catch {
    // 失败则降级展示 orgId
  }
}

watch(
  () => [props.open, props.agentId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      void loadDetail(id)
    } else if (!isOpen) {
      detail.value = null
      orgName.value = ''
    }
  }
)

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    target.style.display = 'none'
  }
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<style scoped>
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-header-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 4px;
}

.agent-avatar-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--du-border-radius, 4px);
  border: 1px solid var(--du-border, #d9d9d9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--du-bg-container, #fafafa);
  flex-shrink: 0;
}

.agent-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-avatar-fallback {
  font-size: 24px;
  color: var(--du-primary, #1677ff);
}

.agent-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.agent-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-name {
  font-size: var(--du-font-size-md, 13px);
  font-weight: 600;
  color: var(--du-text, #262626);
}

.agent-id-line {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #8c8c8c);
}

.agent-descriptions {
  margin-top: 4px;
}

.description-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
  font-size: var(--du-font-size-sm, 12px);
  line-height: 1.5;
}

.text-warning {
  color: #faad14;
  font-weight: 500;
}

.text-muted {
  color: var(--du-text-muted, #8c8c8c);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
