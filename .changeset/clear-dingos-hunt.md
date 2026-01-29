---
'@platforma-open/milaboratories.mixcr-shm-trees.workflow': patch
---

Upgrade MiXCR and improve resource management

- Upgrade MiXCR to 4.7.0-291-develop (includes fix for "Some of the subtrees have the same root" crash in findShmTrees)
- Switch to memory-from-limits entrypoint for proper memory management
- Add default 12GiB memory limit for all export operations (can be overridden via perProcessMemGB)
- Set 2 CPUs for all export operations
