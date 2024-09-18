import { platforma } from '@milaboratory/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@milaboratory/sdk-vue';
import SettingsPage from './SettingsPage.vue';
import TreeTablePage from './TreeTablePage.vue';

export const sdkPlugin = defineApp(platforma, () => {
  return {
    routes: {
      '/': SettingsPage,
      '/trees': TreeTablePage
    }
  };
});

export const useApp = sdkPlugin.useApp;
