import { platforma } from '@milaboratory/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@milaboratory/sdk-vue';
import SettingsPage from './SettingsPage.vue';
import TreeTablePage from './TreeTablePage.vue';
import TreeNodesTablePage from './TreeNodesTablePage.vue';

export const sdkPlugin = defineApp(platforma, () => {
  return {
    routes: {
      '/': SettingsPage,
      '/trees': TreeTablePage,
      '/treeNodes': TreeNodesTablePage
    }
  };
});

export const useApp = sdkPlugin.useApp;
