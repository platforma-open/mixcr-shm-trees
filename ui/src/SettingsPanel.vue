<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch, ref } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary, PlSlideModal, PlBtnGroup, PlTextArea, PlDropdownRef, ListOption, PlBtnGhost } from '@platforma-sdk/ui-vue';
import { TreeResultsFull } from './results';
import { retentive } from './retentive';
import { Ref as ModelRef, Option } from '@platforma-sdk/model';
import { Branded, notEmpty, range } from '@milaboratories/helpers';
import { fromRefString, RefString, toRefString } from './util';

const { model } = useApp();

const datasetOptionsMap = retentive(() => {
  const options = model.outputs.datasetOptions;
  if (options === undefined)
    return undefined;
  else
    return new Map(options.map(ds => [toRefString(ds.ref), ds]));
});

function getDatasetValue(idx: number): RefString | undefined {
  if (idx >= model.args.datasetColumns.length)
    return undefined;
  else
    return toRefString(model.args.datasetColumns[idx]);
}

/** Returns lambda that set's corresponding dataset */
function datasetValueSetter(idx: number, newValue: RefString | undefined) {
  if (idx >= model.args.datasetColumns.length)
    // addition of a new dataset
    model.args.datasetColumns.push(fromRefString(notEmpty(newValue)));
  else if (newValue === undefined)
    model.args.datasetColumns.splice(idx, 1);
  else
    model.args.datasetColumns[idx] = fromRefString(newValue);
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

  const otherSelected = new Set(model.args.datasetColumns.map(toRefString));
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
  <PlDropdownRef :options="model.outputs.donorOptions ?? []" v-model="model.args.donorColumn"
    label="Select donor column" clearable />

  <template v-if="model.args.donorColumn !== undefined">
    <template v-for="dsIdx in range(0, model.args.datasetColumns.length + 1)">
      <PlDropdown v-if="getDatasetOptions(dsIdx)?.length !== 0" :options="getDatasetOptions(dsIdx) ?? []"
        :model-value="getDatasetValue(dsIdx)" @update:model-value="(v) => datasetValueSetter(dsIdx, v)"
        :label="`${dsIdx === model.args.datasetColumns.length ? 'Add' : 'Select'} dataset #${dsIdx + 1}`" />
    </template>
  </template>
</template>