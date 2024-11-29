<script setup lang="ts">
import { GraphMaker } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { PVectorDataLong, PVectorDataString } from '@platforma-sdk/model';
import { PlDropdown, PlToggleSwitch } from '@platforma-sdk/ui-vue';
import { computedAsync } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useApp } from '../app';

const app = useApp<`/dendrogram?id=${string}`>();

const dendro = computed(() => app.model.ui.dendrograms.find(it => it.id === app.queryParams.id));
const hasSubtree = computed(() => app.model.outputs.treeColumnSpec?.axesSpec[2].name === "pl7.app/dendrogram/subtreeId")

const subtreeOptions = computedAsync(async () => {
  if (!hasSubtree.value || !app.model.outputs.treeNodes || !app.model.outputs.vjColumns || !app.model.outputs.treeColumnSpec || !dendro.value) return undefined;

  const data = await model.pFrameDriver.calculateTableData(app.model.outputs.treeNodes,
    {
      src: {
        type: 'inner',
        entries: app.model.outputs.vjColumns?.map(column => ({ type: 'column', column }))
      },
      filters: [
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: app.model.outputs.treeColumnSpec.axesSpec[0]
          },
          predicate: {
            operator: 'Equal',
            reference: dendro.value.donorId
          }
        },
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: app.model.outputs.treeColumnSpec.axesSpec[1]
          },
          predicate: {
            operator: 'Equal',
            reference: dendro.value.treeId
          }
        }
      ],
      sorting: []
    }
  )
  const subtree = data[2].data.data as PVectorDataLong
  const vGenes = data[4].data.data as PVectorDataString
  const jGenes = data[5].data.data as PVectorDataString

  const options = new Map<string, { value: string, label: string }>()
  for (let i = 0; i < vGenes.length; ++i) {
    const sb = subtree[i].toString()
    options.set(sb, {
      value: subtree[i].toString(),
      label: vGenes[i] + "/" + jGenes[i]
    })
  }

  return Array.from(options.values());
})

const subTreeSelected = ref<String>()

const removeSection = async () => {
  await app.updateUiState(ui => {
    ui.dendrograms = ui.dendrograms.filter(it => it.id !== app.queryParams.id);
    return ui;
  });
  const lastId = app.model.ui.dendrograms.length ? app.model.ui.dendrograms[app.model.ui.dendrograms.length - 1]['id'] : undefined;
  if (lastId) {
    app.navigateTo(`/dendrogram?id=${lastId}`);
  } else {
    // @ts-ignore
    app.navigateTo('/');
  }
};

</script>

<template>
  <div v-if="dendro" class="container_graph_page" :key="app.queryParams.id">
    <GraphMaker chart-type='dendro' v-model="dendro.state" :p-frame="app.model.outputs.treeNodes"
      @delete-this-graph="removeSection" :fixed-options="dendro.fixedOps" :default-options="dendro.defaultOps">
      <template v-slot:titleLineSlot>
        <PlDropdown v-if="hasSubtree" v-model="subTreeSelected" :options="subtreeOptions" label="Select chain (subtree)"
          :style="{ width: '300px' }"/>
          <PlToggleSwitch :style="{ marginLeft: '16px' }" v-model="dendro.state.layersSettings.dendro.showTable"
            label="Show nodes table" />

      </template>
    </GraphMaker>

  </div>
</template>

<style lang="css">
.container_graph_page {
  min-width: 900px;
  height: 1080px;
  overflow: hidden;
}
</style>