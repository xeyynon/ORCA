"""
Paper figures, built only from committed result files in benchmarks/results/.
Run from the repo root:  python benchmarks/figures.py
Writes benchmarks/figures/<name>.pdf (for the paper) and .png (300 dpi, for review).

Style: single-column width (3.5 in), print/light only. Categorical slots 1-3 of the reference palette
(blue, orange, aqua; validated all-pairs for colour-vision deficiency). Aqua is below 3:1 contrast on
white, so every series is also labelled directly. Text stays in neutral ink, grids are recessive.
"""
import csv
import os
from collections import defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "results")
OUT = os.path.join(HERE, "figures")
SEEDS = (1, 2, 3)

BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, GRID, REF = "#0b0b0b", "#52514e", "#e4e3df", "#8a8984"

plt.rcParams.update({
    "font.family": "serif", "font.size": 8, "axes.titlesize": 8, "axes.labelsize": 8,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7,
    "text.color": INK, "axes.labelcolor": INK, "xtick.color": INK2, "ytick.color": INK2,
    "axes.edgecolor": INK2, "axes.linewidth": 0.6, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.5, "axes.spines.top": False, "axes.spines.right": False,
    "legend.frameon": False, "lines.linewidth": 1.5, "lines.markersize": 4.5,
    "savefig.dpi": 300, "savefig.bbox": "tight", "pdf.fonttype": 42,
})
W = 3.5


def read(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUT, f"{name}.{ext}"))
    plt.close(fig)
    print(f"wrote figures/{name}.pdf/.png")


def end_label(ax, x, y, text, color, dy=0):
    ax.annotate(text, (x, y), xytext=(4, dy), textcoords="offset points", va="center", color=INK, fontsize=7)


def fig_propagation():
    rows = read(os.path.join(RES, "propagation_20261014T064759Z_to_20261014T090520Z", "r1_model_consistency.csv"))
    fig, ax = plt.subplots(figsize=(W, 2.3))
    hours = sorted({float(r["hours"]) for r in rows})
    xs = np.arange(len(hours))
    for m, color, label in (("orca_engine", ORANGE, "ORCA engine (two-body + drag)"),
                            ("j2_secular", BLUE, "Two-body + J2 secular")):
        sel = {float(r["hours"]): r for r in rows if r["method"] == m}
        med = [float(sel[h]["vs_sgp4_km_median"]) for h in hours]
        p90 = [float(sel[h]["vs_sgp4_km_p90"]) for h in hours]
        ax.fill_between(xs, med, p90, color=color, alpha=0.12, linewidth=0)
        ax.plot(xs, med, "-o", color=color, label=label)
    ax.set_yscale("log")
    ax.set_xticks(xs, [f"{h:g}" for h in hours])
    ax.set_xlabel("Hours after TLE epoch")
    ax.set_ylabel("Position difference from SGP4 (km)")
    ax.legend(loc="upper left")
    ax.set_title("Median over 15,157-15,168 LEO objects; band to 90th percentile", color=INK2, loc="left")
    save(fig, "fig_propagation_r1")


