<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch, ref } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary, PlSlideModal, PlBtnGroup, PlTextArea, PlDropdownRef, ListOption, PlBtnGhost, PlAgOverlayLoading, PlAgOverlayNoRows } from '@platforma-sdk/ui-vue';
import { TreeResult, TreeResultsFull } from './results';
import { retentive } from './retentive';
import { Ref as ModelRef, Option } from '@platforma-sdk/model';
import { Branded, notEmpty } from '@milaboratories/helpers';
import { fromRefString, RefString, toRefString } from './util';
import SettingsPanel from './SettingsPanel.vue';
import { refDebounced } from '@vueuse/core';
import { GridOptions } from '@ag-grid-community/core';
import ProgressCell from './ProgressCell.vue';
import { AgGridVue } from '@ag-grid-community/vue3';

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

const columnDefs = [
  {
    colId: 'donor',
    field: 'donor',
    headerName: "Donor"
  },
  {
    colId: 'allelesProgress',
    field: 'allelesProgress',
    cellRenderer: 'ProgressCell',
    headerName: "Allele Reconstruction Progress",
    cellStyle: {
      '--ag-cell-horizontal-padding': '2px',
      '--ag-cell-vertical-padding': '2px'
    }
  },
  {
    colId: 'treesProgress',
    field: 'treesProgress',
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

    <!-- <template v-if="model.outputs.targetDonorIds">
      <PlDropdown v-model=model.ui.reportSelection.donor :options=model.outputs.availableDonorIds clearable>Show for donor</PlDropdown>
      <PlBtnGroup v-model=model.ui.reportSelection.type :options=reportOptions />
      <template v-if="model.ui.reportSelection.donor">
        <template v-if="model.ui.reportSelection.type == 'alleles'">
          <PlTextArea v-if="model.outputs.allelesReports" v-model="model.outputs.allelesReports[model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
        <template v-if="model.ui.reportSelection.type == 'shmTrees'">
          <PlTextArea v-if="model.outputs.treesReports" v-model="model.outputs.treesReports[model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
      </template>
    </template>
    <template v-else>
      Waiting for reports...
    </template> -->

    <PlSlideModal v-model="data.settingsOpen">
      <SettingsPanel />
    </PlSlideModal>
  </PlBlockPage>
</template>