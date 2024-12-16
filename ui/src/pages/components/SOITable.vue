<script setup lang="ts">
import { ColDef, GridOptions } from 'ag-grid-enterprise';
import { AgGridVue } from 'ag-grid-vue3';
import { SequenceOfInterest } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { AgGridTheme } from '@platforma-sdk/ui-vue';

const model = defineModel<SequenceOfInterest[]>({ required: true })

const columnDefs: ColDef<SequenceOfInterest>[] = [
  {
    colId: 'name',
    field: 'name',
    flex: 1,
    headerName: "Name",
    editable: true
  },
  {
    colId: 'sequence',
    field: 'sequence',
    flex: 3,
    headerName: "Sequence",
    editable: true
  }
];

const gridOptions: GridOptions<SequenceOfInterest> = {
  getRowId: (row) => String(row.data.id)
};

</script>

<template>
  <AgGridVue :theme="AgGridTheme" :style="{ height: '100%' }" :rowData="model" :columnDefs="columnDefs"
    :grid-options="gridOptions" />
</template>
