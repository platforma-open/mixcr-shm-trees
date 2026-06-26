import {
  canonicalizeJson,
  CanonicalizedJson,
  getAxisId,
  PColumnSpec,
  PlDataTableFilters,
  PlDataTableFilterSpecLeaf,
  PTableColumnId,
  PTableRecordFilter,
} from "@platforma-sdk/model";

export type FullTreeId = {
  donorId: string | number;
  treeId: number;
  subtreeId?: string;
};

export type FullNodeId = FullTreeId & {
  nodeId: number;
};

// Scoping predicates pinning a per-tree view to a single donor/tree(/subtree),
// plus "node is a real clone" (cloneId not NA). Shared by both filter builders.
type Scope = { donorId: string | number; treeId: number; subtreeId?: string };

function assertTreeAxis(anchorColumnSpec: PColumnSpec): void {
  const treeAxis = anchorColumnSpec.axesSpec[1];
  if (treeAxis.name !== "pl7.app/dendrogram/treeId")
    throw new Error(`Unexpected second axis name: ${treeAxis.name}`);
}

/**
 * PTableRecordFilter[] form — consumed by pFrameDriver.calculateTableData.
 */
export function treeNodesFilter(
  anchorColumnSpec: PColumnSpec,
  fullTreeId: Scope,
): PTableRecordFilter[] {
  assertTreeAxis(anchorColumnSpec);
  const filters: PTableRecordFilter[] = [
    {
      type: "bySingleColumnV2",
      column: { type: "axis", id: getAxisId(anchorColumnSpec.axesSpec[0]) },
      predicate: { operator: "Equal", reference: fullTreeId.donorId },
    },
    {
      type: "bySingleColumnV2",
      column: { type: "axis", id: getAxisId(anchorColumnSpec.axesSpec[1]) },
      predicate: { operator: "Equal", reference: fullTreeId.treeId },
    },
  ];

  if (fullTreeId.subtreeId !== undefined && anchorColumnSpec.axesSpec.length > 2) {
    const subtreeAxisSpec = anchorColumnSpec.axesSpec[2];
    if (subtreeAxisSpec.name !== "pl7.app/dendrogram/subtreeId")
      throw new Error(`Unexpected third axis name: ${subtreeAxisSpec.name}`);
    filters.push({
      type: "bySingleColumnV2",
      column: { type: "axis", id: getAxisId(anchorColumnSpec.axesSpec[2]) },
      predicate: { operator: "Equal", reference: fullTreeId.subtreeId },
    });
  }

  const cloneIdAxisIdx = anchorColumnSpec.axesSpec.findIndex(
    (a) => a.name === "pl7.app/vdj/cloneId",
  );
  if (cloneIdAxisIdx !== -1) {
    filters.push({
      type: "bySingleColumnV2",
      column: { type: "axis", id: { name: "pl7.app/vdj/cloneId", type: "Long" } },
      predicate: { operator: "Not", operand: { operator: "IsNA" } },
    });
  }

  return filters;
}

function axisColumn(spec: PColumnSpec, idx: number): CanonicalizedJson<PTableColumnId> {
  return canonicalizeJson<PTableColumnId>({ type: "axis", id: getAxisId(spec.axesSpec[idx]) });
}

function equalsLeaf(
  column: CanonicalizedJson<PTableColumnId>,
  value: string | number,
): PlDataTableFilterSpecLeaf {
  return typeof value === "number"
    ? { type: "equal", column, x: value }
    : { type: "patternEquals", column, value };
}

/**
 * PlDataTableFilters (v3 filter-spec AST) form — passed as createPlDataTable's
 * `filters` option, which the v3 builder concatenates into the table query.
 */
export function treeNodesFilterSpec(
  anchorColumnSpec: PColumnSpec,
  fullTreeId: Scope,
): PlDataTableFilters {
  assertTreeAxis(anchorColumnSpec);
  const filters: PlDataTableFilterSpecLeaf[] = [
    equalsLeaf(axisColumn(anchorColumnSpec, 0), fullTreeId.donorId),
    { type: "equal", column: axisColumn(anchorColumnSpec, 1), x: fullTreeId.treeId },
  ];

  if (fullTreeId.subtreeId !== undefined && anchorColumnSpec.axesSpec.length > 2) {
    const subtreeAxisSpec = anchorColumnSpec.axesSpec[2];
    if (subtreeAxisSpec.name !== "pl7.app/dendrogram/subtreeId")
      throw new Error(`Unexpected third axis name: ${subtreeAxisSpec.name}`);
    filters.push({
      type: "patternEquals",
      column: axisColumn(anchorColumnSpec, 2),
      value: fullTreeId.subtreeId,
    });
  }

  const cloneIdAxisIdx = anchorColumnSpec.axesSpec.findIndex(
    (a) => a.name === "pl7.app/vdj/cloneId",
  );
  if (cloneIdAxisIdx !== -1) {
    filters.push({
      type: "isNotNA",
      column: canonicalizeJson<PTableColumnId>({
        type: "axis",
        id: { name: "pl7.app/vdj/cloneId", type: "Long" },
      }),
    });
  }

  return { type: "and", filters };
}
