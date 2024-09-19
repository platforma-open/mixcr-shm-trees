import {
  BlockModel,
  PColumnSpec,
  Ref,
  Option,
  InferOutputsType,
  PlDataTableState,
  isPColumn,
  isPColumnSpec
} from '@milaboratory/sdk-ui';

/**
 * Block arguments coming from the user interface
 */
export type BlockArgs = {
  donorColumn?: Ref;
  datasetColumns: (Ref | null)[];
};

export type UiState = {
  treeTableState?: PlDataTableState;
  treeNodesTableState?: PlDataTableState;
};

export const platforma = BlockModel.create<BlockArgs, UiState>('Heavy')

  .initialArgs({
    datasetColumns: [null]
  })

  .output('donorColumnOptions', (ctx) => {
    return ctx.resultPool
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
      );
  })

  .output('datasetColumnOptions', (ctx) => {
    if (ctx.args.donorColumn === undefined) {
      return [];
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
            }`
          } satisfies Option)
      );
  })

  .output('allColumnSpecs', (ctx) => {
    return ctx.resultPool.getSpecsFromResultPool().entries.filter((v) => {
      return isPColumnSpec(v.obj);
    });
  })

  .output('trees', (ctx) => {
    const pCols = ctx.outputs?.resolve("trees")?.getPColumns();
    if (pCols === undefined) return undefined;
    return ctx.createPTable({
      columns: pCols,
      filters: ctx.uiState?.treeTableState?.pTableParams?.filters ?? [],
      sorting: ctx.uiState?.treeTableState?.pTableParams?.sorting ?? []
    });
  })

  .output('treeNodes', (ctx) => {
    const pCols = ctx.outputs?.resolve("treeNodes")?.getPColumns();
    if (pCols === undefined) return undefined;
    return ctx.createPTable({
      columns: pCols,
      filters: ctx.uiState?.treeNodesTableState?.pTableParams?.filters ?? [],
      sorting: ctx.uiState?.treeNodesTableState?.pTableParams?.sorting ?? []
    });
  })

  .output('temp', (ctx) => {
    return {
      fields: ctx.outputs?.resolve('trees')?.listInputFields(),
      columns: ctx.outputs?.resolve("trees")?.getPColumns()?.map((o) => ({
          spec: o.spec,
          resourseType: o.data.resourceType,
          data: o.data.getDataAsJson()
      }))
    }
  })

  .output('allelesLog', (ctx) => {
    return ctx.outputs?.resolve('allelesLog')?.listInputFields();
  })

  .output('treesLog', (ctx) => {
    return ctx.outputs?.resolve('treesLog')?.listInputFields();
  })

  .sections([
    { type: 'link', href: '/', label: 'Settings' },
    { type: 'link', href: '/trees', label: 'Trees Table' },
    { type: 'link', href: '/treeNodes', label: 'Tree Nodes Table' },
  ])

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;
