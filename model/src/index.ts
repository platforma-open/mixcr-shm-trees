import {
  BlockModel,
  PColumnSpec,
  Ref,
  Option,
  InferOutputsType,
  PlDataTableState,
  isPColumn,
  isPColumnSpec
} from '@platforma-sdk/model';
import { GraphMakerSettings } from '@milaboratories/graph-maker/dist/GraphMaker/types';
import { parseResourceMap } from './helpers';

/**
 * Block arguments coming from the user interface
 */
export type BlockArgs = {
  donorColumn?: Ref;
  datasetColumns: (Ref | null)[];
};

export type TreeSelection = {
  donor?: string;
  treeId?: number;
};

export type ReportSelection = {
  donor?: string;
  type: 'alleles' | 'shmTrees';
};

export type UiState = {
  treeTableState?: PlDataTableState;
  treeSelectionForTreeNodesTable: TreeSelection;
  reportSelection: ReportSelection;
  treeNodesGraphState: GraphMakerSettings
};

export type ColumnOption = {
  ref: Ref;
  label: string;
  spec: PColumnSpec;
};

export const platforma = BlockModel.create<BlockArgs, UiState>('Heavy')

  .initialArgs({
    datasetColumns: [null]
  })

  // select metadata columns
  .output('donorColumnOptions', (ctx) =>
    ctx.resultPool
      .getSpecsFromResultPool()
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
  )

  // selected all dataset options that have the same axis as selected metadata column
  .output('datasetColumnOptions', (ctx) => {
    if (ctx.args.donorColumn === undefined) {
      return undefined;
    }
    const donorColumn = ctx.args.donorColumn;
    const donorColumnSpec = ctx.resultPool
      .getSpecsFromResultPool()
      .entries.find(
        (v) => v.ref.blockId === donorColumn.blockId && v.ref.name === donorColumn.name
      )?.obj;

    if (donorColumnSpec === undefined || !isPColumnSpec(donorColumnSpec)) return undefined;

    const toCompare = donorColumnSpec.axesSpec[0];

    return ctx.resultPool
      .getSpecsFromResultPool()
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
      .map(
        (v) =>
          ({
            ref: v.ref,
            // @todo info about what was run
            label: `${ctx.getBlockLabel(v.ref.blockId)} / ${
              v.obj.annotations?.['pl7.app/label'] ?? `unlabelled`
            }`,
            spec: v.obj as PColumnSpec
          } as ColumnOption)
      );
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
    const pCols = ctx.outputs?.resolve('treeNodes')?.getPColumns();
    if (pCols === undefined) return undefined;

    return ctx.createPFrame(pCols);
  })

  .output('allelesReports', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'allelesReports', assertFieldType: 'Input' }),
      (acc) => acc.getFileContentAsString()
    )
  )

  .output('treesReports', (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: 'treesReports', assertFieldType: 'Input' }),
      (acc) => acc.getFileContentAsString()
    )
  )

  .sections([
    { type: 'link', href: '/', label: 'Settings' },
    { type: 'link', href: '/reports', label: 'Reports' },
    { type: 'link', href: '/trees', label: 'Trees Table' },
    { type: 'link', href: '/treeNodes', label: 'Tree Nodes Table' }
  ])

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;
