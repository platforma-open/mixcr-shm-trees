---
'@platforma-open/milaboratories.mixcr-shm-trees.workflow': patch
---

Use --use-local-temp for findAlleles and findShmTrees to place temporary files in the working directory instead of /tmp, preventing silent hangs when system temp runs out of disk space