def fig_recall():
    groups = {"< 1 km/s": ("0-0.1", "0.1-1"), "1-10 km/s": ("1-5", "5-10"), ">= 10 km/s": (">=10",)}
    acc = defaultdict(lambda: [0, 0])
    for s in SEEDS:
        for r in read(os.path.join(RES, f"screening_recall_n2000_h24_ref10s_seed{s}", "recall.csv")):
            if (r["population"] == "non_persistent" and float(r["radius_km"]) == 100.0
                    and float(r["miss_below_km"]) == 10.0):
                for g, bands in groups.items():
                    if r["vrel_band_kms"] in bands:
                        acc[(g, float(r["step_s"]))][0] += int(r["event_detected"])
                        acc[(g, float(r["step_s"]))][1] += int(r["events"])
    steps = sorted({k[1] for k in acc})
    fig, ax = plt.subplots(figsize=(W, 2.7))
    label_at = {"< 1 km/s": (2, 8, 4, "left"), "1-10 km/s": (1, 8, 2, "left"),
                ">= 10 km/s": (1, -6, 0, "right")}  # (point, dx, dy, ha)
    for (g, color) in zip(groups, (AQUA, BLUE, ORANGE)):
        y = [100.0 * acc[(g, s)][0] / acc[(g, s)][1] for s in steps]
        n = acc[(g, steps[0])][1]
        ax.plot(steps, y, "-o", color=color, label=f"{g}, n={n:,}")
        k, dx, dy, ha = label_at[g]
        ax.annotate(g, (steps[k], y[k]), xytext=(dx, dy), textcoords="offset points", fontsize=7, color=INK,
                    ha=ha, va="center")
    ax.set_xscale("log")
    ax.set_xticks(steps, ["20 s", "1 min", "5 min", "10 min", "30 min", "1 h"][: len(steps)] if steps == [20, 60, 300, 600, 1800, 3600] else [f"{s:g}" for s in steps])
    ax.minorticks_off()
    ax.set_xlim(steps[0] / 1.6, steps[-1] * 1.3)
    ax.set_ylim(0, 105)
    ax.set_xlabel("Screening time step (radius 100 km)")
    ax.set_ylabel("Encounters < 10 km seen in their pass (%)")
    ax.axvline(3600, color=INK2, lw=0.6, ls=":")
    ax.text(3600, 103, "ORCA", ha="center", va="bottom", fontsize=7, color=INK2)
    ax.legend(loc="upper center", bbox_to_anchor=(0.45, -0.22), ncol=3, fontsize=6.5, handlelength=1.5,
              columnspacing=1.0)
    ax.set_title("Relative velocity bands; n = encounters pooled over 3 seeds", color=INK2, loc="left")
    save(fig, "fig_screening_recall")


def fig_runtime():
    rows = read(os.path.join(RES, "screening_runtime_r100km", "runtime.csv"))
    fig, ax = plt.subplots(figsize=(W, 2.3))
    for m, color, label in (("brute_numpy", ORANGE, "Brute force (vectorised)"), ("kdtree", BLUE, "KD-tree")):
        sel = sorted((int(r["n"]), float(r["seconds_per_step_mean"]) * 1e3, float(r["seconds_per_step_sd"]) * 1e3)
                     for r in rows if r["method"] == m)
        n, mean, sd = map(np.array, zip(*sel))
        ax.errorbar(n, mean, yerr=sd, fmt="-o", color=color, label=label, capsize=2, elinewidth=0.8)
        end_label(ax, n[-1], mean[-1], f"{mean[-1]:,.0f} ms" if mean[-1] >= 10 else f"{mean[-1]:.1f} ms", color)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Catalog objects")
    ax.set_ylabel("Time per screening step (ms)")
    ax.set_xticks([1000, 2000, 4000, 8000, 16000], ["1k", "2k", "4k", "8k", "16k"])
    ax.minorticks_off()
    ax.set_xlim(800, 30000)
    ax.legend(loc="upper left")
    ax.set_title("Identical pair sets at every size; mean +- sd of 5 runs", color=INK2, loc="left")
    save(fig, "fig_screening_runtime")


