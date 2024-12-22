<script setup lang="ts">
import { computed, ref } from 'vue';
import { useApp } from '../app';

const app = useApp<`/basket?id=${string}`>();

const basketIdx = computed(() => app.model.ui.baskets.findIndex(it => it.id === app.queryParams.id));
const basket = computed({
  get: () => app.model.ui.baskets[basketIdx.value],
  set: (value) => app.model.ui.baskets[basketIdx.value] = value
});

</script>

<template :key="basket?.id ?? ''">
</template>
