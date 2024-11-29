<script setup lang="ts">
import { GraphMaker, GraphMakerSettings } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { computed } from 'vue';
import { useApp } from '../app';

const app = useApp<`/graph?id=${string}`>();

const settings = computed({
    get() {
        const graphState = app.model.ui.graphs.find(it => it.id === app.queryParams.id);
        if (!graphState) {
            console.error(`Missed saved settings for ${app.queryParams.id}, graphs:`, app.model.ui.graphs);
            return null;
        }
        return {
            ...(graphState.settings as GraphMakerSettings),
            allowDeleting: true,
            title: graphState.settings.title
        } as GraphMakerSettings;
    },
    set(nextSettings: GraphMakerSettings) {
        const idx = app.model.ui.graphs.findIndex((g) => g.id === app.queryParams.id)
        if (idx < 0) {
            console.error(`Missed saved settings for ${app.queryParams.id}, graphs:`, app.model.ui.graphs);
            return null;
        }

        app.model.ui.graphs[idx].settings = nextSettings
    }
});

const removeSection = async () => {
    await app.updateUiState(ui => {
        ui.graphs = ui.graphs.filter(it => it.id !== app.queryParams.id);
        return ui;
    });
    const lastId = app.model.ui.graphs.length ? app.model.ui.graphs[app.model.ui.graphs.length - 1]['id'] : undefined;
    if (lastId) {
        app.navigateTo(`/graph?id=${lastId}`);
    } else {
        // @ts-ignore
        app.navigateTo('/');
    }
};

</script>

<template>
    <div class="container_graph_page" :key="app.queryParams.id">
        <graph-maker v-if="settings" v-model="settings" :pFrame="app.model.outputs.treeNodes"
            @delete-this-graph="removeSection" />
    </div>
</template>

<style lang="css">
.container_graph_page {
    min-width: 900px;
    height: 1080px;
    overflow: hidden;
}
</style>