<template>
  <a-tag v-if="asTag" :color="tagColor" :bordered="bordered">
    {{ displayLabel }}
  </a-tag>
  <span v-else class="dict-text">{{ displayLabel }}</span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { getSystemDictLabel } from '@/utils/SystemDict'

interface Props {
  /** 字典类型编码，如 common_status / system_tenant_type */
  typeCode: string
  /** 字典项原始值 */
  value: unknown
  /** 是否以 Tag 形式展示，默认为 true；为 false 时展示为普通文本 */
  asTag?: boolean
  /** 边框控制 */
  bordered?: boolean
  /** 固定颜色或颜色映射配置 */
  color?: string | ((value: unknown) => string)
  /** 字典值与 Ant Tag 颜色的映射表，例如 { '1': 'green', '0': 'red', 'system': 'purple' } */
  colorMap?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  asTag: true,
  bordered: true,
  color: undefined,
  colorMap: undefined,
})

const dictItems = ref<SystemDictData[]>([])

const loadDict = async () => {
  if (!props.typeCode) return
  try {
    const res = await getEnabledDictData(props.typeCode)
    dictItems.value = res.data || []
  } catch (err) {
    console.warn(`[DictTag] 加载字典【${props.typeCode}】失败:`, err)
  }
}

watch(() => props.typeCode, () => {
  void loadDict()
})

onMounted(() => {
  void loadDict()
})

const displayLabel = computed(() => {
  return getSystemDictLabel(dictItems.value, props.value)
})

const tagColor = computed(() => {
  const valStr = String(props.value ?? '')
  if (props.colorMap && props.colorMap[valStr]) {
    return props.colorMap[valStr]
  }
  if (typeof props.color === 'function') {
    return props.color(props.value)
  }
  return props.color
})
</script>

<style scoped>
.dict-text {
  font-size: inherit;
  color: inherit;
}
</style>
