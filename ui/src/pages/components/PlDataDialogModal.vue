<script setup lang="ts" generic="T">
import { PlDialogModal } from '@platforma-sdk/ui-vue';

const model = defineModel<T | undefined>()
const slots = defineSlots<{
    default(props: { value: NonNullable<T> }): any
}>()
</script>

<template>
    <PlDialogModal :model-value="model !== undefined" @update:model-value="(v) => { if (!v) model = undefined }">
        <slot v-if="model" :value="model" />
    </PlDialogModal>
</template>
