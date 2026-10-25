<template>
  <div class="knowledge-base-workspace">
    <!-- 工作区主体骨架 -->
    <a-spin :spinning="loadingKb && !currentKb">
      <div v-if="loadFailed && !currentKb" class="workspace-error-panel du-panel">
        <a-result
          status="warning"
          title="知识库信息加载失败"
          sub-title="未能获取指定知识库的详细数据，可能该知识库已被删除或您暂无访问权限。"
        >
          <template #extra>
            <a-button type="primary" @click="handleRetry">重新尝试</a-button>
            <a-button @click="handleBack">返回知识库列表</a-button>
          </template>
        </a-result>
      </div>

      <div v-else class="workspace-content-body">
        <!-- 子页面容器：按当前路由自动挂载 -->
        <component
          :is="currentSubComponent"
          :knowledge-base-id="kbId"
        />
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKnowledgeBaseStore } from '@/stores/modules/knowledgeBase'
import KnowledgeDocumentView from './components/KnowledgeDocumentView.vue'
import SettingsView from './components/SettingsView.vue'
import RecallTestView from './components/RecallTestView.vue'

const route = useRoute()
const router = useRouter()
const kbStore = useKnowledgeBaseStore()

const kbId = computed(() => String(route.params.id || ''))
const currentKb = computed(() => kbStore.currentKb)
const loadingKb = computed(() => kbStore.loadingKb)
const loadFailed = computed(() => kbStore.loadFailed)

// 根据路由路径识别当前子视图
const currentSubComponent = computed(() => {
  if (route.path.endsWith('/settings')) {
    return SettingsView
  }
  if (route.path.endsWith('/recall-test')) {
    return RecallTestView
  }
  return KnowledgeDocumentView
})

const loadKb = async () => {
  if (!kbId.value) return
  await kbStore.loadKbDetail(kbId.value)
}

const handleRetry = () => {
  void loadKb()
}

const handleBack = () => {
  void router.push({
    path: '/ai/knowledge-bases',
    query: kbStore.listQuery,
  })
}

watch(
  () => kbId.value,
  (newId) => {
    if (newId) {
      void loadKb()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!currentKb.value || String(currentKb.value.id) !== kbId.value) {
    void loadKb()
  }
})
</script>

<style scoped>
.knowledge-base-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.workspace-content-body {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workspace-error-panel {
  padding: 48px 0;
  text-align: center;
}
</style>
