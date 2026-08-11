# MiXCR SHM Trees

Build somatic hypermutation (SHM) lineage trees from antibody repertoire
sequencing data. This Platforma block reconstructs clonal relationships
between antibody sequences and visualizes how B-cell receptor (BCR) clones
diversify during somatic hypermutation and affinity maturation.

Open-source analysis block for **Platforma**, the biologics
discovery platform by **MiLaboratories** — built on **MiXCR**, the
open-source immune-repertoire toolkit. For the full no-code workflow, see
[platforma.bio](https://platforma.bio).

## What it does

The MiXCR SHM Trees block constructs **somatic hypermutation lineage trees**
from clonotype data. The trees represent relationships between antibody
sequences within a B-cell clone and can be used to study sequence
diversification, clonal evolution, and antibody affinity maturation.

The block accepts clonotype output from MiXCR or other Platforma clonotyping
blocks and generates lineage trees with mutation and maturation metrics for
individual clones.

SHM trees are useful when antibody discovery requires understanding how
sequences within a clonal family are related, rather than selecting candidates
based only on abundance or frequency.

## Inputs & outputs

- **Input:** MiXCR clonotype output (single-cell or bulk BCR repertoires) OR any clonotyping block
- **Output:** SHM lineage trees with per-clone mutation and maturation metrics

## Use cases

- **Antibody discovery:** trace antibody clonal lineages and identify
  affinity-matured candidate sequences.
- **In vivo antibody discovery:** analyze B-cell clonal evolution following
  immunization or other in vivo campaigns.
- **Affinity maturation:** characterize somatic mutations accumulated within
  antibody lineages.
- **Immune repertoire analysis:** visualize relationships between related
  BCR sequences within clonotypes.
- **Vaccine research:** study B-cell lineage evolution and antibody responses.


## Part of the Platforma ecosystem

This block is part of [Platforma](https://platforma.bio) by
[MiLaboratories](https://github.com/milaboratory), the team behind
[MiXCR](https://github.com/milaboratory/mixcr). Explore the other open-source
blocks at [github.com/platforma-open](https://github.com/platforma-open) and
the docs for antibody discovery at [https://docs.platforma.bio/biology-guides/antibody-discovery/](https://docs.platforma.bio/biology-guides/antibody-discovery/)
