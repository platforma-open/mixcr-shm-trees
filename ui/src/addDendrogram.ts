import { DendrogramState } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { PValueJsonSafe, pValueToStringOrNumber, safeConvertToPValue } from '@platforma-sdk/model';

const nextId = () => {
  const app = useApp();

  if (app.model.ui.dendrograms.length > 0) {
    return String(Math.max(...app.model.ui.dendrograms.map((g) => Number(g.id))) + 1);
  }
  return '1';
};

export async function addDendrogram(
  label: string,
  donorId: string | number,
  treeId: number,
  subtreeId: string | undefined,
  vGene: string,
  jGene: string
): Promise<DendrogramState | undefined> {
  const app = useApp();

  if (!app.model.outputs.treeColumnSpec) {
    return undefined;
  }

  const dendro: DendrogramState = {
    id: nextId(),
    donorId,
    treeId,
    subtreeId,
    state: {
      title: label,
      template: 'dendro'
    }
  };

  await app.updateUiState((ui) => {
    ui.dendrograms = [...(ui.dendrograms ?? []), dendro];
    return ui;
  });

  await app.navigateTo(`/dendrogram?id=${dendro.id}`);
}
