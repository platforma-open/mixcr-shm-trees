<script setup lang="ts">
import type { ColDef } from 'ag-grid-enterprise';
import { AgGridVue } from 'ag-grid-vue3';
import {
  makeRowNumberColDef, 
  PlBlockPage, 
  PlBtnGhost, 
  PlMaskIcon24, 
  PlSlideModal,
  useAgGridOptionsSimple 
} from '@platforma-sdk/ui-vue';
import { refDebounced } from '@vueuse/core';
import { computed, reactive } from 'vue';
import { useApp } from '../app';
import { TreeResult, TreeResultsFull } from '../results';
import ProgressCell from './components/ProgressCell.vue';
import RunReportPanel from './components/RunReportPanel.vue';
import MainSettingsPanel from './components/MainSettingsPanel.vue';
import { NotNAPValue } from '@platforma-sdk/model';

const { model } = useApp();

const data = reactive<{
  settingsOpen: boolean,
  donorReportOpen: boolean,
  selectedDonor: NotNAPValue | undefined
}>({
  settingsOpen: model.args.donorColumn === undefined || model.args.datasetColumns.length === 0,
  donorReportOpen: false,
  selectedDonor: undefined
})

const result = refDebounced(TreeResultsFull, 100, {
  maxWait: 200
});

const defaultColDef: ColDef = {
  suppressHeaderMenuButton: true
}

const columnDefs: ColDef<TreeResult>[] = [
  makeRowNumberColDef(), // @TODO encapsulate into useAgGridOptions
  {
    colId: 'donor',
    field: 'donor',
    headerName: "Donor"
  },
  {
    colId: 'allelesProgress',
    valueGetter: (d) => d.data?.progress.alleles,
    cellRenderer: 'ProgressCell',
    headerName: "Allele inference",
    cellStyle: {
      '--ag-cell-horizontal-padding': '0px',
      '--ag-cell-vertical-padding': '0px'
    }
  },
  {
    colId: 'treesProgress',
    valueGetter: (d) => d.data?.progress.trees,
    cellRenderer: 'ProgressCell',
    headerName: "Trees reconstruction",
    cellStyle: {
      '--ag-cell-horizontal-padding': '0px',
      '--ag-cell-vertical-padding': '0px'
    }
  },
  {
    colId: 'soiReady',
    valueGetter: (d) => d.data?.soiReady,
    cellRenderer: 'ProgressCell',
    headerName: "Sequence Search",
    cellStyle: {
      '--ag-cell-horizontal-padding': '0px',
      '--ag-cell-vertical-padding': '0px'
    }
  }
];

const isArgsValid = computed(() =>  model.args.donorColumn !== undefined && model.args.datasetColumns.length > 0);

const notReady = computed(() => !isArgsValid.value);

const loading = computed(() => notReady.value || (model.outputs.started && result.value === undefined));

const notReadyText = `Configure the settings and click 'Run' to see the data`;

const { gridOptions } = useAgGridOptionsSimple<TreeResult>(() => {
  return {
    columnDefs,
    defaultColDef,
    getRowId: (row) => String(row.data.donor),
    onRowDoubleClicked: (e) => {
      data.selectedDonor = e.data?.donor
      data.donorReportOpen = data.selectedDonor !== undefined;
    },
    rowSelection: {
      mode: 'multiRow' as const,
      checkboxes: false,
      headerCheckbox: false,
    },
    rowData: result.value,
    // @TODO (Obviously API should be like: notReady true, now we should pass loading `true` in order to activate loadingOverlay component)
    loading: loading.value,
    loadingOverlayComponentParams: {
      notReady: notReady.value,
      notReadyText
    },
    components: {
      ProgressCell,
    },
  };
});
</script>

<template>
  <PlBlockPage>
    <template #title>Analysis Overview</template>
    <template #append>
      <PlBtnGhost @click.stop="() => data.settingsOpen = true">Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template>

    <div :style="{ flex: 1 }">
      <!-- @TODO (ag grid type conflicts with graph-maker ag grid dependencies)  -->
      <AgGridVue 
        :style="{ height: '100%' }"
        v-bind="gridOptions as {}"
      />
    </div>

    <PlSlideModal v-model="data.settingsOpen">
      <template #title>Settings</template>
      <MainSettingsPanel />
    </PlSlideModal>

    <PlSlideModal v-model="data.donorReportOpen" width="80%">
      <template #title>Analysis summary for {{ data.selectedDonor }}</template>
      <RunReportPanel v-model="data.selectedDonor" />
    </PlSlideModal>
  </PlBlockPage>
</template>