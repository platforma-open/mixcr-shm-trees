<script setup lang="ts">

import { DownsamplingSettings } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { ListOption, PlDropdown, PlTextField } from '@platforma-sdk/ui-vue';
import { computed, ref, watch } from 'vue';

const model = defineModel<DownsamplingSettings | undefined>()

type DType = DownsamplingSettings['type'] | 'NoDownsampling';

const currentType = ref<DType>(model.value?.type ?? 'NoDownsampling')

watch(() => model.value?.type, (value, oldValue) => {
  if (value !== oldValue)
    currentType.value = value ?? 'NoDownsampling';
});

const currentTypeValue = computed<DType>({
  get: () => currentType.value,
  set: (newValue) => {
    if (newValue === 'NoDownsampling')
      model.value = undefined;
    currentType.value = newValue;
  }
})

// function getComputableForType<T extends DownsamplingSettings['type']>(type: T, extractor: (d: Extract<DownsamplingSettings, >) => )
const currentValue = computed({
  get: () => {
    const m = model.value;
    if (!m)
      return undefined;
    if (m.type !== currentType.value)
      return undefined;
    else switch (m.type) {
      case 'CountReadsFixed':
      case 'CountMoleculesFixed':
      case 'TopClonotypesByReads':
      case 'TopClonotypesByMolecules':
        return m.number;
      case 'CumulativeTopClonotypesByReads':
      case 'CumulativeTopClonotypesByMolecules':
        return m.percent;
    }
  },
  set: (newValue) => {
    if (!newValue)
      return;
    const t = currentType.value;
    switch (t) {
      case 'CountReadsFixed':
      case 'CountMoleculesFixed':
      case 'TopClonotypesByReads':
      case 'TopClonotypesByMolecules':
        model.value = { type: t, number: newValue };
        break;
      case 'CumulativeTopClonotypesByReads':
      case 'CumulativeTopClonotypesByMolecules':
        model.value = { type: t, percent: newValue };
        break;
    }
  }
});

const DownsamplingOptions: ListOption<DType>[] = [
  {
    value: 'NoDownsampling',
    label: 'No Downsampling'
  }, {
    value: 'CountReadsFixed',
    label: 'Fixed Read Count'
  }, {
    value: 'CountMoleculesFixed',
    label: 'Fixed Molecule Count'
  }, {
    value: 'TopClonotypesByReads',
    label: 'Top Clones By Reads'
  }, {
    value: 'TopClonotypesByMolecules',
    label: 'Top Clones By Molecules'
  }, {
    value: 'CumulativeTopClonotypesByReads',
    label: 'Top Clones Constituting % By Reads'
  }, {
    value: 'CumulativeTopClonotypesByMolecules',
    label: 'Top Clones Constituting % By Molecules'
  }
]

function parseInteger(v: string): number {
  const parsed = Number(v);

  if (!Number.isFinite(parsed))
    throw Error('Not a number');

  if (!Number.isSafeInteger(parsed))
    throw Error('Not an integer');

  if (parsed <= 0)
    throw Error('Less than or equal to 0');

  return parsed;
}

function parsePercent(v: string): number {
  const parsed = Number(v);

  if (!Number.isFinite(parsed))
    throw Error('Not a number');

  if (parsed > 100)
    throw Error('More than 100');

  if (parsed <= 0)
    throw Error('Less than or equal to 0');

  return parsed;
}
</script>

<template>
  <PlDropdown :options="DownsamplingOptions" v-model="currentTypeValue" />
  <template v-if="currentType === 'CountReadsFixed'">
    <PlTextField v-model="currentValue" :parse="parseInteger" label="Number of Reads" :clearable="()=> undefined"/>
  </template>
  <template v-else-if="currentType === 'CountMoleculesFixed'">
    <PlTextField v-model="currentValue" :parse="parseInteger" label="Number of Molecules" :clearable="()=> undefined" />
  </template>
  <template v-else-if="currentType === 'TopClonotypesByReads' || currentType === 'TopClonotypesByMolecules'">
    <PlTextField v-model="currentValue" :parse="parseInteger" label="Number of Clonotypes" :clearable="()=> undefined" />
  </template>
  <template v-else-if="currentType === 'CumulativeTopClonotypesByReads'">
    <PlTextField v-model="currentValue" :parse="parsePercent" label="Percent of Reads"  :clearable="()=> undefined"/>
  </template>
  <template v-else-if="currentType === 'CumulativeTopClonotypesByMolecules'">
    <PlTextField v-model="currentValue" :parse="parsePercent" label="Percent of Molecules" :clearable="()=> undefined" />
  </template>
</template>
