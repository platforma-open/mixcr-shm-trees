---
'@platforma-open/milaboratories.mixcr-shm-trees.workflow': patch
---

Upgrade MiXCR to 4.7.0-292-develop

- Fix potential hang during "Building initial trees" step on highly connected clone clusters (adds iteration limit to Bron-Kerbosch algorithm with automatic fallback to SingleLinkage)
