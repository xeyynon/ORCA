# Paper: IEEE conference version

`main.tex` is the 8-page IEEE conference version (IEEEtran) of the long draft in `MD/paper_draft.md`.

## Compile

- **Overleaf (easiest):** zip this folder (`main.tex`, `references.bib`, `figures/`), then *New project → Upload project*. Overleaf supplies IEEEtran.
- **Locally:** `pdflatex main`, `bibtex main`, `pdflatex main`, `pdflatex main`. Needs TeX Live or MiKTeX with IEEEtran; this machine has no TeX installation.

The PDF has not been compiled yet, so the page count is an estimate: about 2,400 words of running text, 7 figures (2 double-column), 4 tables and 40 references, which should come to about 7 pages in IEEE two-column format. Check the count after the first compile and trim §V if needed.

## Where the content comes from

- **Numbers:** every number traces to a file in `benchmarks/results/`. The mapping is in `MD/research_paper_brief.md` §10.
- **Figures:** copied from `benchmarks/figures/` (regenerate with `python benchmarks/figures.py`).
- **References:** `references.bib` is a copy of `MD/references.bib`; verification status is in `MD/literature_verification.md`.

## Before submission

1. **Authors:** check the names and order; fill in department, university and e-mail (`TODO` in `main.tex`).
2. **Template:** confirm the conference template and page limit, including whether references count.
3. **References:** re-check the entries marked SECONDARY in `references.bib`.
4. **Snapshots:** archive the TLE snapshots (`benchmarks/data/*.tle`, git-ignored) somewhere citable, and cite their sha256 values from the `.json` manifests.
5. **Covariance:** after more daily snapshots (`benchmarks/refresh_measured.ps1`), refresh the measured-covariance numbers in §V-A and Table IV.
