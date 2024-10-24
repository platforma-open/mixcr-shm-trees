<script setup lang="ts">
import { watch } from 'vue';
import { useApp } from './app';
import MainPage from './MainPage.vue';
import { TreeResultsFull } from './results';

const app = useApp();

watch(() => app.model.ui, (ui) => {
    if (!ui)
        app.model.ui = {
            treeSelectionForTreeNodesTable: {},
            treeNodesGraphState: {
                title: "",
                chartType: "dendro",
                template: "dendro"
            }
        }
}, { immediate: true });

watch(TreeResultsFull, v => {
    console.dir(v);
}, { immediate: true })
</script>

<template>
    <template v-if="app.model.ui">
        <MainPage />
    </template>
</template>