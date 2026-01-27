import { GraphMakerState } from '@milaboratories/graph-maker';
import {
  AxesSpec,
  BlockModel,
  InferOutputsType,
  NotNAPValue,
  PColumn,
  PColumnSpec,
  PColumnValues,
  PObjectId,
  PTableHandle,
  PlDataTableState,
  PlId,
  PlRef,
  RenderCtx,
  TreeNodeAccessor,
  createPlDataTable,
  createPFrameForGraphs,
  deriveLabels,
  getAxisId,
  isPColumnSpec,
  isPColumnSpecResult,
  pValueToStringOrNumber,
  parseResourceMap,
  type PlTableFiltersModel
} from '@platforma-sdk/model';
import { ProgressPrefix } from './progress';
import { matchAxesId } from './util';
import { SOIList } from './soi';
import { FullNodeId, FullTreeId, treeNodesFilter } from './tree_filter';

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
  datasetsTitles?: string[];
  perProcessMemGB?: number;
  perProcessCPUs?: number;
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

export type NodeBasket = {
  id: PlId;
  name: string;
  comment: string;
  nodes: FullNodeId[];
  tableState: FullTableState;
};

export type UiState = {
  treeTableState: PlDataTableState;
  filterModel: PlTableFiltersModel;
  dendrograms: DendrogramState[];
  baskets: NodeBasket[];
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

  const treeNodesUniqueIsotypeColumns = ctx.outputs?.resolve('treeNodesUniqueIsotype')?.getPColumns();
  if (treeNodesUniqueIsotypeColumns === undefined) return undefined;

  const soiResultColumns = (
    ctx.outputs?.resolve('soiNodesResults')?.mapFields((_, v) => v?.getPColumns() ?? []) ?? []
  ).flatMap((a) => a);

  const targetColumns = [...treeNodesColumns, ...treeNodesWithClonesColumns, ...treeNodesUniqueIsotypeColumns, ...soiResultColumns];

  return targetColumns;
}

const InBasketPColumnName = 'pl7.app/dendrogram/inBasket';

type BasketColumns = {
  allColumns: PColumn<PColumnValues>[];
  perBasket: Record<PlId, PColumn<PColumnValues>>;
};

