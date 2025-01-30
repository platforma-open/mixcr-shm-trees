<script setup lang="ts">
import { GraphMaker, PredefinedGraphOption } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { FullNodeId, FullTreeId, treeNodesFilter } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { AxisSpec, getRawPlatformaInstance, pValueToStringOrNumber, PVectorDataLong, PVectorDataString } from '@platforma-sdk/model';
import { PlBtnGhost, PlBtnPrimary, PlBtnSecondary, PlDialogModal, PlDropdown } from '@platforma-sdk/ui-vue';
import { computedAsync } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useApp } from '../app';

const emit = defineEmits<{
  toTable: [],
  toNode: [nodeId: FullNodeId]
}>()

const app = useApp<`/dendrogram?id=${string}`>();

const dendroIdx = computed(() => app.model.ui.dendrograms.findIndex(it => it.id === app.queryParams.id));
const dendro = computed({
  get: () => app.model.ui.dendrograms[dendroIdx.value],
  set: (value) => app.model.ui.dendrograms[dendroIdx.value] = value
});

const fullId = computed(() => {
  const d = dendro.value;
  if (!d) return undefined;
  return {
    treeId: d.treeId,
    donorId: pValueToStringOrNumber(d.donorId),
    subtreeId: d.subtreeId
  } as FullTreeId
})

const subtreeAxis = computed<AxisSpec | undefined>(() =>
  app.model.outputs.treeColumnSpec?.axesSpec[2].name === "pl7.app/dendrogram/subtreeId"
    ? app.model.outputs.treeColumnSpec.axesSpec[2]
    : undefined)

const defaultOptions = computed(() => [
  {
    inputName: 'value',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/dendrogram/topology',
      valueType: 'Long',
      axesSpec: []
    }
  },
  {
    inputName: 'height',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/dendrogram/distance',
      valueType: 'Double',
      annotations: {
        'pl7.app/dendrogram/distance/from': 'parent'
      },
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/vdj/sequence',
      valueType: 'String',
      annotations: {
        'pl7.app/label': 'CDR1 aa'
      },
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/vdj/sequence',
      valueType: 'String',
      annotations: {
        'pl7.app/label': 'CDR2 aa'
      },
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/vdj/sequence',
      valueType: 'String',
      annotations: {
        'pl7.app/label': 'CDR3 aa'
      },
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/vdj/sequence',
      valueType: 'String',
      annotations: {
        'pl7.app/label': 'Clonal sequences'
      },
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/dendrogram/isObserved',
      valueType: 'String',
      axesSpec: []
    }
  },
  {
    inputName: 'tableContent',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/vdj/mutationsRate',
      valueType: 'Double',
      axesSpec: []
    }
  }
] as PredefinedGraphOption<"dendro">[])

const fixedOptions = computed(() => {
  const tcSpec = app.model.outputs.treeColumnSpec;
  const fid = fullId.value;
  if (tcSpec === undefined || fid === undefined) return undefined;

  const fixedOps = [
    {
      inputName: 'filters',
      selectedSource: tcSpec.axesSpec[0],
      selectedFilterValue: fid.donorId
    },
    {
      inputName: 'filters',
      selectedSource: tcSpec.axesSpec[1],
      selectedFilterValue: fid.treeId
    }
  ] as PredefinedGraphOption<"dendro">[];

  if (fid.subtreeId !== undefined)
    fixedOps.push({
      inputName: 'filters',
      selectedSource: tcSpec.axesSpec[2],
      selectedFilterValue: fid.subtreeId
    });

  return fixedOps;
})

const subtreeOptions = computedAsync(async () => {
  if (!subtreeAxis.value || !app.model.outputs.treeNodesPFrame
    || !app.model.outputs.vjColumns || !app.model.outputs.treeColumnSpec
    || !dendro.value || !fullId.value) return undefined;

  const pl = getRawPlatformaInstance()

  const data = await pl.pFrameDriver.calculateTableData(app.model.outputs.treeNodesPFrame,
    {
      src: {
        type: 'inner',
        entries: app.model.outputs.vjColumns?.map(column => ({ type: 'column', column }))
      },
      filters: treeNodesFilter(app.model.outputs.treeColumnSpec, { ...fullId.value!, subtreeId: undefined }),
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
      label: vGenes[i]?.replace(/[-\*].*$/, '') + " / " + jGenes[i]?.replace(/[-\*].*$/, '')
    })
  }

  return Array.from(options.values());
})

const removeConfirmationWindowOpen = ref(false);
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

const goToNode = (a: any) => {
  if (fullId.value === undefined)
    return;
  if (typeof a === 'number')
    emit('toNode', { ...fullId.value, nodeId: a });
  else
    console.error(`Unexpected key type: ${a} / ${typeof a}`)
}

</script>

<template>
  <div v-if="dendro" class="container_graph_page">
    <GraphMaker chart-type='dendro' v-model="dendro.state" :p-frame="app.model.outputs.treeNodesPFrame"
      @delete-this-graph="removeConfirmationWindowOpen = true" @tooltip-btn-click="goToNode" :fixed-options="fixedOptions"
      tooltip-button="Show in Table" :default-options="defaultOptions">
      <template #titleLineSlot>
        <PlDropdown v-if="subtreeAxis" v-model="dendro.subtreeId" :options="subtreeOptions"
          label="Select chain (subtree)" :style="{ width: '300px' }" />
        <PlBtnGhost :style="{ marginLeft: '12px' }" @click="emit('toTable')" icon="table">Go to Table</PlBtnGhost>
      </template>
    </GraphMaker>
  </div>
  <div v-else>Loading</div>
  <PlDialogModal v-model="removeConfirmationWindowOpen">
    <template #title>Confirm delete graph</template>
    <template #actions>
      <PlBtnPrimary @click="() => removeSection()">Delete</PlBtnPrimary>
      <PlBtnSecondary @click="() => removeConfirmationWindowOpen = false">Cancel</PlBtnSecondary>
    </template>
  </PlDialogModal>
</template>

<style lang="css">
.container_graph_page {
  min-width: 900px;
  height: 1080px;
  overflow: hidden;
}
</style>