<template>
    <div v-if="isActive">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    active: Boolean
})

const isActive = computed(() => props.active);


</script>

<style scoped lang="scss">

</style>