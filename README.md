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

ithin a B-cell clone, sequences are not independent observations — they are branches of a single evolutionary history. Somatic hypermutation and selection produce a family of related variants descending from one naive ancestor. Ranking those variants by abundance alone discards that structure.

The block groups clonotypes into clonal families per donor, infers the lineage tree for each, and reports where every sequence sits in it. Trees include both observed clonotypes and inferred ancestral nodes, so you can see reconstructed intermediates that were never sequenced — including the most recent common ancestor (MRCA) of a branch.

Each node carries mutation and maturation metrics: distance from germline and from its parent, nucleotide and amino acid mutation rates, and mutation counts measured both against germline and against the MRCA. Nodes also carry V and J gene assignments with identity, IG isotype, abundance (reads, molecules, or cells), and a flag for whether the node was observed in the data or inferred.

Trees are explored as interactive dendrograms alongside a sortable trees table. Two features go beyond visualization:

* **Sequence Search** — supply a list of known sequences, nucleotide or amino acid, targeting CDR3 or the full VDJRegion, and locate them within the trees. Search either by alignment within a dissimilarity threshold, or by allowing a set number of mismatches (1–4), with or without indels. This answers "where does my known antibody sit in this lineage, and what else is on its branch?"
* **Baskets** — collect nodes of interest across trees into named sets, which become columns downstream blocks can filter and rank on.

## Inputs & outputs

* **Input:** a MiXCR clonotype dataset (`.clns`) from [MiXCR Clonotyping](https://github.com/platforma-open/mixcr-clonotyping), [MiXCR Amplicon Alignment](https://github.com/platforma-open/mixcr-amplicon-alignment), [MiXCR scFv Alignment](https://github.com/platforma-open/mixcr-scfv-clonotyping), or [Cellecta DriverMap AIR](https://github.com/platforma-open/cellecta-drivermap-air-mixcr-clonotyping) — bulk or single-cell BCR — assembled by a feature broader than CDR3, such as VDJRegion. A donor metadata column is also required, since trees are built within a donor. Several datasets can be combined under one donor column.
* **Output:** per-donor SHM lineage trees with per-node mutation, maturation, isotype, and abundance metrics; interactive dendrograms; a trees table; sequence-search results; and baskets exported as columns for downstream blocks.

## Specifications

| | |
|---|---|
| Block title in app | MiXCR SHM Trees |
| Engine | [MiXCR](https://mixcr.com/) `findShmTrees` |
| Data types | Bulk and single-cell BCR repertoires |
| Input requirement | MiXCR `.clns` data assembled by a feature broader than CDR3 (e.g. VDJRegion); CDR3-only assemblies cannot be used |
| Grouping | Per donor, via a donor metadata column; multiple datasets can be combined |
| Node metrics | Distance from germline, distance from parent, nt and aa mutation rates, nt and aa mutations vs germline and vs MRCA, V/J gene and identity, IG isotype, reads / molecules / cells, observed vs inferred |
| Sequence search | Nucleotide or amino acid, against CDR3 or VDJRegion; alignment-based dissimilarity threshold or 1–4 mismatches, with or without indels |
| Downsampling | For bulk datasets — by reads, molecules, or clonotypes, as a count or percentage |

## Use cases

* **Antibody discovery:** trace clonal lineages and identify affinity-matured candidates rather than picking on abundance alone.
* **In vivo campaigns:** follow B-cell clonal evolution across timepoints after immunization, combining several datasets under one donor.
* **Affinity maturation:** quantify the somatic mutations accumulated along a lineage, measured from germline or from the MRCA of a branch.
* **Class switching:** read IG isotype per node to see where isotype transitions occur within a lineage.
* **Locating a known antibody:** use Sequence Search to place a characterized sequence in its tree and inspect its relatives — nearby variants are often worth testing.
* **Ancestral intermediates:** inspect inferred nodes to recover sequences that were never observed but sit on the path to a matured variant.
* **Vaccine research:** study lineage evolution and the antibody response over the course of a regimen.

## FAQ

### What is an SHM tree?

A lineage tree for one B-cell clone. Nodes are antibody sequences, edges are somatic mutations, and the root is the inferred naive ancestor. It shows how the members of a clonal family are related, which abundance tables cannot.

### Can I use data from a non-MiXCR source?

No. Tree building operates on MiXCR's `.clns` alignments, so the input must come from a MiXCR-based block. Datasets brought in through Import V(D)J Data do not carry the alignments this requires.

### Why do I have to select a donor column?

Clonal lineages exist within an individual — sequences from different donors are not clonally related, so trees must be built per donor. Selecting the donor column also lets you combine several datasets, such as multiple timepoints from the same subject, into one set of trees.

### Does it work on single-cell data?

Yes. Bulk and single-cell BCR repertoires are both supported; single-cell nodes report cell counts alongside the mutation metrics.

### What are inferred nodes?

Reconstructed ancestral sequences that were not observed in the data but must have existed to explain the observed variants. Each node carries an "observed in data" flag so you can tell them apart. Inferred sequences — the MRCA in particular — are often interesting candidates in their own right.

### How do I find a specific antibody in the trees?

Use the Sequence Search page. Provide the sequence or a list of them, choose CDR3 or VDJRegion as the target and nucleotide or amino acid as the alphabet, then set the tolerance — either a percentage dissimilarity for alignment-based search, or 1–4 mismatches, optionally allowing indels.

### What is a basket?

A named collection of tree nodes you assemble while exploring. Baskets become columns in the project, so a selection made visually can be carried into downstream blocks for filtering, ranking, or export.


## Citation

MiXCR is developed by MiLaboratories Inc. If you use this block in your research, please cite:

> Bolotin, D. A., Poslavsky, S., Mitrophanov, I., Shugay, M., Mamedov, I. Z., Putintseva, E. V., & Chudakov, D. M. (2015). MiXCR: software for comprehensive adaptive immunity profiling. *Nature Methods* **12**(5), 380–381. [https://doi.org/10.1038/nmeth.3364](https://doi.org/10.1038/nmeth.3364)


## Part of the Platforma ecosystem

This block is part of [Platforma](https://platforma.bio/) by [MiLaboratories](https://github.com/milaboratory), the team behind [MiXCR](https://mixcr.com/). Explore the other open-source blocks at [github.com/platforma-open](https://github.com/platforma-open) and the docs for antibody discovery at [docs.platforma.bio/biology-guides/antibody-discovery](https://docs.platforma.bio/biology-guides/antibody-discovery/).
