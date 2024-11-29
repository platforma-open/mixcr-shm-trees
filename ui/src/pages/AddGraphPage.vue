<!-- <script setup lang="ts">
import { GraphMakerSettings } from '@milaboratories/graph-maker';
import { PlBlockPage, PlBtnPrimary, PlTextField } from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { useApp } from '../app';

const app = useApp();

const newId = computed(() => {
    if (app.ui && app.ui.treeGraphs) {
        return String(Math.max(...app.ui.treeGraphs.map(g => Number(g.id))) + 1);
    }
    return '1';
});


const addSection = async (
    label: string,
    donorId: string,
    treeId: string
) => {
    const graph: GraphMakerSettings = {
        title: label,
        chartType: 'dendro',
        template: 'dendro',
        fixedOptions: [
            {
                inputName: 'filters',
                selectedSource: {
                    type: 'axis',
                    id: {
                        type: 'String',
                        name: app.model.outputs.donorColumnSpec?.axesSpec[0].name ?? ''
                    }
                },
                selectedFilterValue: donorId
            },
            {
                inputName: 'filters',
                selectedSource: {
                    type: 'axis',
                    id: {
                        type: 'Long',
                        name: 'pl7.app/dendrogram/treeId'
                    }
                },
                selectedFilterValue: treeId
            },
        ]
    }
    const id = newId.value;

    await app.updateUiState(ui => {
        ui.treeGraphs = [...(ui.treeGraphs ?? []), { id, label, donorId, treeId, graph }]
        return ui
    })

    await app.navigateTo(`/graph?id=${id}`);
};

const label = ref<string>("")
const donorId = ref<string>("")
const treeId = ref<string>("")

</script>
<template>

    <PlBlockPage>

        <PlTextField v-model="label" label="Graph title" />

        <PlTextField v-model="donorId" label="Donor ID" />

        <PlTextField v-model="treeId" label="Tree Id" />

        <PlBtnPrimary :disabled="!label || !donorId || !treeId" @click="() => addSection(label!, donorId!, treeId!)">
            Add graph</PlBtnPrimary>
    </PlBlockPage>
</template> -->