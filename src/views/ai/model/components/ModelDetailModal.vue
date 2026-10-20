<template>
  <a-modal
    :open="open"
    title="模型详情"
    :footer="null"
    :width="600"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="model-detail-container">
        <!-- 基础元数据 -->
        <div class="detail-header">
          <div class="logo-box">
            <img
              v-if="detail.logoPath"
              :src="detail.logoPath"
              alt="logo"
              class="model-logo-preview"
              @error="handleLogoError"
            />
            <div v-else class="model-logo-fallback">
              {{ (detail.modelName || 'AI').slice(0, 2).toUpperCase() }}
            </div>
          </div>
          <div class="header-info">
            <div class="model-title">{{ detail.modelName }}</div>
            <div class="header-tags">
              <DictTag
                type-code="ai_model_provider"
                :value="detail.providerCode"
              />
              <DictTag
                type-code="ai_model_type"
                :value="detail.modelType"
              />
            </div>
          </div>
        </div>

        <a-descriptions :column="1" size="small" bordered class="compact-descriptions">
          <a-descriptions-item label="模型介绍">
            <div class="desc-text">{{ detail.description || '暂无介绍' }}</div>
          </a-descriptions-item>

          <a-descriptions-item
            v-if="detail.modelType === 'embedding' && filterEmbeddingByDict(detail.embedding).length"
            label="支持维度"
          >
            <div class="dimension-tags">
              <DictTag
                v-for="dim in filterEmbeddingByDict(detail.embedding)"
                :key="dim"
                type-code="ai_embedding_dimension"
                :value="dim"
                color="blue"
                class="du-mono"
              />
            </div>
          </a-descriptions-item>

          <a-descriptions-item v-if="detail.apiKeyUrl" label="密钥获取入口">
            <a
              :href="detail.apiKeyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="link-text"
            >
              {{ detail.apiKeyUrl }}
              <ExportOutlined class="link-icon" />
            </a>
          </a-descriptions-item>

          <a-descriptions-item v-if="detail.setupGuideUrl" label="接入指南">
            <a
              :href="detail.setupGuideUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="link-text"
            >
              {{ detail.setupGuideUrl }}
              <ExportOutlined class="link-icon" />
            </a>
          </a-descriptions-item>

          <a-descriptions-item v-if="detail.baseUrlHelp" label="服务地址说明">
            <div class="help-text">{{ detail.baseUrlHelp }}</div>
          </a-descriptions-item>

          <a-descriptions-item v-if="detail.updateTime" label="更新时间">
            <span class="du-mono">{{ formatDateTime(detail.updateTime) }}</span>
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <div class="modal-footer-actions">
        <a-button @click="handleClose">关闭</a-button>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ExportOutlined } from '@ant-design/icons-vue'
import { getModel } from '@/apis/ai/model'
import type { ModelRecord } from '@/apis/ai/model/type'
import { formatDateTime } from '@/utils/format'
import DictTag from '@/components/DictTag.vue'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE } from '@/constant'

interface Props {
  open: boolean
  modelId: string | null
  initialRecord?: ModelRecord | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const loading = ref(false)
const detail = ref<ModelRecord | null>(null)

const { getDict: getDictItems } = useSystemDict([AI_DICT_TYPE.EMBEDDING_DIMENSION])

/** 过滤 embedding 数组，仅保留字典 ai_embedding_dimension 中存在的维度值 */
const filterEmbeddingByDict = (embedding: number[] | null | undefined): number[] => {
  if (!embedding?.length) return []
  const dictItems = getDictItems(AI_DICT_TYPE.EMBEDDING_DIMENSION) || []
  const dictValues = new Set(dictItems.map((item) => item.dictValue))
  return embedding.filter((dim) => dictValues.has(String(dim)))
}

const handleLogoError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}

const handleClose = () => {
  emit('update:open', false)
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.modelId) {
      if (props.initialRecord) {
        detail.value = { ...props.initialRecord }
      }
      loading.value = true
      try {
        const res = await getModel(props.modelId)
        detail.value = res.data
      } catch {
        // 请求失败时保留 initialRecord 兜底
      } finally {
        loading.value = false
      }
    } else if (!isOpen) {
      detail.value = null
    }
  }
)
</script>

<style scoped>
.model-detail-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: var(--du-color-fill-quaternary, #f9fafb);
  border-radius: var(--du-border-radius-base, 4px);
  border: 1px solid var(--du-color-border-secondary, #e5e7eb);
}

.logo-box {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-logo-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.model-logo-fallback {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: var(--du-color-primary-light, #e6f4ff);
  color: var(--du-color-primary, #1677ff);
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-title {
  font-size: var(--du-font-size-md, 13px);
  font-weight: 600;
  color: var(--du-color-text-title, #1f2937);
}

.header-tags {
  display: flex;
  gap: 6px;
  align-items: center;
}

.compact-descriptions {
  margin-top: 4px;
}

.desc-text {
  font-size: var(--du-font-size-base, 12px);
  line-height: 1.5;
  color: var(--du-color-text, #374151);
  white-space: pre-wrap;
  word-break: break-word;
}

.link-text {
  font-size: var(--du-font-size-base, 12px);
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.link-icon {
  font-size: 11px;
}

.help-text {
  font-size: var(--du-font-size-base, 12px);
  color: var(--du-color-text-secondary, #6b7280);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.dimension-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
