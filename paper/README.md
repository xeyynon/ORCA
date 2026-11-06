# Paper: IEEE conference version

`main.tex` is the 8-page IEEE conference version (IEEEtran) of the long draft in `MD/paper_draft.md`.

## Compile

- **Overleaf (easiest):** zip this folder (`main.tex`, `references.bib`, `figures/`), then *New project → Upload project*. Overleaf supplies IEEEtran.
- **Locally:** `pdflatex main`, `bibtex main`, `pdflatex main`, `pdflatex main` (TeX Live or MiKTeX), or `tectonic -X compile main.tex`.

`main.pdf` is compiled: **7 pages** in IEEE two-column format, with 7 figures (2 double-column), 5 tables and 40 references.

It was last built with MiKTeX pdfLaTeX (IEEEtran's own Times). Tectonic (XeLaTeX) uses TeX Gyre Termes instead; the page count may shift slightly.

## Figures and tables

Captions are short titles, and tables use a full grid with a bold header row, following the reference paper (*Ensemble Learning with DenseNet201 for Accurate Maize Leaf Disease Classification*). The detail that used to be in each caption is in the sentence that cites the figure.

| | Title |
|---|---|
| Fig. 1 | Conjunction-Assessment Pipeline and the Experiment at Each Stage |
| Fig. 2 | Position Difference from SGP4 over Propagation Time |
| Fig. 3 | Screening Runtime of Brute Force and k-d Tree |
| Fig. 4 | Screening Recall by Relative Velocity |
| Fig. 5 | Miss-Distance Error versus Cost of TCA Methods |
| Fig. 6 | Ratio of ORCA's Pc to Foster's Pc |
| Fig. 7 | Monte Carlo Convergence of Pc |
| Table I | Dataset and Experimental Environment |
| Table II | Experiment Design: Methods Compared and Reference |
| Table III | End-to-End Comparison of the As-Built and Corrected Pipelines |
| Table IV | HIGH and CRITICAL Events per Seed under Each Pc Setting |
| Table V | Summary of Evaluation Metrics |

`figures_named/` holds standalone copies for slides and reports: each figure with "Fig. N. Title" drawn on it, and each table rendered as an image, as PNG (300 dpi) and PDF. The paper itself uses `figures/`, whose images carry no title, so the name is not printed twice.

## Evaluation metrics

§IV-D defines the eight metrics (position error, TCA error, miss-distance error, runtime, candidate reduction, speedup, Pc difference, risk-classification agreement); Table V gives their values. Candidate reduction and tier agreement were computed from the committed CSVs, not by a benchmark script; the derivation is in `MD/research_paper_brief.md` §10.

To rebuild with Tectonic: `tectonic -X compile main.tex`.

## Where the content comes from

- **Numbers:** every number traces to a file in `benchmarks/results/`. The mapping is in `MD/research_paper_brief.md` §10.
- **Figures:** copied from `benchmarks/figures/` (regenerate with `python benchmarks/figures.py`).
- **References:** `references.bib` is a copy of `MD/references.bib`; verification status is in `MD/literature_verification.md`.

## Before submission

1. **Authors:** check the names and order; fill in department, university and e-mail (`TODO` in `main.tex`).
2. **Template:** confirm the conference template and page limit, including whether references count. The reference paper uses Springer LNCS (`llncs`, "Table 1." captions); this paper uses IEEEtran ("TABLE I"). Switching changes the layout and page count.
3. **References:** re-check the entries marked SECONDARY in `references.bib`.
4. **Snapshots:** archive the TLE snapshots (`benchmarks/data/*.tle`, git-ignored) somewhere citable, and cite their sha256 values from the `.json` manifests.
5. **Covariance:** after more daily snapshots (`benchmarks/refresh_measured.ps1`), refresh the measured-covariance numbers in §V-A and Table IV.
