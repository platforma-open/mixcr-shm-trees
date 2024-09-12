import { platforma } from '@milaboratory/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@milaboratory/sdk-vue';
import SettingsPage from './SettingsPage.vue';

export const sdkPlugin = defineApp(platforma, () => {
  return {
    routes: {
      '/': SettingsPage
    }
  };
});

export const useApp = sdkPlugin.useApp;
