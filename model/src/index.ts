import {
  BlockModel,
  PColumnSpec,
  Ref,
  Option,
  InferOutputsType,
  PlDataTableState,
  isPColumnSpec,
  FutureRef
} from '@platforma-sdk/model';
import { GraphMakerSettings } from '@milaboratories/graph-maker/dist/GraphMaker/types';
import { parseResourceMap } from './helpers';
import { ProgressPrefix } from './progress';

/**
 * Block arguments coming from the user interface
 */
export type BlockArgs = {
  // @todo, remove, used for testing
  seed?: string;
  donorColumn?: Ref;
  datasetColumns: Ref[];
};

export type TreeSelection = {
  donor?: string;
  treeId?: number;
};

export type UiState = {
  treeTableState?: PlDataTableState;
  treeSelectionForTreeNodesTable: TreeSelection;
  treeNodesGraphState: GraphMakerSettings;
};

export type ColumnOption = {
  ref: Ref;
  label: string;
  assemblingFeature?: string;
};

export const platforma = BlockModel.create<BlockArgs, UiState>('Heavy')

  .initialArgs({
    datasetColumns: []
  })

  // for debuginf: specs for all available columns
  // .output('allColumns', (ctx) =>
  //   ctx.resultPool
  //     .getSpecsFromResultPool()
  //     .entries.filter((v) => isPColumnSpec(v.obj))
  //     .map( (v) => v.obj as PColumnSpec )
  // )

  // select metadata columns
  .output('donorColumnOptions', (ctx) =>
    ctx.resultPool
      .getSpecs()
      .entries.filter((v) => isPColumnSpec(v.obj))
      .filter((v) => {
        const spec = v.obj as PColumnSpec;
        return spec.name === 'pl7.app/metadata';
      })
      .map(
        (v) =>
          ({
            ref: v.ref,
            label: `${ctx.getBlockLabel(v.ref.blockId)} / ${
              v.obj.annotations?.['pl7.app/label'] ?? `unlabelled`
            }`
          } satisfies Option)
      )
      .map((v) => ({
        text: v.label,
        value: v.ref
      }))
  )

  // selected all dataset options that have the same axis as selected metadata column
  .output('datasetColumnOptions', (ctx) => {
    if (ctx.args.donorColumn === undefined) return undefined;

    const donorColumn = ctx.args.donorColumn;
    const donorColumnSpec = ctx.resultPool
      .getSpecs()
      .entries.find(
        (v) => v.ref.blockId === donorColumn.blockId && v.ref.name === donorColumn.name
      )?.obj;

    if (donorColumnSpec === undefined || !isPColumnSpec(donorColumnSpec)) return undefined;

    const toCompare = donorColumnSpec.axesSpec[0];

    return ctx.resultPool
      .getSpecs()
      .entries.filter((v) => isPColumnSpec(v.obj))
      .filter((v) => {
        const spec = v.obj as PColumnSpec;
        // @todo there should be library call
        // @todo compare all axes, not the first

        if (spec.name !== 'mixcr.com/clns' || spec.axesSpec.length !== 1) return false;
        const axisSpec = spec.axesSpec[0];
        if (axisSpec.name !== toCompare.name) return false;
        if (toCompare.domain === undefined || Object.keys(toCompare.domain).length === 0)
          return true;
        if (axisSpec.domain === undefined) return false;
        for (const [domainName, domainValue] of Object.entries(toCompare.domain))
          if (axisSpec.domain[domainName] !== domainValue) return false;
        return true;
      })
      .map((v) => {
        const option = {
          ref: v.ref,
          // @todo info about what was run
          label: `${ctx.getBlockLabel(v.ref.blockId)} / ${
            v.obj.annotations?.['pl7.app/label'] ?? `unlabelled`
          }`
        } as ColumnOption;
        const spec = v.obj as PColumnSpec;
        if (
          !(
            spec.annotations === undefined ||
            spec.annotations['mixcr.com/assemblingFeature'] === undefined
          )
        ) {
          option.assemblingFeature = spec.annotations['mixcr.com/assemblingFeature'];
        }
        return option;
      });
  })

  .output('trees', (ctx) => {
    const pCols = ctx.outputs?.resolve('trees')?.getPColumns();
    if (pCols === undefined) return undefined;
    return ctx.createPTable({
      columns: pCols,
      filters: ctx.uiState?.treeTableState?.pTableParams?.filters ?? [],
      sorting: ctx.uiState?.treeTableState?.pTableParams?.sorting ?? []
    });
  })

  .output('treeNodes', (ctx) => {
    const treeNodesColumns = ctx.outputs?.resolve('treeNodes')?.getPColumns();
    if (treeNodesColumns === undefined) return undefined;

    const treeNodesWithClonesColumns = ctx.outputs?.resolve('treeNodesWithClones')?.getPColumns();
    if (treeNodesWithClonesColumns === undefined) return undefined;

    return ctx.createPFrame(treeNodesColumns.concat(treeNodesWithClonesColumns));
  })

  /** Donot ids for which we have at least one dataset to analyze */
  .output('targetDonorIds', (ctx) => {
    const alleleReports = ctx.outputs?.resolve({
      field: 'allelesReports',
      assertFieldType: 'Input'
    });
    if (alleleReports === undefined) return undefined;
    const reports = parseResourceMap(alleleReports, (acc) => acc.getFileContentAsString(), true);

    const resultSet = new Set<string>(reports.data.map((r) => r.key[0] as string));
    return [...resultSet];
  })

  .output('allelesReports', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'allelesReports', assertFieldType: 'Input' }),
      (acc) => acc.getFileHandle(),
      false
    )
  )

  .output('treesReports', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'treesReports', assertFieldType: 'Input' }),
      (acc) => acc.getFileHandle(),
      false
    )
  )

  .output('allelesReportsJson', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'allelesReportsJson', assertFieldType: 'Input' }),
      (acc) => acc.getFileHandle(),
      false
    )
  )

  .output('treesReportsJson', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'treesReportsJson', assertFieldType: 'Input' }),
      (acc) => acc.getFileHandle(),
      false
    )
  )

  .output('allelesLogs', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: 'allelesLogs', assertFieldType: 'Input' }),
          (acc) => acc.getLogHandle(),
          false
        )
      : undefined;
  })

  .output('treesLogs', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: 'treesLogs', assertFieldType: 'Input' }),
          (acc) => acc.getLogHandle(),
          false
        )
      : undefined;
  })

  .output('allelesProgress', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: 'allelesLogs', assertFieldType: 'Input' }),
          (acc) => acc.getProgressLog(ProgressPrefix),
          false
        )
      : undefined;
  })

  .output('treesProgress', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: 'treesLogs', assertFieldType: 'Input' }),
          (acc) => acc.getProgressLog(ProgressPrefix),
          false
        )
      : undefined;
  })

  .output('started', (ctx) => ctx.outputs !== undefined)

  .output('done', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: 'tsvs', assertFieldType: 'Input' }),
          (acc) => acc.getIsReadyOrError() === true,
          false
        )
          .data.filter((e) => e.value)
          .map((e) => e.key[0] as string)
      : undefined;
  })

  .sections([
    { type: 'link', href: '/', label: 'Main' },
    { type: 'link', href: '/trees', label: 'Trees Table' },
    { type: 'link', href: '/treeNodes', label: 'Tree Nodes Table' }
  ])

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;

export * from './progress';
