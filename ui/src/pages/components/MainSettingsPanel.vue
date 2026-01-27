<script setup lang="ts">
import { notEmpty, range } from '@milaboratories/helpers';
import { ListOption, PlAccordionSection, PlDropdown, PlDropdownRef, PlNumberField, PlSectionSeparator } from '@platforma-sdk/ui-vue';
import { computed } from 'vue';
import { useApp } from '../../app';
import { fromRefString, RefString, toRefString } from '../../util';
import DownsamplingSettings from './DownsamplingSettings.vue';

const app = useApp();

const datasetOptionsMap = computed(() => {
  const options = app.model.outputs.datasetOptions;
  if (options === undefined) {
    app.model.args.datasetsTitles = undefined;
    return undefined;
  }
  else {
    const datasetMap = new Map(options.map(ds => [toRefString(ds.ref), ds]));
    app.model.args.datasetsTitles = Array.from(datasetMap.values()).map(ds => ds?.label);
    return datasetMap;
  }
});

function getDatasetValue(idx: number): RefString | undefined {
  if (idx >= app.model.args.datasetColumns.length)
    return undefined;
  else
    return toRefString(app.model.args.datasetColumns[idx]);
}

/** Returns lambda that set's corresponding dataset */
function datasetValueSetter(idx: number, newValue: RefString | undefined) {
  if (idx >= app.model.args.datasetColumns.length)
    // addition of a new dataset
    app.model.args.datasetColumns.push(fromRefString(notEmpty(newValue)));
  else if (newValue === undefined)
    app.model.args.datasetColumns.splice(idx, 1);
  else
    app.model.args.datasetColumns[idx] = fromRefString(newValue);
}

function currentAssemblingFeature() {
  const dsMap = datasetOptionsMap.value;
  if (dsMap === undefined)
    return undefined;
  const selection0 = getDatasetValue(0);
  if (selection0 === undefined)
    return undefined;
  return dsMap.get(selection0)?.assemblingFeature;
}

function getDatasetOptions(idx: number): ListOption<RefString | undefined>[] | undefined {
  const dsMap = datasetOptionsMap.value;
  if (dsMap === undefined)
    return undefined;

  const selection = getDatasetValue(idx);

  const otherSelected = new Set(app.model.args.datasetColumns.map(toRefString));
  if (selection)
    otherSelected.delete(selection)

  const assemblingFeature = currentAssemblingFeature();

  const options: ListOption<RefString | undefined>[] = [...dsMap]
    .filter(([r, ds]) => (assemblingFeature === undefined || ds.assemblingFeature === assemblingFeature) && !otherSelected.has(r))
    .map(([r, ds]) => ({ value: r, label: ds.label } satisfies ListOption<RefString>))

  if (selection !== undefined)
    options.push({ value: undefined, label: "<remove dataset>" })

  return options;
}
</script>

<template>
  <PlDropdownRef :options="app.model.outputs.donorOptions" v-model="app.model.args.donorColumn"
    label="Select donor column" clearable />

  <template v-if="app.model.args.donorColumn !== undefined">
    <template v-for="dsIdx in range(0, app.model.args.datasetColumns.length + 1)" :key="dsIdx">
      <PlDropdown 
        v-if="getDatasetOptions(dsIdx)?.length !== 0" 
        :options="getDatasetOptions(dsIdx)"
        :model-value="getDatasetValue(dsIdx)" 
        @update:model-value="(v) => datasetValueSetter(dsIdx, v)"
        :label="`${dsIdx === app.model.args.datasetColumns.length ? 'Add' : 'Select'} dataset #${dsIdx + 1}`" 
      />
    </template>
  </template>

  <PlAccordionSection label="Downsampling (Bulk Datasets Only)">
    <DownsamplingSettings v-model="app.model.args.downsampling" />
  </PlAccordionSection>

  <PlAccordionSection label="Advanced Settings">
    <PlSectionSeparator>Resource allocation</PlSectionSeparator>
    <PlNumberField
      v-model="app.model.args.perProcessMemGB"
      label="Set memory per every sample process (GB)"
      :minValue="1"
      :maxValue="999999"
    />

    <PlNumberField
      v-model="app.model.args.perProcessCPUs"
      label="Set CPUs number per every sample process"
      :minValue="1"
      :maxValue="999999"
    />
  </PlAccordionSection>
</template>
