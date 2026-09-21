---
'@platforma-open/milaboratories.mixcr-shm-trees.workflow': minor
'@platforma-open/milaboratories.mixcr-shm-trees': minor
---

Fix the out-of-memory kill in the by-nodes deduplication step

The ptabler run in `ensureUniqueness` asked for no memory at all, so the backend gave
it the medium-queue default of 1 GiB and the k8s job template turned that into a hard
limit (pod requests == limits). Polars was killed by the kernel while reading the
tree-nodes TSV, which surfaced as `Exited with code -1` with no log output. The
previous ptransform implementation streamed, so the missing request never mattered.

- `@platforma-sdk/workflow-tengo` 6.7.1 -> 6.11.0. From 6.8.0 a `pt` workflow with no
  explicit `mem()`/`cpu()` is sized from its input volume; 6.11.0 sets that to
  `between(2 GiB + 6 * size, 2 GiB, 256 GiB)`, fitted on the `concat + aggregate with
  max_by` plan shape this step runs. The run stays unsized so it tracks the input.
- Drop `maintainOrder` from the by-nodes `unique`. It only fixes the order of the
  surviving rows, which the axis-keyed import never reads, and it blocks the Polars
  streaming engine. `keep: "first"` is kept, so which row survives does not change.
