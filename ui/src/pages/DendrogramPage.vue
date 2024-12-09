<script setup lang="ts">
import { GraphMaker, GraphMakerProps, GraphMakerPropsTyped, PredefinedGraphOption } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { AxisSpec, pValueToStringOrNumber, PVectorDataLong, PVectorDataString, safeConvertToPValue } from '@platforma-sdk/model';
import { PlDropdown, PlToggleSwitch } from '@platforma-sdk/ui-vue';
import { computedAsync, ElementOf } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useApp } from '../app';

const app = useApp<`/dendrogram?id=${string}`>();

const dendroIdx = computed(() => app.model.ui.dendrograms.findIndex(it => it.id === app.queryParams.id));
const dendro = computed({
  get: () => app.model.ui.dendrograms[dendroIdx.value],
  set: (value) => app.model.ui.dendrograms[dendroIdx.value] = value
});

type FullId = {
  treeId: number, donorId: number | string, subtreeId: string | undefined
}

const fullId = computed(() => {
  const d = dendro.value;
  if (!d) return undefined;
  return {
    treeId: d.treeId,
    donorId: pValueToStringOrNumber(d.donorId),
    subtreeId: d.subtreeId
  } as FullId
})

const subtreeAxis = computed<AxisSpec | undefined>(() =>
  app.model.outputs.treeColumnSpec?.axesSpec[2].name === "pl7.app/dendrogram/subtreeId"
    ? app.model.outputs.treeColumnSpec.axesSpec[2]
    : undefined)

// fixedOps: [
//   {
//     inputName: 'filters',
//     selectedSource: {
//       type: 'axis',
//       id: app.model.outputs.treeColumnSpec.axesSpec[0]
//     },
//     selectedFilterValue: pValueToStringOrNumber(donorId)
//   },
//   {
//     inputName: 'filters',
//     selectedSource: {
//       type: 'axis',
//       id: app.model.outputs.treeColumnSpec.axesSpec[1]
//     },
//     selectedFilterValue: treeId
//   }
// ],
// defaultOps: [
//   {
//     inputName: 'value',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/dendrogram/topology',
//       valueType: 'Long',
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'height',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/dendrogram/distance',
//       valueType: 'Double',
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/vdj/sequence',
//       valueType: 'String',
//       annotations: {
//         'pl7.app/label': 'CDR1 aa'
//       },
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/vdj/sequence',
//       valueType: 'String',
//       annotations: {
//         'pl7.app/label': 'CDR2 aa'
//       },
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/vdj/sequence',
//       valueType: 'String',
//       annotations: {
//         'pl7.app/label': 'CDR3 aa'
//       },
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/vdj/sequence',
//       valueType: 'String',
//       annotations: {
//         'pl7.app/label': 'Clonal sequences'
//       },
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/dendrogram/isObserved',
//       valueType: 'String',
//       axesSpec: []
//     }
//   },
//   {
//     inputName: 'tableContent',
//     selectedSource: {
//       kind: 'PColumn',
//       name: 'pl7.app/vdj/mutationsRate',
//       valueType: 'Double',
//       axesSpec: []
//     }
//   }
// ]

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
  if (!subtreeAxis.value || !app.model.outputs.treeNodes || !app.model.outputs.vjColumns || !app.model.outputs.treeColumnSpec || !dendro.value) return undefined;

  const data = await model.pFrameDriver.calculateTableData(app.model.outputs.treeNodes,
    {
      src: {
        type: 'inner',
        entries: app.model.outputs.vjColumns?.map(column => ({ type: 'column', column }))
      },
      filters: [
        {
          type: 'bySingleColumnV2',
          column: {
            type: 'axis',
            id: app.model.outputs.treeColumnSpec.axesSpec[0]
          },
          predicate: {
            operator: 'Equal',
            reference: pValueToStringOrNumber(dendro.value.donorId)
          }
        },
        {
          type: 'bySingleColumnV2',
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
      label: vGenes[i]?.replace(/[-\*].*$/, '') + " / " + jGenes[i]?.replace(/[-\*].*$/, '')
    })
  }

  return Array.from(options.values());
})

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
      @delete-this-graph="removeSection" :fixed-options="fixedOptions" :default-options="defaultOptions">
      <template v-slot:titleLineSlot>
        <PlDropdown v-if="subtreeAxis" v-model="dendro.subtreeId" :options="subtreeOptions"
          label="Select chain (subtree)" :style="{ width: '300px' }" />
        <PlToggleSwitch :style="{ marginLeft: '16px' }" v-model="dendro.state.layersSettings!.dendro.showTable"
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