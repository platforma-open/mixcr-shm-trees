import { GraphMakerState } from '@milaboratories/graph-maker';
import {
  BlockModel,
  InferOutputsType,
  NotNAPValue,
  PColumn,
  PTableHandle,
  PlDataTableState,
  PlRef,
  RenderCtx,
  TreeNodeAccessor,
  createPlDataTable,
  deriveLabels,
  getAxisId,
  isPColumnSpec,
  isPColumnSpecResult,
  parseResourceMap,
  type PlTableFiltersModel
} from '@platforma-sdk/model';
import { ProgressPrefix } from './progress';
import { matchAxesId } from './util';
import { SOIList } from './soi';
import { FullTreeId, treeNodesFilter } from './tree_filter';

export type DownsamplingByCount = {
  type: 'CountReadsFixed' | 'CountMoleculesFixed';
  number: number;
};

export type DownsamplingByTop = {
  type: 'TopClonotypesByReads' | 'TopClonotypesByMolecules';
  number: number;
};

export type DownsamplingByCumulativeTop = {
  type: 'CumulativeTopClonotypesByReads' | 'CumulativeTopClonotypesByMolecules';
  percent: number;
};

export type DownsamplingSettings =
  | DownsamplingByCount
  | DownsamplingByTop
  | DownsamplingByCumulativeTop;

/**
 * Block arguments coming from the user interface
 */
export type BlockArgs = {
  donorColumn?: PlRef;
  datasetColumns: PlRef[];
  downsampling?: DownsamplingSettings;
  sequencesOfInterest?: SOIList[];
};

export type FullTableState = {
  tableState: PlDataTableState;
  filterModel: PlTableFiltersModel;
};

export function InitialFullTableState(): FullTableState {
  return {
    tableState: {
      gridState: {},
      pTableParams: {
        sorting: [],
        filters: []
      }
    },
    filterModel: {}
  };
}

export type TreePageTab = 'Graph' | 'Table';

export type DendrogramState = FullTreeId & {
  id: string;
  state: GraphMakerState;
  tableState: FullTableState;
  tab: TreePageTab;
};

export type UiState = {
  treeTableState: PlDataTableState;
  filterModel: PlTableFiltersModel;
  dendrograms: DendrogramState[];
};

export type DatasetOption = {
  ref: PlRef;
  label: string;
  assemblingFeature: string;
};

function treeNodesColumns(
  ctx: RenderCtx<BlockArgs, UiState>
): PColumn<TreeNodeAccessor>[] | undefined {
  const treeNodesColumns = ctx.outputs?.resolve('treeNodes')?.getPColumns();
  if (treeNodesColumns === undefined) return undefined;

  const treeNodesWithClonesColumns = ctx.outputs?.resolve('treeNodesWithClones')?.getPColumns();
  if (treeNodesWithClonesColumns === undefined) return undefined;

  const soiResultColumns = (
    ctx.outputs?.resolve('soiNodesResults')?.mapFields((_, v) => v?.getPColumns() ?? []) ?? []
  ).flatMap((a) => a);

  const targetColumns = [...soiResultColumns, ...treeNodesColumns, ...treeNodesWithClonesColumns];

  // if (ctx.args.donorColumn !== undefined) {
  //   const donorColumn = ctx.args.donorColumn;
  //   const donorColumnSpec = ctx.resultPool.getSpecByRef(donorColumn);
  //   if (donorColumnSpec !== undefined && isPColumnSpec(donorColumnSpec)) {
  //     const sampleAxisId = getAxisId(donorColumnSpec.axesSpec[0]);
  //     const col = ctx.resultPool
  //       .getData()
  //       .entries.filter(isPColumnResult)
  //       .find(
  //         ({ obj: { spec } }) =>
  //           spec.name === 'pl7.app/label' && matchAxesId([sampleAxisId], spec.axesSpec)
  //       );
  //     if (col) targetColumns.push(col.obj);
  //   }
  // }

  return targetColumns;
}

