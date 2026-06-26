import { GraphMakerState } from "@milaboratories/graph-maker";
import {
  ArrayColumnProvider,
  AxesSpec,
  AxisId,
  BlockModelV3,
  ColumnCollectionBuilder,
  DataModelBuilder,
  InferOutputsType,
  PColumn,
  PColumnDataUniversal,
  PColumnSpec,
  PColumnValues,
  PObjectId,
  PlDataTableModel,
  PlDataTableStateV2,
  PlId,
  PlRef,
  RenderCtx,
  TreeNodeAccessor,
  createPlDataTable,
  createPlDataTableStateV2,
  createPFrameForGraphs,
  deriveLabels,
  getAxisId,
  isPColumnSpec,
  isPColumnSpecResult,
  parseResourceMap,
} from "@platforma-sdk/model";
import { ProgressPrefix } from "./progress";
import { matchAxesId } from "./util";
import { SOIList } from "./soi";
import { FullNodeId, FullTreeId, treeNodesFilterSpec } from "./tree_filter";

export type DownsamplingByCount = {
  type: "CountReadsFixed" | "CountMoleculesFixed";
  number: number;
};

export type DownsamplingByTop = {
  type: "TopClonotypesByReads" | "TopClonotypesByMolecules";
  number: number;
};

export type DownsamplingByCumulativeTop = {
  type: "CumulativeTopClonotypesByReads" | "CumulativeTopClonotypesByMolecules";
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

export type TreePageTab = "Graph" | "Table";

export type DendrogramState = FullTreeId & {
  id: string;
  state: GraphMakerState;
  tableState: PlDataTableStateV2;
  tab: TreePageTab;
};

export type NodeBasket = {
  id: PlId;
  name: string;
  comment: string;
  nodes: FullNodeId[];
  tableState: PlDataTableStateV2;
};

// Unified V3 block state: user-facing arguments plus UI-only state in one bag.
export type BlockData = BlockArgs & {
  treeTableState: PlDataTableStateV2;
  dendrograms: DendrogramState[];
  baskets: NodeBasket[];
};

// Pre-V3 persisted shape, used only to upgrade existing projects. The old
// per-tree/basket table state was a { tableState, filterModel } wrapper; the
// filter model is folded into the V2 table state now and dropped here.
type LegacyTableState = { tableState: PlDataTableStateV2 };
type LegacyUiState = {
  treeTableState: PlDataTableStateV2;
  dendrograms?: (Omit<DendrogramState, "tableState"> & { tableState: LegacyTableState })[];
  baskets?: (Omit<NodeBasket, "tableState"> & { tableState: LegacyTableState })[];
};

export type DatasetOption = {
  ref: PlRef;
  label: string;
  assemblingFeature: string;
};

function treeNodesColumns(
  ctx: RenderCtx<BlockArgs, BlockData>,
): PColumn<TreeNodeAccessor>[] | undefined {
  const treeNodesColumns = ctx.outputs?.resolve("treeNodes")?.getPColumns();
  if (treeNodesColumns === undefined) return undefined;

  const treeNodesWithClonesColumns = ctx.outputs?.resolve("treeNodesWithClones")?.getPColumns();
  if (treeNodesWithClonesColumns === undefined) return undefined;

  const treeNodesUniqueIsotypeColumns = ctx.outputs
    ?.resolve("treeNodesUniqueIsotype")
    ?.getPColumns();
  if (treeNodesUniqueIsotypeColumns === undefined) return undefined;

  const soiResultColumns = (
    ctx.outputs?.resolve("soiNodesResults")?.mapFields((_, v) => v?.getPColumns() ?? []) ?? []
  ).flatMap((a) => a);

  const targetColumns = [
    ...treeNodesColumns,
    ...treeNodesWithClonesColumns,
    ...treeNodesUniqueIsotypeColumns,
    ...soiResultColumns,
  ];

  return targetColumns;
}

const InBasketPColumnName = "pl7.app/dendrogram/inBasket";

// Classification of why a PColumnSpec might fail SHM trees' clns filter,
// or 'eligible' if it passes. Used by datasetOptions (boolean eligibility) and
// by infoMessage (cause-specific user messages).
type ClnsClassification =
  | "eligible"
  | "not-clns"
  | "axes-mismatch"
  | "cdr3-only"
  | "missing-annotation";

function classifyClnsSpec(spec: PColumnSpec, sampleAxisId: AxisId): ClnsClassification {
  if (spec.name !== "mixcr.com/clns") return "not-clns";
  if (!matchAxesId([sampleAxisId], spec.axesSpec)) return "axes-mismatch";
  const af = spec.annotations?.["mixcr.com/assemblingFeature"];
  if (af === undefined) return "missing-annotation";
  if (af === "CDR3" || af === "[CDR3]") return "cdr3-only";
  const cfoe = spec.annotations?.["mixcr.com/coveredFeaturesOnExport"];
  if (cfoe === undefined || cfoe === "") return "missing-annotation";
  return "eligible";
}

// Boolean wrapper around classifyClnsSpec for datasetOptions, which only cares
// about the binary outcome.
function isEligibleClnsSpec(spec: PColumnSpec, sampleAxisId: AxisId): boolean {
  return classifyClnsSpec(spec, sampleAxisId) === "eligible";
}

type BasketColumns = {
  allColumns: PColumn<PColumnValues>[];
  perBasket: Record<PlId, PColumn<PColumnValues>>;
};

function basketColumns(ctx: RenderCtx<BlockArgs, BlockData>): BasketColumns | undefined {
  const treeNodesWithClonesColumns = ctx.outputs?.resolve("treeNodesWithClones")?.getPColumns();
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
      ? [id.donorId, id.treeId, Number(id.subtreeId!), id.nodeId]
      : [id.donorId, id.treeId, id.nodeId];

  const columns: PColumn<PColumnValues>[] = [];
  const columnPerBasket: Record<PlId, PColumn<PColumnValues>> = {};

  for (const basket of ctx.data.baskets) {
    const inBasketSpec: PColumnSpec = {
      kind: "PColumn",
      name: InBasketPColumnName,
      valueType: "Int",
      domain: {
        "pl7.app/dendrogram/basket": basket.id,
      },
      annotations: {
        "pl7.app/label": `In ${basket.name}`,
      },
      axesSpec,
    };
    const col: PColumn<PColumnValues> = {
      id: basket.id as string as PObjectId,
      spec: inBasketSpec,
      data: basket.nodes.map((id) => ({
        key: toKey(id),
        val: 1,
      })),
    };
    columns.push(col);
    columnPerBasket[basket.id] = col;
  }

  return { allColumns: columns, perBasket: columnPerBasket };
}

// createPlDataTable (v3) takes column *variants* built from ColumnSnapshots, not
// raw PColumns. This block builds its tables from resolved accessor columns plus
// synthetic in-basket columns, so wrap them through an ArrayColumnProvider /
// ColumnCollectionBuilder to get snapshots (ArrayColumnProvider derives each
// column's data status automatically), then tag core columns via `isPrimary`.
function tableColumnVariants(
  ctx: RenderCtx<BlockArgs, BlockData>,
  pColumns: PColumn<PColumnDataUniversal>[],
  isPrimary: (spec: PColumnSpec) => boolean,
) {
  const collection = new ColumnCollectionBuilder(ctx.getService("pframeSpec"))
    .addSource(new ArrayColumnProvider(pColumns))
    .build();
  if (collection === undefined) return undefined;
  const snapshots = collection.findColumns();
  collection.dispose();
  return snapshots.map((column) => ({ column, isPrimary: isPrimary(column.spec) }));
}

const dataModel = new DataModelBuilder()
  .from<BlockData>("v1")
  .upgradeLegacy<BlockArgs, LegacyUiState>(({ args, uiState }) => ({
    ...args,
    treeTableState: uiState.treeTableState,
    dendrograms: (uiState.dendrograms ?? []).map((d) => ({
      ...d,
      tableState: d.tableState.tableState,
    })),
    baskets: (uiState.baskets ?? []).map((b) => ({
      ...b,
      tableState: b.tableState.tableState,
    })),
  }))
  .init(() => ({
    datasetColumns: [],
    treeTableState: createPlDataTableStateV2(),
    dendrograms: [],
    baskets: [],
  }));

export const model = BlockModelV3.create(dataModel)

  // Projects the workflow arguments out of the unified block data. Throwing here
  // marks the block as not-runnable, the V3 replacement for the old argsValid:
  // a run requires a donor column and datasets, and is locked once dendrograms
  // or baskets exist (re-running would orphan those derived artifacts).
  .args((data) => {
    if (data.donorColumn === undefined) throw new Error("Donor column is required");
    if (data.datasetColumns.length === 0) throw new Error("At least one dataset is required");
    if ((data.dendrograms?.length ?? 0) > 0 || (data.baskets?.length ?? 0) > 0)
      throw new Error("Block is locked: clear dendrograms and baskets before re-running");
    return {
      donorColumn: data.donorColumn,
      datasetColumns: data.datasetColumns,
      downsampling: data.downsampling,
      sequencesOfInterest: data.sequencesOfInterest,
      datasetsTitles: data.datasetsTitles,
      perProcessMemGB: data.perProcessMemGB,
      perProcessCPUs: data.perProcessCPUs,
    };
  })

  // for debuginf: specs for all available columns
  // .output('allColumns', (ctx) =>
  //   ctx.resultPool
  //     .getSpecsFromResultPool()
  //     .entries.filter((v) => isPColumnSpec(v.obj))
  //     .map( (v) => v.obj as PColumnSpec )
  // )

  .output("calculating", (ctx) => ctx.outputs?.getIsReadyOrError() === false)

  // select metadata columns
  .retentiveOutput("donorOptions", (ctx) =>
    ctx.resultPool.getOptions((spec) => {
      if (!isPColumnSpec(spec)) return false;
      if (spec.name === "pl7.app/metadata") return true;
      return (
        spec.name === "pl7.app/label" &&
        spec.axesSpec.length === 1 &&
        spec.axesSpec[0].name === "pl7.app/sampleId"
      );
    }),
  )

  // selected all dataset options that have the same axis as selected metadata column
  .retentiveOutput("datasetOptions", (ctx) => {
    if (ctx.data.donorColumn === undefined) return undefined;

    const donorColumn = ctx.data.donorColumn;
    const donorColumnSpec = ctx.resultPool.getSpecByRef(donorColumn);
    if (donorColumnSpec === undefined || !isPColumnSpec(donorColumnSpec)) return undefined;
    // donorOptions accepts pl7.app/metadata without enforcing axesSpec.length;
    // guard against an axis-less metadata column so getAxisId() never sees undefined.
    if (donorColumnSpec.axesSpec.length === 0) return undefined;

    const sampleAxisId = getAxisId(donorColumnSpec.axesSpec[0]);

    return deriveLabels(
      ctx.resultPool
        .getSpecs()
        .entries.filter(isPColumnSpecResult)
        .filter(({ obj: spec }) => isEligibleClnsSpec(spec, sampleAxisId)),
      (v) => v.obj,
      { addLabelAsSuffix: true, includeNativeLabel: true },
    ).map(
      ({ value: { ref, obj: spec }, label }) =>
        ({
          ref,
          label,
          assemblingFeature: spec.annotations!["mixcr.com/assemblingFeature"]!,
        }) as DatasetOption,
    );
  })

  .output("infoMessage", (ctx) => {
    // NOTE: while the result pool is still propagating clns p-columns (e.g. an
    // upstream clonotyping block is still running), this output will briefly
    // evaluate to the empty-state message before clearing once eligible specs
    // arrive. The user-facing message accounts for this — no extra UI gating needed.
    if (ctx.data.donorColumn === undefined) return undefined;

    const donorColumnSpec = ctx.resultPool.getSpecByRef(ctx.data.donorColumn);
    if (donorColumnSpec === undefined || !isPColumnSpec(donorColumnSpec)) return undefined;
    if (donorColumnSpec.axesSpec.length === 0) return undefined;

    const sampleAxisId = getAxisId(donorColumnSpec.axesSpec[0]);

    // Stale-selections case: dataset slots are filled, but none of the selected
    // refs is still eligible under the current donor (e.g. donor was switched).
    if (ctx.data.datasetColumns.length > 0) {
      const anySelectedEligible = ctx.data.datasetColumns.some((ref) => {
        const spec = ctx.resultPool.getSpecByRef(ref);
        return spec !== undefined && isPColumnSpec(spec) && isEligibleClnsSpec(spec, sampleAxisId);
      });
      if (anySelectedEligible) return undefined;
      return (
        "Selected datasets are incompatible with this donor column. " +
        "Clear them or switch back to the previous donor."
      );
    }

    // No datasets selected. Classify every clns spec in the pool so the message
    // names the actual reason ineligibility, not just "CDR3".
    const clnsSpecs = ctx.resultPool
      .getSpecs()
      .entries.filter(isPColumnSpecResult)
      .map(({ obj: spec }) => spec)
      .filter((spec) => spec.name === "mixcr.com/clns");

    if (clnsSpecs.length === 0) {
      return "No clonotype data yet. Add a clonotyping block upstream.";
    }

    const classifications = clnsSpecs.map((spec) => classifyClnsSpec(spec, sampleAxisId));
    if (classifications.includes("eligible")) return undefined;

    const causes = new Set(classifications);

    if (causes.size === 1) {
      const [onlyCause] = [...causes];
      switch (onlyCause) {
        case "axes-mismatch":
          return (
            "Available clonotype data uses a different sample axis than this donor column. " +
            "Pick a donor column from the same dataset as your clonotyping."
          );
        case "cdr3-only":
          return (
            "SHM trees needs an assembling feature broader than CDR3 (e.g. VDJRegion). " +
            "The list refreshes after each clonotyping run."
          );
        case "missing-annotation":
          return (
            "Available clonotype data lacks metadata SHM trees needs. " +
            "Re-run clonotyping with a current version."
          );
        case "eligible":
        case "not-clns":
          // Defensively unreachable: 'eligible' was excluded above, and clnsSpecs
          // was already pre-filtered to spec.name === 'mixcr.com/clns'. If either
          // ever appears here, suppress the message rather than emit a misleading
          // mixed-causes fallback.
          return undefined;
        default: {
          // Compile-time exhaustiveness guard: adding a new ClnsClassification
          // variant must add a case here.
          const _exhaustive: never = onlyCause;
          void _exhaustive;
        }
      }
    }

    // Mixed causes — pool has clns that fail for different reasons. Fall back
    // to a generic message that covers the dominant remediation paths.
    return (
      "Available clonotype data is incompatible with this donor column. " +
      "SHM trees needs an assembling feature broader than CDR3 (e.g. VDJRegion) " +
      "on a matching sample axis."
    );
  })

  .output("treeNodes", (ctx) => {
    const treeNodes = ctx.outputs?.resolve("treeNodes")?.getPColumns();
    if (treeNodes === undefined) return undefined;
    return treeNodes.map((col) => col.spec);
  })
  .output("treeNodesWithClones", (ctx) => {
    const treeNodesWithClones = ctx.outputs?.resolve("treeNodesWithClones")?.getPColumns();
    if (treeNodesWithClones === undefined) return undefined;
    return treeNodesWithClones.map((col) => col.spec);
  })
  .output("treeNodesUniqueIsotype", (ctx) => {
    const treeNodesUniqueIsotype = ctx.outputs?.resolve("treeNodesUniqueIsotype")?.getPColumns();
    if (treeNodesUniqueIsotype === undefined) return undefined;
    return treeNodesUniqueIsotype.map((col) => col.spec);
  })

  .outputWithStatus("trees", (ctx) => {
    const pCols = ctx.outputs?.resolve("trees")?.getPColumns();
    if (pCols === undefined) return undefined;

    const soiResultColumns = (
      ctx.outputs?.resolve("soiTreesResults")?.mapFields((_, v) => v?.getPColumns() ?? []) ?? []
    ).flatMap((a) => a);

    const columns = tableColumnVariants(ctx, [...pCols, ...soiResultColumns], () => true);
    if (columns === undefined) return undefined;

    return createPlDataTable(ctx, {
      columns,
      tableState: ctx.data.treeTableState,
    });
  })

  .output("treeColumnSpec", (ctx) => {
    const pCols = ctx.outputs?.resolve("trees")?.getPColumns();
    if (pCols === undefined || pCols.length === 0) return undefined;
    return pCols[0].spec;
  })

  .outputWithStatus("treeNodesPFrame", (ctx) => {
    const cols = treeNodesColumns(ctx);
    if (cols === undefined) return undefined;
    return createPFrameForGraphs(ctx, cols);
  })

  .outputWithStatus("treeNodesUniqueIsotypePFrame", (ctx) => {
    const cols = treeNodesColumns(ctx);
    if (cols === undefined) return undefined;
    return createPFrameForGraphs(ctx, cols);
  })

  .output("treeNodesPerTree", (ctx) => {
    const columns = treeNodesColumns(ctx);
    const bColumns = basketColumns(ctx);
    if (columns === undefined || bColumns === undefined) return undefined;

    const result: Record<string, PlDataTableModel> = {};

    const isCoreSpec = (spec: PColumnSpec) =>
      spec.name !== InBasketPColumnName &&
      spec.axesSpec.find((a) => a.name === "pl7.app/vdj/cloneId") !== undefined;

    const coreColumn = columns.find((c) => isCoreSpec(c.spec));

    const columnVariants = tableColumnVariants(
      ctx,
      [...columns, ...bColumns.allColumns],
      isCoreSpec,
    );
    if (columnVariants === undefined) return undefined;

    for (const tree of ctx.data.dendrograms) {
      const t = createPlDataTable(ctx, {
        columns: columnVariants,
        tableState: tree.tableState,
        primaryJoinType: "inner",
        filters: treeNodesFilterSpec(coreColumn!.spec, { ...tree, subtreeId: undefined }),
      });

      if (t) result[tree.id] = t;
    }

    return result;
  })

  .output("treeNodesPerBasket", (ctx) => {
    const columns = treeNodesColumns(ctx);
    const bColumns = basketColumns(ctx);
    if (columns === undefined || bColumns === undefined) return undefined;

    const result: Record<string, PlDataTableModel> = {};

    for (const basket of ctx.data.baskets) {
      const columnVariants = tableColumnVariants(
        ctx,
        [...columns, bColumns.perBasket[basket.id]!],
        (spec) => spec.name === InBasketPColumnName,
      );
      if (columnVariants === undefined) continue;

      const t = createPlDataTable(ctx, {
        columns: columnVariants,
        tableState: basket.tableState,
        primaryJoinType: "inner",
      });

      if (t) result[basket.id] = t;
    }

    return result;
  })

  /** Donor ids for which we have at least one dataset to analyze */
  .output("targetDonorIds", (ctx) => {
    const alleleReports = ctx.outputs?.resolve({
      field: "allelesReports",
      assertFieldType: "Input",
    });
    if (alleleReports === undefined) return undefined;
    const reports = parseResourceMap(alleleReports, (acc) => acc.getFileContentAsString(), true);

    const resultSet = new Set<string>(reports.data.map((r) => r.key[0] as string));
    return [...resultSet];
  })

  .output("allelesReports", (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: "allelesReports", assertFieldType: "Input" }),
      (acc) => acc.getFileHandle(),
      false,
    ),
  )

  .output("treesReports", (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: "treesReports", assertFieldType: "Input" }),
      (acc) => acc.getFileHandle(),
      false,
    ),
  )

  .output("allelesReportsJson", (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: "allelesReportsJson", assertFieldType: "Input" }),
      (acc) => acc.getFileHandle(),
      false,
    ),
  )

  .output("treesReportsJson", (ctx) =>
    parseResourceMap(
      ctx.outputs?.resolve({ field: "treesReportsJson", assertFieldType: "Input" }),
      (acc) => acc.getFileHandle(),
      false,
    ),
  )

  .output("allelesLogs", (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: "allelesLogs", assertFieldType: "Input" }),
          (acc) => acc.getLogHandle(),
          false,
        )
      : undefined;
  })

  .output("treesLogs", (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: "treesLogs", assertFieldType: "Input" }),
          (acc) => acc.getLogHandle(),
          false,
        )
      : undefined;
  })

  .output("allelesProgress", (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: "allelesLogs", assertFieldType: "Input" }),
          (acc) => acc.getProgressLog(ProgressPrefix),
          false,
        )
      : undefined;
  })

  .output("treesProgress", (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolve({ field: "treesLogs", assertFieldType: "Input" }),
          (acc) => acc.getProgressLog(ProgressPrefix),
          false,
        )
      : undefined;
  })

  .output("vjColumns", (ctx) => {
    const cols = ctx.outputs?.resolve("treeNodes")?.getPColumns();
    if (cols === undefined) return undefined;

    return cols.filter((col) => col.spec.name === "pl7.app/vdj/geneHit").map((col) => col.id);
  })

  .output("soiReady", (ctx) => ctx.outputs?.resolve("soiNodesResults")?.getIsReadyOrError())

  .output("started", (ctx) => ctx.outputs !== undefined)

  .output("done", (ctx) => {
    return ctx.outputs !== undefined
      ? parseResourceMap(
          ctx.outputs?.resolveInput("shmt", "data"),
          (acc) => acc.getIsReadyOrError() === true,
          false,
        )
          .data.filter((e) => e.value)
          .map((e) => e.key[0] as string)
      : undefined;
  })

  .sections((ctx) => {
    const dendroSectionsRaw = (ctx.data?.dendrograms ?? []).map((gs) => ({
      type: "link" as const,
      href: `/dendrogram?id=${gs.id}` as const,
      label: gs.state.title,
    }));
    const dendroSections =
      dendroSectionsRaw.length === 0 ? [] : [{ type: "delimiter" as const }, ...dendroSectionsRaw];

    const basketSectionsRaw = (ctx.data?.baskets ?? []).map((b) => ({
      type: "link" as const,
      href: `/basket?id=${b.id as string}` as const,
      label: b.name,
    }));
    const basketSections =
      basketSectionsRaw.length === 0 ? [] : [{ type: "delimiter" as const }, ...basketSectionsRaw];

    return [
      { type: "link", href: "/", label: "Analysis Overview" },
      { type: "link", href: "/soi", label: "Sequence Search" },
      { type: "link", href: "/trees", label: "Trees Table" },
      ...dendroSections,
      ...basketSections,
    ];
  })

  .title((ctx) =>
    ctx.data.datasetsTitles
      ? `MiXCR SHM Trees - ${ctx.data.datasetsTitles.join("-")}`
      : "MiXCR SHM Trees",
  )

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;

export * from "./progress";
export * from "./soi";
export * from "./tree_filter";
