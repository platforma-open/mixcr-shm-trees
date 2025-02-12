import { ProgressPrefix } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import {
  AnyLogHandle,
  BlobHandleAndSize,
  isLiveLog,
  isNotNAPValue,
  NotNAPValue,
  PColumnResourceMapData
} from '@platforma-sdk/model';
import { ReactiveFileContent } from '@platforma-sdk/ui-vue';
import { computed } from 'vue';
import { useApp } from './app';
import { ByStepIdRecord, Steps } from './types';

export type TreeResult = {
  donor: NotNAPValue;

  progress: ByStepIdRecord<string>;

  soiReady: string;

  logHandle: ByStepIdRecord<AnyLogHandle | undefined>;

  jsonReport: ByStepIdRecord<any | undefined>;

  txtReportHandle: ByStepIdRecord<BlobHandleAndSize | undefined>;
};

function integrateData<T>(
  resultMap: Map<NotNAPValue, TreeResult>,
  data: PColumnResourceMapData<T> | undefined,
  integrator: (result: TreeResult, data: NonNullable<T>) => void
) {
  if (data)
    for (const d of data.data) {
      if (d.key.length !== 1 || !isNotNAPValue(d.key[0]))
        throw new Error(`assertion error, key = ${d.key[0]}}`); // @TODO (this kills ui)
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

  const resultMap = new Map<NotNAPValue, TreeResult>();

  targetDonorIds = [...targetDonorIds];
  targetDonorIds.sort();
  for (const donor of targetDonorIds) {
    const result: TreeResult = {
      donor,
      progress: {
        alleles: 'Queued',
        trees: 'Queued'
      },
      soiReady: 'Queued',
      jsonReport: { alleles: undefined, trees: undefined },
      txtReportHandle: { alleles: undefined, trees: undefined },
      logHandle: { alleles: undefined, trees: undefined }
    };
    resultMap.set(donor, result);
  }

  integrateData(resultMap, app.model.outputs.allelesLogs, (r, v) => (r.logHandle.alleles = v));
  integrateData(resultMap, app.model.outputs.treesLogs, (r, v) => (r.logHandle.trees = v));

  integrateData(
    resultMap,
    app.model.outputs.allelesReportsJson,
    (r, v) => (r.jsonReport.alleles = ReactiveFileContent.getContentJson(v.handle)?.value)
  );
  integrateData(
    resultMap,
    app.model.outputs.treesReportsJson,
    (r, v) => (r.jsonReport.trees = ReactiveFileContent.getContentJson(v.handle)?.value)
  );

  integrateData(
    resultMap,
    app.model.outputs.allelesReports,
    (r, v) => (r.txtReportHandle.alleles = v)
  );
  integrateData(resultMap, app.model.outputs.treesReports, (r, v) => (r.txtReportHandle.trees = v));

  return resultMap;
});

/** Results augmented with execution progress */
export const TreeResultsFull = computed<TreeResult[] | undefined>(() => {
  const app = useApp();

  const allelesProgress = app.model.outputs.allelesProgress;
  if (allelesProgress === undefined) return undefined;

  const treesProgress = app.model.outputs.treesProgress;
  if (treesProgress === undefined) return undefined;

  const doneRaw = app.model.outputs.done;
  if (doneRaw === undefined) return undefined;
  const done = new Set(doneRaw);

  const rawMap = TreeResultsMap.value;
  if (rawMap === undefined) return undefined;

  // shallow cloning the map and it's values
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

  const soiReady = app.model.outputs.soiReady;
  for (const r of resultMap.values())
    r.soiReady =
      soiReady === undefined
        ? 'Queued'
        : soiReady === true
        ? 'Done'
        : r.progress.alleles === 'Done' && r.progress.trees === 'Done'
        ? 'In Progress'
        : 'Queued';

  return [...resultMap.values()];
});
