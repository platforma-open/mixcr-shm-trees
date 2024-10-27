<script setup lang="ts">
import { useApp } from './app';
import { reactive, } from 'vue';
import { PlBlockPage, PlSlideModal, PlBtnGhost, PlAgOverlayLoading, PlAgOverlayNoRows } from '@platforma-sdk/ui-vue';
import { TreeResult, TreeResultsFull } from './results';
import SettingsPanel from './SettingsPanel.vue';
import { refDebounced } from '@vueuse/core';
import { ColDef, GridOptions } from '@ag-grid-community/core';
import ProgressCell from './ProgressCell.vue';
import { AgGridVue } from '@ag-grid-community/vue3';
import RunReportPanel from './RunReportPanel.vue';

const { model } = useApp();

const data = reactive<{
  settingsOpen: boolean,
  donorReportOpen: boolean,
  selectedDonor: string | undefined
}>({
  settingsOpen: model.args.donorColumn === undefined || model.args.datasetColumns.length === 0,
  donorReportOpen: false,
  selectedDonor: undefined
})

const result = refDebounced(TreeResultsFull, 100, {
  maxWait: 200
});

const columnDefs: ColDef<TreeResult>[] = [
  {
    colId: 'donor',
    field: 'donor',
    headerName: "Donor"
  },
  {
    colId: 'allelesProgress',
    valueGetter: (d) => d.data?.progress.alleles,
    cellRenderer: 'ProgressCell',
    headerName: "Allele Reconstruction Progress",
    cellStyle: {
      '--ag-cell-horizontal-padding': '2px',
      '--ag-cell-vertical-padding': '2px'
    }
  },
  {
    colId: 'treesProgress',
    valueGetter: (d) => d.data?.progress.trees,
    cellRenderer: 'ProgressCell',
    headerName: "Tree Reconstruction Progress",
    cellStyle: {
      '--ag-cell-horizontal-padding': '2px',
      '--ag-cell-vertical-padding': '2px'
    }
  }
];

// watch(result, rd => {
//     console.dir(rd, { depth: 5 })
// }, { immediate: true })

const gridOptions: GridOptions<TreeResult> = {
  getRowId: (row) => row.data.donor,
  onRowDoubleClicked: (e) => {
    data.selectedDonor = e.data?.donor
    data.donorReportOpen = data.selectedDonor !== undefined;
  },
  components: {
    ProgressCell
  }
};

</script>

<template>
  <PlBlockPage>
    <template #title>Overview</template>
    <template #append>
      <PlBtnGhost :icon="'settings-2'" @click.stop="() => data.settingsOpen = true">Settings</PlBtnGhost>
    </template>

    <div :style="{ flex: 1 }">
      <AgGridVue :style="{ height: '100%' }" :rowData="result" :columnDefs="columnDefs" :grid-options="gridOptions"
        :loadingOverlayComponentParams="{ notReady: true }" :loadingOverlayComponent=PlAgOverlayLoading
        :noRowsOverlayComponent=PlAgOverlayNoRows />
    </div>

    <PlSlideModal v-model="data.settingsOpen">
      <template #title>Settings</template>
      <SettingsPanel />
    </PlSlideModal>

    <PlSlideModal v-model="data.donorReportOpen" width="80%">
      <template #title>Analysis summary for {{ data.selectedDonor }}</template>
      <RunReportPanel v-model="data.selectedDonor" />
    </PlSlideModal>
  </PlBlockPage>
</template>