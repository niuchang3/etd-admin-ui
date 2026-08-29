<template>
  <!-- 在表格内统一展示头像缩写、头像图片和用户名称。 -->
  <div class="user-cell">
    <span class="user-avatar">
      <img v-if="avatar" :src="avatar" alt="" />
      <span v-else>{{ initial }}</span>
    </span>
    <span class="user-name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  avatar?: string
}>(), {
  avatar: '',
})

const initial = computed(() => props.name.trim().slice(0, 1).toUpperCase())
</script>

<style scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.user-avatar {
  display: grid;
  width: 20px;
  height: 20px;
  overflow: hidden;
  place-items: center;
  border-radius: 3px;
  background: #e7ebf1;
  color: #4f5a6c;
  font-size: 9px;
  font-weight: 700;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
