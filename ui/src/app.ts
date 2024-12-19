import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import TreePage from './pages/TreePage.vue';
import TreeTablePage from './pages/TreeTablePage.vue';
import SOIPage from './pages/SOIPage.vue';

export const sdkPlugin = defineApp(
  model,
  (app) => {
    return {
      progress: () => app.model.outputs.calculating,
      routes: {
        '/': () => MainPage,
        '/soi': () => SOIPage,
        '/trees': () => TreeTablePage,
        // '/treeNodes': () => TreeNodesTablePage,
        '/dendrogram': (a) => TreePage
      }
    };
  },
  {
    debug: true,
    deepPatchModel: true
  }
);

export const useApp = sdkPlugin.useApp;
