<script setup lang="ts">
import { watch } from 'vue';
import { useApp } from './app';
import MainPage from './MainPage.vue';

const app = useApp();

// migration code goes here before we have appropriate place for it
watch(() => app.model.ui, (ui) => {
    if (!ui || Object.entries(ui).length === 0)
        app.model.ui = {
            treeSelectionForTreeVisualization: {},
            treeNodesGraphState: {
                title: "",
                chartType: "dendro",
                template: "dendro"
            },
            treeTableState: {
                gridState: {},
                pTableParams: {
                    sorting: [],
                    filters: []
                }
            }
        }
    else if ((ui as any).treeSelectionForTreeNodesTable) {
        app.model.ui.treeSelectionForTreeVisualization = (app.model.ui as any).treeSelectionForTreeNodesTable;
        delete (app.model.ui as any).treeSelectionForTreeNodesTable;
    }
}, { immediate: true });
</script>

<template>
    <template v-if="app.model.ui">
        <MainPage />
    </template>
</template>