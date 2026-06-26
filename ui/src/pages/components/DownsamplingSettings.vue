<script setup lang="ts">
import { DownsamplingSettings } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import { ListOption, PlDropdown, PlNumberField } from "@platforma-sdk/ui-vue";
import { computed, ref, watch } from "vue";

const model = defineModel<DownsamplingSettings | undefined>();

type DType = DownsamplingSettings["type"] | "NoDownsampling";

const currentType = ref<DType>(model.value?.type ?? "NoDownsampling");

watch(
  () => model.value?.type,
  (value, oldValue) => {
    if (value !== oldValue) currentType.value = value ?? "NoDownsampling";
  },
);

const currentTypeValue = computed<DType>({
  get: () => currentType.value,
  set: (newValue) => {
    if (newValue === "NoDownsampling") model.value = undefined;
    currentType.value = newValue;
  },
});

// function getComputableForType<T extends DownsamplingSettings['type']>(type: T, extractor: (d: Extract<DownsamplingSettings, >) => )
const currentValue = computed({
  get: () => {
    const m = model.value;
    if (!m) return undefined;
    if (m.type !== currentType.value) return undefined;
    switch (m.type) {
      case "CountReadsFixed":
      case "CountMoleculesFixed":
      case "TopClonotypesByReads":
      case "TopClonotypesByMolecules":
        return m.number;
      case "CumulativeTopClonotypesByReads":
      case "CumulativeTopClonotypesByMolecules":
        return m.percent;
    }
    return undefined;
  },
  set: (newValue) => {
    if (!newValue) return;
    const t = currentType.value;
    switch (t) {
      case "CountReadsFixed":
      case "CountMoleculesFixed":
      case "TopClonotypesByReads":
      case "TopClonotypesByMolecules":
        model.value = { type: t, number: newValue };
        break;
      case "CumulativeTopClonotypesByReads":
      case "CumulativeTopClonotypesByMolecules":
        model.value = { type: t, percent: newValue };
        break;
    }
  },
});

const DownsamplingOptions: ListOption<DType>[] = [
  {
    value: "NoDownsampling",
    label: "No Downsampling",
  },
  {
    value: "CountReadsFixed",
    label: "Fixed Read Count",
  },
  {
    value: "CountMoleculesFixed",
    label: "Fixed Molecule Count",
  },
  {
    value: "TopClonotypesByReads",
    label: "Top Clones By Reads",
  },
  {
    value: "TopClonotypesByMolecules",
    label: "Top Clones By Molecules",
  },
  {
    value: "CumulativeTopClonotypesByReads",
    label: "Top Clones Constituting % By Reads",
  },
  {
    value: "CumulativeTopClonotypesByMolecules",
    label: "Top Clones Constituting % By Molecules",
  },
];
</script>

<template>
  <PlDropdown :options="DownsamplingOptions" v-model="currentTypeValue" />
  <template v-if="currentType === 'CountReadsFixed'">
    <PlNumberField v-model="currentValue" label="Number of Reads" :minValue="1" :step="1" />
  </template>
  <template v-else-if="currentType === 'CountMoleculesFixed'">
    <PlNumberField v-model="currentValue" label="Number of Molecules" :minValue="1" :step="1" />
  </template>
  <template
    v-else-if="currentType === 'TopClonotypesByReads' || currentType === 'TopClonotypesByMolecules'"
  >
    <PlNumberField v-model="currentValue" label="Number of Clonotypes" :minValue="1" :step="1" />
  </template>
  <template v-else-if="currentType === 'CumulativeTopClonotypesByReads'">
    <PlNumberField
      v-model="currentValue"
      label="Percent of Reads"
      :minValue="0"
      :maxValue="100"
      :step="1"
    />
  </template>
  <template v-else-if="currentType === 'CumulativeTopClonotypesByMolecules'">
    <PlNumberField
      v-model="currentValue"
      label="Percent of Molecules"
      :minValue="0"
      :maxValue="100"
      :step="1"
    />
  </template>
</template>