export const model = BlockModel.create()

  .withArgs<BlockArgs>({
    datasetColumns: []
  })

  .withUiState<UiState>({
    treeTableState: {
      gridState: {},
      pTableParams: {
        sorting: [],
        filters: []
      }
    },
    filterModel: {},
    dendrograms: []
  })

  // for debuginf: specs for all available columns
  // .output('allColumns', (ctx) =>
  //   ctx.resultPool
  //     .getSpecsFromResultPool()
  //     .entries.filter((v) => isPColumnSpec(v.obj))
  //     .map( (v) => v.obj as PColumnSpec )
  // )

  .output('calculating', (ctx) => ctx.outputs?.getIsReadyOrError() === false)

  // select metadata columns
  .retentiveOutput('donorOptions', (ctx) =>
    ctx.resultPool.getOptions((spec) => {
      if (!isPColumnSpec(spec)) return false;
      if (spec.name === 'pl7.app/metadata') return true;
      return (
        spec.name === 'pl7.app/label' &&
        spec.axesSpec.length === 1 &&
        spec.axesSpec[0].name === 'pl7.app/sampleId'
      );
    })
  )

  // selected all dataset options that have the same axis as selected metadata column
  .retentiveOutput('datasetOptions', (ctx) => {
    if (ctx.args.donorColumn === undefined) return undefined;

    const donorColumn = ctx.args.donorColumn;
    const donorColumnSpec = ctx.resultPool.getSpecByRef(donorColumn);
    if (donorColumnSpec === undefined || !isPColumnSpec(donorColumnSpec)) return undefined;

    const sampleAxisId = getAxisId(donorColumnSpec.axesSpec[0]);

    return deriveLabels(
      ctx.resultPool
        .getSpecs()
        .entries.filter(isPColumnSpecResult)
        .filter(
          ({ obj: spec }) =>
            spec.name === 'mixcr.com/clns' &&
            matchAxesId([sampleAxisId], spec.axesSpec) &&
            spec.annotations?.['mixcr.com/assemblingFeature'] !== undefined &&
            spec.annotations?.['mixcr.com/assemblingFeature'] !== 'CDR3' &&
            spec.annotations?.['mixcr.com/assemblingFeature'] !== '[CDR3]'
        ),
      (v) => v.obj,
      { addLabelAsSuffix: true, includeNativeLabel: true }
    ).map(
      ({ value: { ref, obj: spec }, label }) =>
        ({
          ref,
          label,
          assemblingFeature: spec.annotations!['mixcr.com/assemblingFeature']!
        } as DatasetOption)
    );
  })

  .output('trees', (ctx) => {
    const pCols = ctx.outputs?.resolve('trees')?.getPColumns();
    if (pCols === undefined) return undefined;

    const soiResultColumns = (
      ctx.outputs?.resolve('soiTreesResults')?.mapFields((_, v) => v?.getPColumns() ?? []) ?? []
    ).flatMap((a) => a);

    // wait until sheet filters are set
    const sheetFilters = ctx.uiState?.treeTableState.pTableParams?.filters;
    if (!sheetFilters) return undefined;

    return ctx.createPTable({
      columns: [...pCols, ...soiResultColumns],
      filters: [...sheetFilters, ...(ctx.uiState?.filterModel?.filters ?? [])],
      sorting: ctx.uiState?.treeTableState?.pTableParams?.sorting ?? []
    });
  })

  .output('treeColumnSpec', (ctx) => {
    const pCols = ctx.outputs?.resolve('trees')?.getPColumns();
    if (pCols === undefined || pCols.length === 0) return undefined;
    return pCols[0].spec;
  })

  .output('treeNodesPFrame', (ctx) => {
    const cols = treeNodesColumns(ctx);
    if (cols === undefined) return undefined;
    return ctx.createPFrame(cols);
  })

  .output('treeNodesPerTree', (ctx) => {
    const columns = treeNodesColumns(ctx);
    if (columns === undefined) return undefined;

    const result: Record<string, PTableHandle> = {};
    // const result: Record<string, any> = {};

    for (const tree of ctx.uiState!.dendrograms) {
      // result[tree.id] = ctx.createPTable({
      //   columns,
      //   filters: [
      //     ...treeNodesFilter(columns[0].spec, { ...tree, subtreeId: undefined }),
      //     ...(tree.tableState?.filterModel?.filters ?? [])
      //   ]
      // });
      const t = createPlDataTable(ctx, columns, tree.tableState.tableState, [
        ...treeNodesFilter(columns[0].spec, { ...tree, subtreeId: undefined }),
        ...(tree.tableState?.filterModel?.filters ?? [])
      ]);
      if (t) result[tree.id] = t;
      // result[tree.id] = {
      //   columns,
      //   filters: [
      //     ...treeNodesFilter(columns[0].spec, { ...tree, subtreeId: undefined }),
      //     ...(tree.tableState?.filterModel?.filters ?? [])
      //   ]
      // };
    }

    return result;
  })

  /** Donor ids for which we have at least one dataset to analyze */
  .output('targetDonorIds', (ctx) => {
    const alleleReports = ctx.outputs?.resolve({
      field: 'allelesReports',
      assertFieldType: 'Input'
    });
    if (alleleReports === undefined) return undefined;
    const reports = parseResourceMap(alleleReports, (acc) => acc.getFileContentAsString(), true);

    const resultSet = new Set<NotNAPValue>(reports.data.map((r) => r.key[0] as string));
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

  .output('vjColumns', (ctx) => {
    const cols = ctx.outputs?.resolve('treeNodes')?.getPColumns();
    if (cols === undefined) return undefined;

    return cols.filter((col) => col.spec.name === 'pl7.app/vdj/geneHit').map((col) => col.id);
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

  .sections((ctx) => {
    const dendroRoutes = (ctx.uiState?.dendrograms ?? []).map((gs) => ({
      type: 'link' as const,
      href: `/dendrogram?id=${gs.id}` as const,
      label: gs.state.title
    }));
    return [
      { type: 'link', href: '/', label: 'Analysis Overview' },
      { type: 'link', href: '/soi', label: 'Sequence Search' },
      { type: 'link', href: '/trees', label: 'Trees Table' },
      // { type: 'link', href: '/treeNodes', label: 'Tree Visualization' },
      ...dendroRoutes
    ];
  })

  .argsValid((ctx) => ctx.args.donorColumn !== undefined && ctx.args.datasetColumns.length > 0)

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;

export * from './progress';
export * from './soi';
export * from './helpers';
export * from './tree_filter';
