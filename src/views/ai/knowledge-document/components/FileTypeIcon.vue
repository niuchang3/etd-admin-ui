<template>
  <span
    class="file-type-icon-wrapper"
    :style="{ color: meta.color }"
    :title="meta.label"
  >
    <component :is="meta.icon" class="file-format-icon" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getFileTypeMeta } from './fileType'

const props = defineProps<{
  fileType?: string | null
}>()

const meta = computed(() => getFileTypeMeta(props.fileType))
</script>

<style scoped>
.file-type-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  vertical-align: -0.125em;
  user-select: none;
}

.file-format-icon {
  display: inline-block;
  font-size: 14px;
}
</style>
