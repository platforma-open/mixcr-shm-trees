<script setup lang="ts">
import type { PredefinedGraphOption } from "@milaboratories/graph-maker";
import { GraphMaker } from "@milaboratories/graph-maker";
import type { FullNodeId, FullTreeId } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import { treeNodesFilter } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import type { AxisSpec, PVectorDataLong, PVectorDataString } from "@platforma-sdk/model";
import { getRawPlatformaInstance } from "@platforma-sdk/model";
import {
  PlBtnGhost,
  PlBtnPrimary,
  PlBtnSecondary,
  PlDialogModal,
  PlDropdown,
} from "@platforma-sdk/ui-vue";
import { computedAsync } from "@vueuse/core";
import { computed, ref, toRaw, watch } from "vue";
import { useApp } from "../app";

const emit = defineEmits<{
  toTable: [];
  toNode: [nodeId: FullNodeId];
}>();

const app = useApp<`/dendrogram?id=${string}`>();

const dendroIdx = computed(() =>
  app.model.data.dendrograms.findIndex((it) => it.id === app.queryParams.id),
);
const dendro = computed({
  get: () => app.model.data.dendrograms[dendroIdx.value],
  set: (value) => (app.model.data.dendrograms[dendroIdx.value] = value),
});

const fullId = computed(() => {
  const d = dendro.value;
  if (!d) return undefined;
  return {
    treeId: d.treeId,
    donorId: d.donorId,
    subtreeId: d.subtreeId,
  } as FullTreeId;
});

const subtreeAxis = computed<AxisSpec | undefined>(() =>
  app.model.outputs.treeColumnSpec?.axesSpec[2].name === "pl7.app/dendrogram/subtreeId"
    ? app.model.outputs.treeColumnSpec.axesSpec[2]
    : undefined,
);

const defaultOptions = computed(
  () =>
    [
      {
        inputName: "value",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/dendrogram/topology",
          valueType: "Long",
          axesSpec: [],
        },
      },
      {
        inputName: "height",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/dendrogram/distance",
          valueType: "Double",
          annotations: {
            "pl7.app/dendrogram/distance/from": "parent",
          },
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/vdj/sequence",
          valueType: "String",
          annotations: {
            "pl7.app/label": "CDR1 aa",
          },
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/vdj/sequence",
          valueType: "String",
          annotations: {
            "pl7.app/label": "CDR2 aa",
          },
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/vdj/sequence",
          valueType: "String",
          annotations: {
            "pl7.app/label": "CDR3 aa",
          },
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/vdj/sequence",
          valueType: "String",
          annotations: {
            "pl7.app/label": "Clonal sequences",
          },
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/dendrogram/isObserved",
          valueType: "String",
          axesSpec: [],
        },
      },
      {
        inputName: "tableContent",
        selectedSource: {
          kind: "PColumn",
          name: "pl7.app/vdj/mutationsRate",
          valueType: "Double",
          axesSpec: [],
        },
      },
    ] as PredefinedGraphOption<"dendro">[],
);

const fixedOptions = computed(() => {
  const tcSpec = app.model.outputs.treeColumnSpec;
  const fid = fullId.value;
  if (tcSpec === undefined || fid === undefined) return undefined;

  const fixedOps = [
    {
      inputName: "filters",
      selectedSource: tcSpec.axesSpec[0],
      selectedFilterValues: [String(fid.donorId)],
    },
    {
      inputName: "filters",
      selectedSource: tcSpec.axesSpec[1],
      selectedFilterValues: [String(fid.treeId)],
    },
  ] as PredefinedGraphOption<"dendro">[];

  if (fid.subtreeId !== undefined)
    fixedOps.push({
      inputName: "filters",
      selectedSource: tcSpec.axesSpec[2],
      selectedFilterValues: [String(fid.subtreeId)],
    });

  return fixedOps;
});