function basketColumns(ctx: RenderCtx<BlockArgs, UiState>): BasketColumns | undefined {
  const treeNodesWithClonesColumns = ctx.outputs?.resolve('treeNodesWithClones')?.getPColumns();
  if (treeNodesWithClonesColumns === undefined) return undefined;
  const bigAxesSpec = treeNodesWithClonesColumns[0].spec.axesSpec;

  const axesSpec: AxesSpec = [];
  const hasSubtreeId = bigAxesSpec.length === 6;
  if (bigAxesSpec.length === 6)
    // [donor, treeId, subtreeId, nodeId], sampleId, cloneId
    axesSpec.push(...bigAxesSpec.slice(0, 4));
  else if (bigAxesSpec.length === 5)
    // [donor, treeId, nodeId], sampleId, cloneId
    axesSpec.push(...bigAxesSpec.slice(0, 3));
  else throw new Error(`Unexpected axes structureL: ${JSON.stringify(bigAxesSpec)}`);

  const toKey = (id: FullNodeId): (number | string)[] =>
    hasSubtreeId
      ? [pValueToStringOrNumber(id.donorId), id.treeId, Number(id.subtreeId!), id.nodeId]
      : [pValueToStringOrNumber(id.donorId), id.treeId, id.nodeId];

  const columns: PColumn<PColumnValues>[] = [];
  const columnPerBasket: Record<PlId, PColumn<PColumnValues>> = {};

  for (const basket of ctx.uiState.baskets) {
    const inBasketSpec: PColumnSpec = {
      kind: 'PColumn',
      name: InBasketPColumnName,
      valueType: 'Int',
      domain: {
        'pl7.app/dendrogram/basket': basket.id
      },
      annotations: {
        'pl7.app/label': `In ${basket.name}`
      },
      axesSpec
    };
    const col: PColumn<PColumnValues> = {
      id: basket.id as string as PObjectId,
      spec: inBasketSpec,
      data: basket.nodes.map((id) => ({
        key: toKey(id),
        val: 1
      }))
    };
    columns.push(col);
    columnPerBasket[basket.id] = col;
  }

  return { allColumns: columns, perBasket: columnPerBasket };
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
    dendrograms: [],
    baskets: []
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

  .output('treeNodes', (ctx) => {
    const treeNodes = ctx.outputs?.resolve('treeNodes')?.getPColumns();
    if (treeNodes === undefined) return undefined;
    return treeNodes.map((col) => col.spec);
  })
  .output('treeNodesWithClones', (ctx) => {
    const treeNodesWithClones = ctx.outputs?.resolve('treeNodesWithClones')?.getPColumns();
    if (treeNodesWithClones === undefined) return undefined;
    return treeNodesWithClones.map((col) => col.spec);
  })
  .output('treeNodesUniqueIsotype', (ctx) => {
    const treeNodesUniqueIsotype = ctx.outputs?.resolve('treeNodesUniqueIsotype')?.getPColumns();
    if (treeNodesUniqueIsotype === undefined) return undefined;
    return treeNodesUniqueIsotype.map((col) => col.spec);
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
    return createPFrameForGraphs(ctx, cols);
  })

  .output('treeNodesUniqueIsotypePFrame', (ctx) => {
    const cols = treeNodesColumns(ctx);
    if (cols === undefined) return undefined;
    return createPFrameForGraphs(ctx, cols);
  })

  .output('treeNodesPerTree', (ctx) => {
    const columns = treeNodesColumns(ctx);
    const bColumns = basketColumns(ctx);
    if (columns === undefined || bColumns === undefined) return undefined;

    const result: Record<string, PTableHandle> = {};

    const coreColumnPredicate = (spec: PColumnSpec) =>
      spec.name !== InBasketPColumnName &&
      spec.axesSpec.find((a) => a.name === 'pl7.app/vdj/cloneId') !== undefined;
    
    const coreColumn = columns.find(c => coreColumnPredicate(c.spec));

    for (const tree of ctx.uiState!.dendrograms) {
      const t = createPlDataTable(
        ctx,
        [...columns, ...bColumns.allColumns],
        tree.tableState.tableState,
        {
          coreColumnPredicate,
          coreJoinType: 'inner',
          filters: [
            ...treeNodesFilter(coreColumn!.spec, { ...tree, subtreeId: undefined }),
            ...(tree.tableState?.filterModel?.filters ?? [])
          ]
        }
      );

      if (t) result[tree.id] = t;
    }

    return result;
  })

  .output('treeNodesPerBasket', (ctx) => {
    const columns = treeNodesColumns(ctx);
    const bColumns = basketColumns(ctx);
    if (columns === undefined || bColumns === undefined) return undefined;

    const result: Record<string, PTableHandle> = {};

    for (const basket of ctx.uiState.baskets) {
      const t = createPlDataTable(
        ctx,
        [...columns, bColumns.perBasket[basket.id]!],
        basket.tableState.tableState,
        {
          coreColumnPredicate: (spec) => spec.name === InBasketPColumnName,
          coreJoinType: 'inner',
          filters: [...(basket.tableState?.filterModel?.filters ?? [])]
        }
      );

      if (t) result[basket.id] = t;
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

  .output('soiReady', (ctx) => ctx.outputs?.resolve('soiNodesResults')?.getIsReadyOrError())

  .output('started', (ctx) => ctx.outputs !== undefined)

  .output('done', (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolveInput('shmt', 'data'),
          (acc) => acc.getIsReadyOrError() === true,
          false
        )
          .data.filter((e) => e.value)
          .map((e) => e.key[0] as string)
      : undefined;
  })

  .sections((ctx) => {
    const dendroSectionsRaw = (ctx.uiState?.dendrograms ?? []).map((gs) => ({
      type: 'link' as const,
      href: `/dendrogram?id=${gs.id}` as const,
      label: gs.state.title
    }));
    const dendroSections =
      dendroSectionsRaw.length === 0 ? [] : [{ type: 'delimiter' as const }, ...dendroSectionsRaw];

    const basketSectionsRaw = (ctx.uiState?.baskets ?? []).map((b) => ({
      type: 'link' as const,
      href: `/basket?id=${b.id as string}` as const,
      label: b.name
    }));
    const basketSections =
      basketSectionsRaw.length === 0 ? [] : [{ type: 'delimiter' as const }, ...basketSectionsRaw];

    return [
      { type: 'link', href: '/', label: 'Analysis Overview' },
      { type: 'link', href: '/soi', label: 'Sequence Search' },
      { type: 'link', href: '/trees', label: 'Trees Table' },
      ...dendroSections,
      ...basketSections
    ];
  })

  .argsValid(
    (ctx) =>
      ctx.args.donorColumn !== undefined &&
      ctx.args.datasetColumns.length > 0 &&
      (ctx.uiState.baskets === undefined || ctx.uiState.baskets.length == 0) &&
      (ctx.uiState.dendrograms === undefined || ctx.uiState.dendrograms.length == 0)
  )

  .title((ctx) => (ctx.args.datasetsTitles ? `MiXCR SHM Trees - ${ctx.args.datasetsTitles.join('-')}` : 'MiXCR SHM Trees'))

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;

export * from './progress';
export * from './soi';
export * from './tree_filter';
