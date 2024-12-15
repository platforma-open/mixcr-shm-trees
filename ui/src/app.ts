import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import DendrogramPage from './pages/DendrogramPage.vue';
import TreeTablePage from './pages/TreeTablePage.vue';
import SOIPage from './pages/SOIPage.vue';

export const sdkPlugin = defineApp(model, () => {
  return {
    routes: {
      '/': () => MainPage,
      '/soi': () => SOIPage,
      '/trees': () => TreeTablePage,
      // '/treeNodes': () => TreeNodesTablePage,
      '/dendrogram': (a) => DendrogramPage
    }
  };
}, {
  debug: true,
  deepPatchModel: true
});

export const useApp = sdkPlugin.useApp;
