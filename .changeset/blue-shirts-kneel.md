---
'@platforma-open/milaboratories.mixcr-shm-trees.workflow': minor
'@platforma-open/milaboratories.mixcr-shm-trees': minor
---

Replace ptransform with ptabler for all table aggregation

The by-nodes deduplication and the sequence-of-interest per-tree
aggregation now run in-process via ptabler instead of shelling out to
the ptransform binary. Integer columns are coerced back to their
declared types after the TSV read, so they are no longer float-promoted
(e.g. `192` -> `192.0`) and nulled by the Parquet importer. The
software-ptransform dependency is removed.
