<script setup lang="ts">
import { watch } from 'vue';
import { useApp } from './app';
import MainPage from './MainPage.vue';

const app = useApp();

watch(() => app.model.ui, (ui) => {
    if (!ui || Object.entries(ui).length === 0)
        app.model.ui = {
            treeSelectionForTreeNodesTable: {},
            treeNodesGraphState: {
                title: "",
                template: "dendro"
            },
            graphFixedOptions: [],
            treeTableState: {
                gridState: {},
                pTableParams: {
                    sorting: [],
                    filters: []
                }
            },
            filtersOpen: false,
            filterModel: {},
        }
}, { immediate: true });
</script>

<template>
    <template v-if="app.model.ui">
        <MainPage />
    </template>
</template>