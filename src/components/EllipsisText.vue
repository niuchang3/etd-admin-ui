<template>
  <span class="ellipsis-text-wrapper" :style="{ maxWidth: computedMaxWidth }">
    <a-tooltip v-if="hasContent && showTooltip" :title="displayText">
      <span class="text-content" :class="{ 'is-muted': isMuted }">
        {{ displayText }}
      </span>
    </a-tooltip>
    <span v-else class="text-content" :class="{ 'is-muted': isMuted || !hasContent }">
      {{ displayText }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text?: string | number | null
    maxWidth?: string | number
    tooltip?: boolean
    placeholder?: string
    mutedKeyword?: string
  }>(),
  {
    text: '',
    maxWidth: '180px',
    tooltip: true,
    placeholder: '—',
    mutedKeyword: '暂未分配',
  }
)

const computedMaxWidth = computed(() => {
  if (typeof props.maxWidth === 'number') return `${props.maxWidth}px`
  return props.maxWidth
})

const hasContent = computed(() => {
  return props.text !== null && props.text !== undefined && String(props.text).trim() !== ''
})

const displayText = computed(() => {
  if (!hasContent.value) return props.placeholder
  return String(props.text).trim()
})

const isMuted = computed(() => {
  if (!hasContent.value) return true
  return displayText.value === props.mutedKeyword
})

const showTooltip = computed(() => {
  if (!props.tooltip) return false
  return displayText.value !== props.mutedKeyword && displayText.value !== props.placeholder
})
</script>

<style scoped>
.ellipsis-text-wrapper {
  display: inline-block;
  vertical-align: middle;
  overflow: hidden;
  max-width: 100%;
}

.text-content {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--du-text);
  max-width: 100%;
}

.text-content.is-muted {
  color: var(--du-text-muted, #8c8c8c);
}
</style>
