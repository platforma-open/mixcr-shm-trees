---
'@platforma-open/milaboratories.mixcr-shm-trees.model': patch
'@platforma-open/milaboratories.mixcr-shm-trees.ui': patch
---

MILAB-6319: surface a model-side info message when the selected donor column has no eligible clonotype datasets, and keep the "Add dataset" dropdown visible. Previously the dropdown would disappear silently and the block could not be run; the user is now told why (e.g. clonotyping assembled with CDR3 only, or upstream still running).
