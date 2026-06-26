import { DendrogramState } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import { createPlDataTableStateV2 } from "@platforma-sdk/model";
import { useApp } from "./app";

const nextId = () => {
  const app = useApp();

  if (app.model.data.dendrograms.length > 0) {
    return String(Math.max(...app.model.data.dendrograms.map((g) => Number(g.id))) + 1);
  }
  return "1";
};

export async function addDendrogram(
  label: string,
  donorId: string | number,
  treeId: number,
  subtreeId: string | undefined,
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
      template: "dendro",
    },
    tableState: createPlDataTableStateV2(),
    tab: "Graph",
  };

  await app.updateData((data) => {
    data.dendrograms = [...(data.dendrograms ?? []), dendro];
    return data;
  });

  await app.navigateTo(`/dendrogram?id=${dendro.id}`);
}
