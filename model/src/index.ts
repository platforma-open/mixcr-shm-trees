import {
  BlockModel,
  PColumnSpec,
  Ref,
  Option,
  InferOutputsType,
  PlDataTableState,
  isPColumn,
  isPColumnSpec,
  PTableRecordSingleValueFilter
} from '@platforma-sdk/model';
import { string } from 'zod';

/**
 * Block arguments coming from the user interface
 */
export type BlockArgs = {
  donorColumn?: Ref;
  datasetColumns: (Ref | null)[];
};

export type TreeSelection = {
  donor?: string,
  treeId?: number
}

export type UiState = {
  treeTableState?: PlDataTableState;
  treeSelectionForTreeNodesTable: TreeSelection
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
    const pCols = ctx.outputs?.resolve('trees')?.getPColumns();
    if (pCols === undefined) return undefined;
    return ctx.createPTable({
      columns: pCols,
      filters: ctx.uiState?.treeTableState?.pTableParams?.filters ?? [],
      sorting: ctx.uiState?.treeTableState?.pTableParams?.sorting ?? []
    });
  })

  // .output('treeNodes', (ctx) => {
  //   const pCols = ctx.outputs?.resolve('treeNodes')?.getPColumns();
  //   if (pCols === undefined) return undefined;
  //   const someCol = pCols![0];

  //   const donors = someCol.data.listInputFields().map((o) => (JSON.parse(o) as string[])[0]);

  //   const donor = donors[0];

  //   const filters = ctx.uiState?.treeNodesTableState?.pTableParams?.filters ?? [];

  //   filters.push({
  //     type: 'bySingleColumn',
  //     column: {
  //       type: 'axis',
  //       id: someCol.spec.axesSpec[0]
  //     },
  //     predicate: {
  //       operator: 'Equal',
  //       reference: donor
  //     }
  //   });

  //   filters.push({
  //     type: 'bySingleColumn',
  //     column: {
  //       type: 'axis',
  //       id: someCol.spec.axesSpec[1]
  //     },
  //     predicate: {
  //       operator: 'Equal',
  //       reference: 1
  //     }
  //   });

  //   return ctx.createPTable({
  //     columns: pCols,
  //     filters: filters,
  //     sorting: ctx.uiState?.treeNodesTableState?.pTableParams?.sorting ?? []
  //   });
  // })

  .output('treeNodes', (ctx) => {
    const pCols = ctx.outputs?.resolve('treeNodes')?.getPColumns();
    if (pCols === undefined) return undefined;
    
    return ctx.createPFrame(pCols);
  })

  .output('temp', (ctx) => {
    return {
      trees: {
        fields: ctx.outputs?.resolve('trees')?.listInputFields(),
        columns: ctx.outputs
          ?.resolve('trees')
          ?.getPColumns()
          ?.map((o) => ({
            spec: o.spec,
            resourseType: o.data.resourceType,
            data: o.data.getDataAsJson()
          }))
      },
      treesWithNodes: {
        fields: ctx.outputs?.resolve('treeNodes')?.listInputFields(),
        columns: ctx.outputs
          ?.resolve('treeNodes')
          ?.getPColumns()
          ?.map((o) => ({
            spec: o.spec,
            resourseType: o.data.resourceType,
            data: o.data.getDataAsJson()
          }))
      }
    };
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
    { type: 'link', href: '/treeNodes', label: 'Tree Nodes Table' }
  ])

  .done();

export type BlockOutputs = InferOutputsType<typeof platforma>;
