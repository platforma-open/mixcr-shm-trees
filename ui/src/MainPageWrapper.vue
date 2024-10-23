<script setup lang="ts">
import { watch } from 'vue';
import { useApp } from './app';
import MainPage from './MainPage.vue';

const app = useApp();

watch(() => app.model.ui, (ui) => {
    if (!ui)
        app.model.ui = {
            treeSelectionForTreeNodesTable: {},
            reportSelection: {
                type: 'alleles'
            },
            treeNodesGraphState: {
                title: "",
                chartType: "dendro",
                template: "dendro"
            }
        }
}, { immediate: true });
</script>

<template>
    <template v-if="app.model.ui">
        <MainPage />
    </template>
</template>