const subtreeOptions = computedAsync(async () => {
  const pFrame = app.model.outputs.treeNodesPFrame;
  if (
    !subtreeAxis.value ||
    !pFrame?.ok ||
    !pFrame.value ||
    !app.model.outputs.vjColumns ||
    !app.model.outputs.treeColumnSpec ||
    !dendro.value ||
    !fullId.value
  )
    return undefined;

  const pl = getRawPlatformaInstance();

  try {
    // app.model.outputs.* are reactive proxies in V3; the driver structured-clones its
    // request to a worker, which throws on proxies. toRaw() returns the underlying plain
    // data (reactivity is lazy, so nested values read off the raw object stay plain).
    const data = await pl.pFrameDriver.calculateTableData(toRaw(pFrame.value), {
      src: {
        type: "inner",
        entries: toRaw(app.model.outputs.vjColumns)?.map((column) => ({
          type: "column",
          column: toRaw(column),
        })),
      },
      filters: treeNodesFilter(toRaw(app.model.outputs.treeColumnSpec), {
        ...fullId.value!,
        subtreeId: undefined,
      }),
      sorting: [],
    });
    const subtree = data[2].data.data as PVectorDataLong;
    const vGenes = data[4].data.data as PVectorDataString;
    const jGenes = data[5].data.data as PVectorDataString;

    const options = new Map<string, { value: string; label: string }>();
    for (let i = 0; i < vGenes.length; ++i) {
      const sb = subtree[i].toString();
      options.set(sb, {
        value: subtree[i].toString(),
        label: vGenes[i]?.replace(/[-*].*$/, "") + " / " + jGenes[i]?.replace(/[-*].*$/, ""),
      });
    }

    return Array.from(options.values());
  } catch (e) {
    console.error(e);
    throw e;
  }
});

watch(
  subtreeOptions,
  () => {
    console.log(subtreeOptions.value);
  },
  { immediate: true },
);

const removeConfirmationWindowOpen = ref(false);
const removeSection = async () => {
  await app.updateData((data) => {
    data.dendrograms = data.dendrograms.filter((it) => it.id !== app.queryParams.id);
    return data;
  });
  const lastId = app.model.data.dendrograms.length
    ? app.model.data.dendrograms[app.model.data.dendrograms.length - 1]["id"]
    : undefined;
  if (lastId) {
    app.navigateTo(`/dendrogram?id=${lastId}`);
  } else {
    // @ts-expect-error TODO: fix this
    app.navigateTo("/");
  }
};

const goToNode = (a: any) => {
  if (fullId.value === undefined) return;
  if (typeof a === "number") emit("toNode", { ...fullId.value, nodeId: a });
  else console.error(`Unexpected key type: ${a} / ${typeof a}`);
};
</script>

<template>
  <div v-if="dendro" class="container_graph_page">
    <GraphMaker
      v-model="dendro.state"
      chart-type="dendro"
      :p-frame="app.model.outputs.treeNodesPFrame"
      :fixed-options="fixedOptions"
      :allow-chart-deleting="true"
      tooltip-button="Show in Table"
      :default-options="defaultOptions"
      @delete-this-graph="removeConfirmationWindowOpen = true"
      @tooltip-btn-click="goToNode"
    >
      <template #titleLineSlot>
        <PlDropdown
          v-if="subtreeAxis"
          v-model="dendro.subtreeId"
          :options="subtreeOptions"
          label="Select chain (subtree)"
          :style="{ width: '300px' }"
        />
        <PlBtnGhost :style="{ marginLeft: '12px' }" icon="table" @click="emit('toTable')"
          >Go to Table</PlBtnGhost
        >
      </template>
    </GraphMaker>
  </div>
  <div v-else>Loading</div>
  <PlDialogModal v-model="removeConfirmationWindowOpen">
    <template #title>Confirm delete graph</template>
    <template #actions>
      <PlBtnPrimary @click="() => removeSection()">Delete</PlBtnPrimary>
      <PlBtnSecondary @click="() => (removeConfirmationWindowOpen = false)">Cancel</PlBtnSecondary>
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
