import { AnyLogHandle, BlobHandleAndSize, isLiveLog } from '@platforma-sdk/model';
import { ReactiveFileContent } from '@platforma-sdk/ui-vue';
import { computed } from 'vue';
import { useApp } from './app';
import {
  PColumnResourceMapData,
  ProgressPrefix
} from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { ByStepIdRecord, Steps } from './types';

export type TreeResult = {
  donor: string;

  progress: ByStepIdRecord<string>;

  logHandle: ByStepIdRecord<AnyLogHandle | undefined>;

  jsonReport: ByStepIdRecord<any | undefined>;

  txtReportHandle: ByStepIdRecord<BlobHandleAndSize | undefined>;
};

function integrateData<T>(
  resultMap: Map<string, TreeResult>,
  data: PColumnResourceMapData<T> | undefined,
  integrator: (result: TreeResult, data: NonNullable<T>) => void
) {
  if (data)
    for (const d of data.data) {
      if (d.key.length !== 1 || typeof d.key[0] !== 'string') throw new Error('assertion error');
      const donor = d.key[0];
      const result = resultMap.get(donor);
      if (!result) throw new Error(`No result for key: ${donor}`);
      if (d.value) integrator(result, d.value);
    }
}

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
      progress: {
        alleles: 'Queued',
        trees: 'Queued'
      },
      jsonReport: { alleles: undefined, trees: undefined },
      txtReportHandle: { alleles: undefined, trees: undefined },
      logHandle: { alleles: undefined, trees: undefined }
    };
    resultMap.set(donor, result);
  }

  integrateData(resultMap, app.outputValues.allelesLogs, (r, v) => (r.logHandle.alleles = v));
  integrateData(resultMap, app.outputValues.treesLogs, (r, v) => (r.logHandle.trees = v));

  integrateData(
    resultMap,
    app.outputValues.allelesReportsJson,
    (r, v) => (r.jsonReport.alleles = ReactiveFileContent.getContentJson(v.handle)?.value)
  );
  integrateData(
    resultMap,
    app.outputValues.treesReportsJson,
    (r, v) => (r.jsonReport.trees = ReactiveFileContent.getContentJson(v.handle)?.value)
  );

  integrateData(
    resultMap,
    app.outputValues.allelesReports,
    (r, v) => (r.txtReportHandle.alleles = v)
  );
  integrateData(resultMap, app.outputValues.treesReports, (r, v) => (r.txtReportHandle.trees = v));

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

  // adding alleles and trees progress information
  for (const step of Steps)
    integrateData(resultMap, step === 'alleles' ? allelesProgress : treesProgress, (r, v) => {
      r.progress[step] = isLiveLog(r.logHandle[step])
        ? v.replace(ProgressPrefix, '')
        : r.logHandle[step]
        ? 'Done'
        : 'Queued';
    });

  return [...resultMap.values()];
});
