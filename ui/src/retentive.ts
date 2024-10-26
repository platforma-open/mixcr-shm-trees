//
// Workaround before we add access to "retentive mode" behaviour in model SDK
//

import { Ref, shallowRef, watch } from 'vue';

export function retentive<T>(
  input: Ref<T | undefined> | (() => T | undefined)
): Ref<T | undefined> {
  const result = typeof input === 'function' ? shallowRef(input()) : shallowRef(input.value);
  watch(input, (v) => {
    if (v !== undefined) result.value = v;
  });
  return result;
}