def fig_tca():
    rows = [r for r in read(os.path.join(RES, "tca_n2000_h24_ref10s_seed1", "local_summary.csv")) if r["band"] == "all"]
    names = {"grid_60s": "grid 60 s", "grid_30s": "grid 30 s", "grid_10s": "grid 10 s", "grid_5s": "grid 5 s",
             "grid_1s": "grid 1 s", "grid_quadratic_60s": "grid 60 s + quadratic on d²",
             "grid_quadratic_10s": "grid 10 s + quadratic on d²", "brent_min": "Brent on distance",
             "brent_root_60s": "Brent root on range rate"}
    offsets = {"grid_60s": (5, 5, "left"), "grid_30s": (-5, -6, "right"), "grid_1s": (-4, 6, "right"), "grid_quadratic_60s": (5, 0, "left"), "grid_quadratic_10s": (5, -5, "left"),
               "brent_min": (-5, 2, "right"), "brent_root_60s": (5, 0, "left")}
    fig, ax = plt.subplots(figsize=(W, 2.6))
    for r in rows:
        x, y = float(r["evaluations_mean"]), float(r["miss_err_m_median"])
        grid = r["method"].startswith("grid_") and "quadratic" not in r["method"]
        ax.plot(x, y, "o", color=ORANGE if grid else BLUE)
        dx, dy, ha = offsets.get(r["method"], (5, 0, "left"))
        ax.annotate(names[r["method"]], (x, y), xytext=(dx, dy), textcoords="offset points", ha=ha, va="center",
                    fontsize=6.5, color=INK)
    ax.plot([], [], "o", color=ORANGE, label="Grid search only")
    ax.plot([], [], "o", color=BLUE, label="Grid + refinement")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlim(2, 400)
    ax.set_xlabel("Pair evaluations per encounter")
    ax.set_ylabel("Median miss-distance error (m)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.45, -0.2), ncol=2, fontsize=6.5)
    ax.set_title("6,568 encounters, search window +-60 s", color=INK2, loc="left")
    save(fig, "fig_tca_tradeoff")


def fig_pc_ratio():
    rows = read(os.path.join(RES, "pc_n2000_h24_ref10s_seed1", "events_pc.csv"))
    pts = np.array([(float(r["alpha"]), float(r["pc_legacy"]) / float(r["pc_foster_iso"]))
                    for r in rows if float(r["pc_foster_iso"]) > 0 and float(r["pc_legacy"]) > 0])
    fig, ax = plt.subplots(figsize=(W, 2.4))
    ax.scatter(pts[:, 0], pts[:, 1], s=4, color=BLUE, alpha=0.35, linewidths=0, label=f"Encounters (n = {len(pts):,})")
    a = np.logspace(np.log10(pts[:, 0].min()), np.log10(pts[:, 0].max()), 100)
    ax.plot(a, 1.0 / a ** 2, "--", color=REF, lw=1.0, label="1 / α²")
    ax.axhline(1.0, color=INK2, lw=0.6)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("α = miss distance / combined σ")
    ax.set_ylabel("Legacy Pc / Foster Pc")
    ax.legend(loc="upper right")
    ax.annotate("legacy overstates", (pts[:, 0].min() * 1.3, 2.0), color=INK2, fontsize=7, va="bottom")
    ax.annotate("legacy understates", (pts[:, 0].min() * 1.3, 0.8), color=INK2, fontsize=7, va="top")
    ax.set_title("Same inputs for both (ORCA's covariance and radii)", color=INK2, loc="left")
    save(fig, "fig_pc_ratio")


def fig_mc_convergence():
    rows = read(os.path.join(RES, "mc_convergence_seed1", "convergence.csv"))
    ranks = sorted({int(r["rank"]) for r in rows})
    fig, axes = plt.subplots(1, len(ranks), figsize=(2 * W, 2.1), sharey=True)
    for ax, k in zip(np.atleast_1d(axes), ranks):
        sel = sorted((r for r in rows if int(r["rank"]) == k), key=lambda r: int(r["samples"]))
        n = np.array([int(r["samples"]) for r in sel], dtype=float)
        ratio = np.array([float(r["ratio_mc_foster"]) for r in sel])
        lo = np.array([float(r["ci_low_ratio"]) for r in sel])
        hi = np.array([float(r["ci_high_ratio"]) for r in sel])
        pc = float(sel[0]["pc_foster"])
        ax.axvspan(n[0] / 2, 1.0 / pc, color=GRID, alpha=0.6, linewidth=0)
        ax.fill_between(n, lo, np.minimum(hi, 10), color=BLUE, alpha=0.15, linewidth=0)
        ax.plot(n, ratio, "-o", color=BLUE)
        ax.axhline(1.0, color=INK2, lw=0.8, ls="--")
        ax.set_xscale("log")
        ax.set_xlim(n[0] / 2, n[-1] * 2)
        ax.set_ylim(0, 3)
        ax.set_xlabel("Monte Carlo samples")
        ax.set_title(f"{sel[0]['sat1_name']} / {sel[0]['sat2_name']}\nFoster Pc = {pc:.2e}", color=INK2, fontsize=7)
        ax.text(n[0] / 1.6, 2.2, "< 1 expected hit", color=INK2, fontsize=6.5, va="top")
    np.atleast_1d(axes)[0].set_ylabel("Monte Carlo Pc / Foster Pc")
    np.atleast_1d(axes)[-1].text(3e5, 2.8, "band: 95 % interval\ndashed: Foster", color=INK2, fontsize=6.5,
                                 va="top")
    fig.tight_layout()
    save(fig, "fig_mc_convergence")


def fig_pipeline():
    from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

    lines = "\n".join
    stages = [
        ("TLE input", lines(["CelesTrak GP", "(active group)", "frozen snapshots"]), "data"),
        ("Propagation", lines(["ORCA: two-body", "+ drag", "alt: J2 secular,", "SGP4"]), "Exp 1"),
        ("Screening", lines(["ORCA: KD-tree,", "1 h, 100 km", "alt: 20 s, 200 km;", "brute force"]), "Exp 2a, 2b"),
        ("TCA", lines(["ORCA: Brent on d,", "±6 h", "alt: range-rate", "roots, fit on d²"]), "Exp 3"),
        (lines(["Collision", "probability"]), lines(["ORCA: legacy 2D", "alt: Foster,", "Monte Carlo,", "curved path"]),
         "Exp 4, 4b"),
        ("Risk tier", lines(["Pc thresholds", "1e-4 ... 1e-7", "CRITICAL ... LOW"]), ""),
    ]
    fig, ax = plt.subplots(figsize=(2 * W, 2.3))
    ax.set_xlim(0, 6)
    ax.set_ylim(0, 2.3)
    ax.axis("off")
    bw, gap, y0, h = 0.84, 0.16, 0.55, 1.4
    for i, (title, body, exp) in enumerate(stages):
        x = i + gap / 2
        ax.add_patch(FancyBboxPatch((x, y0), bw, h, boxstyle="round,pad=0,rounding_size=0.04",
                                    linewidth=0.8, edgecolor=INK2, facecolor="white"))
        ax.text(x + bw / 2, y0 + h - 0.08, title, ha="center", va="top", fontsize=7, fontweight="bold", color=INK,
                linespacing=1.1)
        ax.text(x + bw / 2, y0 + h - 0.48, body, ha="center", va="top", fontsize=5.8, color=INK2, linespacing=1.3)
        if exp:
            ax.text(x + bw / 2, y0 + h + 0.08, exp, ha="center", va="bottom", fontsize=6.5, color=BLUE,
                    fontweight="bold")
        if i < len(stages) - 1:
            ax.add_patch(FancyArrowPatch((x + bw, y0 + h / 2), (x + 1, y0 + h / 2), arrowstyle="-|>",
                                         mutation_scale=8, color=INK2, linewidth=0.8))
    # Exp 5 spans the whole pipeline
    ax.annotate("", xy=(6 - gap / 2, 0.38), xytext=(gap / 2, 0.38),
                arrowprops=dict(arrowstyle="|-|", color=BLUE, lw=0.8, mutation_scale=3))
    ax.text(3, 0.28, "Exp 5: end to end, ORCA as built vs corrected pipeline (same objects and window)",
            ha="center", va="top", fontsize=6.5, color=BLUE)
    save(fig, "fig_pipeline")


if __name__ == "__main__":
    fig_pipeline()
    fig_mc_convergence()
    fig_propagation()
    fig_recall()
    fig_runtime()
    fig_tca()
    fig_pc_ratio()
