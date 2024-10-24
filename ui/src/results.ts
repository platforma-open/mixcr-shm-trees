import { AnyLogHandle, isLiveLog } from '@platforma-sdk/model';
import { ReactiveFileContent } from '@platforma-sdk/ui-vue';
import { computed } from 'vue';
import { useApp } from './app';
import { ProgressPrefix } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

export type TreeResult = {
  donor: string;

  allelesProgress: string;
  treesProgress: string;

  allelesLogHandle?: AnyLogHandle;
  treesLogHandle?: AnyLogHandle;

  allelesReport?: any;
  treesReport?: any;
};

/** Relatively rarely changing part of the results */
export const TreeResultsMap = computed(() => {
  const app = useApp();

  // keys for reports's are calculated as soon as input data have locked inputs
  // (as early as possible to tell the list of donors we are analyzing here)
  let targetDonorIds = app.model.outputs.targetDonorIds;
  if (targetDonorIds === undefined) return undefined;

  const resultMap = new Map<string, TreeResult>();

  targetDonorIds = [...targetDonorIds];
  targetDonorIds.sort();
  for (const donor of targetDonorIds) {
    const result: TreeResult = {
      donor,
      allelesProgress: 'Queued',
      treesProgress: 'Queued'
    };
    resultMap.set(donor, result);
  }

  const allelesLogs = app.outputValues.allelesLogs;
  if (allelesLogs)
    for (const logData of allelesLogs.data) {
      const donor = logData.key[0] as string;
      resultMap.get(donor)!.allelesLogHandle = logData.value;
    }

  const treesLogs = app.outputValues.treesLogs;
  if (treesLogs)
    for (const logData of treesLogs.data) {
      const donor = logData.key[0] as string;
      resultMap.get(donor)!.treesLogHandle = logData.value;
    }

  const allelesReportsJson = app.outputValues.allelesReportsJson;
  if (allelesReportsJson)
    for (const report of allelesReportsJson.data) {
      if (report.value === undefined) continue;
      const donor = report.key[0] as string;
      resultMap.get(donor)!.allelesReport = ReactiveFileContent.getContentJson(
        report.value.handle
      )?.value;
    }

  const treesReportsJson = app.outputValues.treesReportsJson;
  if (treesReportsJson)
    for (const report of treesReportsJson.data) {
      if (report.value === undefined) continue;
      const donor = report.key[0] as string;
      resultMap.get(donor)!.treesReport = ReactiveFileContent.getContentJson(
        report.value.handle
      )?.value;
    }

  return resultMap;
});

/** Results augmented with execution progress */
export const TreeResultsFull = computed<TreeResult[] | undefined>(() => {
  const app = useApp();

  const allelesProgress = app.outputValues.allelesProgress;
  if (allelesProgress === undefined) return undefined;

  const treesProgress = app.outputValues.treesProgress;
  if (treesProgress === undefined) return undefined;

  const doneRaw = app.outputValues.done;
  if (doneRaw === undefined) return undefined;
  const done = new Set(doneRaw);

  const rawMap = TreeResultsMap.value;
  if (rawMap === undefined) return undefined;

  // shellow cloning the map and it's values
  const resultMap = new Map([...rawMap].map((v) => [v[0], { ...v[1] }]));

  // adding alleles progress information
  for (const p of allelesProgress.data) {
    const donor = p.key[0] as string;
    const result = resultMap.get(donor)!;
    if (p?.value)
      result.allelesProgress = isLiveLog(result.allelesLogHandle)
        ? p.value.replace(ProgressPrefix, '')
        : result.allelesLogHandle
        ? 'Done'
        : 'Queued';
  }

  // adding alleles progress information
  for (const p of treesProgress.data) {
    const donor = p.key[0] as string;
    const result = resultMap.get(donor)!;
    if (p?.value)
      result.treesProgress = isLiveLog(result.treesLogHandle)
        ? p.value.replace(ProgressPrefix, '')
        : result.treesLogHandle
        ? 'Done'
        : 'Queued';
  }

  return [...resultMap.values()];
});
