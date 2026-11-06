"""
SSA Analytics & Visualization
Orbital statistics, 3D plots, ground tracks, risk visualizations
"""
import numpy as np
import math 
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Optional
import json
from sgp4.api import Satrec
from pathlib import Path

 
try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
except ImportError:
    print("Warning: plotly not installed. Install with: pip install plotly")
 
from orbit_mech_engine import SGP4Propagator, OrbitalElement, CoordinateTransform, StateVector
from parser_pipeline import TLE
from conjunction_detection import ConjunctionEvent

# ============================================================================
# OBJECT CLASSIFICATION (from what the catalog actually carries)
# ============================================================================
OBJECT_TYPES = ("payload", "rocket_body", "debris")


def classify_object_type(name: str) -> str:
    """
    Object type inferred from the NAME only. The stored data has no status or type field, so this is a naming
    heuristic (Celestrak names debris "... DEB" and rocket bodies "... R/B"), not an authoritative record.
    It cannot say whether a payload is still active.
    """
    n = f" {name.upper()} "
    if " DEB " in n or n.rstrip().endswith(" DEB") or "DEBRIS" in n:
        return "debris"
    if " R/B " in n or "ROCKET BODY" in n:
        return "rocket_body"
    return "payload"


_MU_KM3_S2 = 398600.4418
_RE_KM = 6371.0
_GEO_ALT_KM = 35786.0
REGIMES = ("LEO", "MEO", "GEO", "HEO")


def classify_regime(mean_motion_rev_per_day: float, eccentricity: float) -> Optional[str]:
    """
    LEO / MEO / GEO / HEO from mean motion (rev/day) and eccentricity, or None if mean motion is not physical.
    Mirrors frontend/src/lib/orbit.ts (deriveOrbit + classifyRegime); tests/test_catalog.py pins the shared cases.
    TLE mean motion is rev/day: convert to rad/s before Kepler's third law (ARCHITECTURE.md section 7).
    """
    if not mean_motion_rev_per_day or not math.isfinite(mean_motion_rev_per_day) or mean_motion_rev_per_day <= 0:
        return None
    n_rad_s = mean_motion_rev_per_day * 2.0 * math.pi / 86400.0
    a = (_MU_KM3_S2 / (n_rad_s ** 2)) ** (1.0 / 3.0)
    perigee = a * (1.0 - eccentricity) - _RE_KM
    apogee = a * (1.0 + eccentricity) - _RE_KM
    if eccentricity > 0.25:
        return "HEO"
    if perigee >= _GEO_ALT_KM - 400 and apogee <= _GEO_ALT_KM + 400:
        return "GEO"
    if apogee < 2000:
        return "LEO"
    return "MEO"


def catalog_columns(tles) -> Dict[str, object]:
    """
    The five per-object fields the Analytics charts need, as parallel columns (one entry per object, same order),
    for the WHOLE catalog. Nothing is binned or derived here: the browser derives altitude from mean motion and
    bins with its tested lib functions (histogram.ts, heatmap.ts, groups.ts), so there is one copy of that logic.
    Units are in the field names. Values are rounded to the precision a TLE carries, which keeps the payload small:
    epoch to whole seconds (UTC), inclination 4 dp, eccentricity 7 dp, mean motion 8 dp.
    """
    cols: Dict[str, list] = {"name": [], "epoch_unix_s": [], "inclination_deg": [], "eccentricity": [], "mean_motion_rev_per_day": []}
    for t in tles:
        epoch = t.epoch
        if epoch.tzinfo is not None:
            epoch = epoch.astimezone(timezone.utc).replace(tzinfo=None)
        cols["name"].append(t.object_name)
        cols["epoch_unix_s"].append(int(round((epoch - datetime(1970, 1, 1)).total_seconds())))
        cols["inclination_deg"].append(round(float(t.inclination), 4))
        cols["eccentricity"].append(round(float(t.eccentricity), 7))
        cols["mean_motion_rev_per_day"].append(round(float(t.mean_motion), 8))
    return {"count": len(cols["name"]), **cols}


# ============================================================================
# ORBITAL ANALYTICS
# =========================================================================
class OrbitalAnalytics:
     """Compute orbital statistics and aggregate metrics"""

     @staticmethod
     def compute_apogee_perigee(oe: OrbitalElement) -> Tuple[float, float]:
        """Return apogee and perigee altitude (km above Earth surface)"""
        RE = 6371.0
        apogee = oe.ra - RE
        perigee = oe.rp - RE
        return apogee, perigee
     @staticmethod
     def orbital_period_hours(oe: OrbitalElement) -> float:
        """Orbital period in hours"""
        return oe.period / 3600
    
     @staticmethod
     def inclination_degrees(oe: OrbitalElement) -> float:
        """Inclination in degrees"""
        return math.degrees(oe.i)
     @staticmethod
     def catalog_statistics(orbital_elements: Dict[str, Tuple[OrbitalElement, str]]) -> Dict:
        """
        Compute aggregate statistics across catalog.
        """
        if not orbital_elements:
            return {}
        
        oes = [oe for oe, _ in orbital_elements.values()]
        
        apogees = [OrbitalAnalytics.compute_apogee_perigee(oe)[0] for oe in oes]
        perigees = [OrbitalAnalytics.compute_apogee_perigee(oe)[1] for oe in oes]
        periods = [OrbitalAnalytics.orbital_period_hours(oe) for oe in oes]
        inclinations = [OrbitalAnalytics.inclination_degrees(oe) for oe in oes]
        return {
            'total_objects': len(oes),
            'apogee': {
                'min': min(apogees),
                'max': max(apogees),
                'mean': np.mean(apogees),
                'median': np.median(apogees),
            },
            'perigee': {
                'min': min(perigees),
                'max': max(perigees),
                'mean': np.mean(perigees),
                'median': np.median(perigees),
            },
            'period_hours': {
                'min': min(periods),
                'max': max(periods),
                'mean': np.mean(periods),
            },
            'inclination': {
                'min': min(inclinations),
                'max': max(inclinations),
                'mean': np.mean(inclinations),
            }
        }
 

 # ============================================================================
# 3D ORBITAL VISUALIZATION
# ============================================================================
class OrbitalVisualizer:
    """Generate interactive Plotly 3D visualizations"""
    
    @staticmethod
    def plot_orbits_3d(orbital_elements: Dict[str, Tuple[OrbitalElement, str]],
                      propagation_hours: float = 24,
                      subset: int = 10) -> str:
        """
        Generate 3D plot of orbits.
        
        Args:
            orbital_elements: Catalog of orbital elements
            propagation_hours: Time span for orbit traces
            subset: Number of objects to plot (for performance)
            
        Returns:
            HTML plot string
        """
        fig = go.Figure()
        
        # Add Earth
        u = np.linspace(0, 2 * np.pi, 30)
        v = np.linspace(0, np.pi, 20)
        x_earth = 6371 * np.outer(np.cos(u), np.sin(v))
        y_earth = 6371 * np.outer(np.sin(u), np.sin(v))
        z_earth = 6371 * np.outer(np.ones(np.size(u)), np.cos(v))
        
        fig.add_trace(go.Surface(
            x=x_earth, y=y_earth, z=z_earth,
            colorscale=[[0, 'rgb(50,100,150)'], [1, 'rgb(100,150,200)']],
            showscale=False,
            name='Earth',
            hoverinfo='skip'
        ))
        
        # Plot orbits (sample subset)
        ids = list(orbital_elements.keys())[:subset]
        colors = px.colors.qualitative.Set3
        
        for idx, obj_id in enumerate(ids):
            oe, name = orbital_elements[obj_id]
            prop = SGP4Propagator(oe)
            
            # Propagate orbit trace
            times = [oe.epoch + timedelta(hours=i) for i in np.linspace(0, propagation_hours, 100)]
            try:
                positions = [prop.propagate(t).r for t in times]
            except ValueError:  # SGP4 rejects this object (e.g. decayed): leave it out of the plot
                continue
            
            xs = [p[0] for p in positions]
            ys = [p[1] for p in positions]
            zs = [p[2] for p in positions]
            
            color = colors[idx % len(colors)]
            
            fig.add_trace(go.Scatter3d(
                x=xs, y=ys, z=zs,
                mode='lines',
                name=name[:20],
                line=dict(color=color, width=2),
                hovertemplate=f'{name}<br>Time: %{{text}}<extra></extra>',
                text=[t.strftime('%Y-%m-%d %H:%M') for t in times]
            ))
        
        # Axes
        fig.update_layout(
            title=f'3D Orbital Visualization ({len(ids)} objects)',
            scene=dict(
                xaxis_title='X (km)',
                yaxis_title='Y (km)',
                zaxis_title='Z (km)',
                camera=dict(
                    eye=dict(x=1.5, y=1.5, z=1.5)
                )
            ),
            height=700,
            hovermode='closest'
        )
        
        return fig.to_html(include_plotlyjs='cdn')
    @staticmethod
    def plot_ground_tracks(orbital_elements: Dict[str, Tuple[OrbitalElement, str]],
                          propagation_hours: float = 48,
                          subset: int = 5) -> str:
        """
        Plot ground tracks on 2D map.
        """
        fig = go.Figure()
        
        ids = list(orbital_elements.keys())[:subset]
        colors = px.colors.qualitative.Plotly
        
        for idx, obj_id in enumerate(ids):
            oe, name = orbital_elements[obj_id]
            prop = SGP4Propagator(oe)
            
            # Propagate and compute ground tracks
            times = [oe.epoch + timedelta(hours=i) for i in np.linspace(0, propagation_hours, 200)]
            lats, lons = [], []
            
            for t in times:
                try:
                    state = prop.propagate(t)
                except ValueError:  # SGP4 rejects this object from here on (e.g. decayed)
                    break
                lat, lon, _ = CoordinateTransform.eci_to_geographic(state.r, t)
                lats.append(lat)
                lons.append(lon)
            
            color = colors[idx % len(colors)]
            
            fig.add_trace(go.Scattergeo(
                lat=lats,
                lon=lons,
                mode='lines',
                name=name[:20],
                line=dict(color=color, width=2),
                hovertemplate=f'{name}<br>Lat: %{{y:.2f}}° Lon: %{{x:.2f}}°<extra></extra>'
            ))
        
        fig.update_layout(
            title=f'Ground Tracks ({len(ids)} objects)',
            geo=dict(
                projection_type='equirectangular',
                showland=True,
                landcolor='rgb(243, 243, 243)',
                coastlinecolor='rgb(150, 150, 150)',   # Fixed
                coastlinewidth=1,
            ),
            height=500,
            hovermode='closest'
        )
        
        return fig.to_html(include_plotlyjs='cdn')


# ============================================================================
# RISK VISUALIZATION
# ============================================================================

class RiskVisualizer:
    """Visualize conjunction risks and collision threats"""
    
    @staticmethod
    def plot_conjunction_timeline(conjunctions: List[ConjunctionEvent]) -> str:
        """
        Plot conjunction events on timeline.
        """
        if not conjunctions:
            return "<p>No conjunction events to display.</p>"
        
        fig = go.Figure()
        
        # Sort by TCA
        conjunctions_sorted = sorted(conjunctions, key=lambda x: x.tca)
        
        tcas = [c.tca for c in conjunctions_sorted]
        probs = [c.probability_of_collision * 1e6 for c in conjunctions_sorted]  # Scale to 1e-6
        names = [f"{c.sat1_name[:10]} - {c.sat2_name[:10]}" for c in conjunctions_sorted]
        colors = ['red' if c.risk_level == 'CRITICAL' else 
                 'orange' if c.risk_level == 'HIGH' else 'yellow'
                 for c in conjunctions_sorted]
        
        fig.add_trace(go.Scatter(
            x=tcas,
            y=probs,
            mode='markers',
            marker=dict(
                size=10,
                color=colors,
                showscale=False
            ),
            text=names,
            hovertemplate='%{text}<br>TCA: %{x}<br>Pc: %{y:.2e}<extra></extra>',
            name='Conjunctions'
        ))
        
        fig.update_layout(
            title='Conjunction Event Timeline',
            xaxis_title='Time of Closest Approach',
            yaxis_title='Collision Probability (×1e-6)',
            height=500,
            hovermode='closest'
        )
        
        return fig.to_html(include_plotlyjs='cdn')
    @staticmethod
    def plot_risk_matrix(conjunctions: List[ConjunctionEvent]) -> str:
        """
        Heatmap of collision risks.
        """
        if not conjunctions:
            return "<p>No conjunction events to display.</p>"
        
        # Group by satellite pairs
        risk_data = {}
        for c in conjunctions:
            key = tuple(sorted([c.sat1_name, c.sat2_name]))
            if key not in risk_data:
                risk_data[key] = {'max_pc': 0, 'count': 0}
            risk_data[key]['max_pc'] = max(risk_data[key]['max_pc'], c.probability_of_collision)
            risk_data[key]['count'] += 1
        
        # Extract sorted pairs and probabilities
        pairs = list(risk_data.keys())
        probs = [risk_data[p]['max_pc'] for p in pairs]
        
        fig = go.Figure(data=go.Bar(
            y=[f"{p[0][:15]} - {p[1][:15]}" for p in pairs[:20]],  # Top 20
            x=probs[:20],
            orientation='h',
            marker_color=[math.log10(p) if p > 0 else -10 for p in probs[:20]],
            marker_colorscale='Reds',
            text=[f"{p:.2e}" for p in probs[:20]],
            textposition='auto'
        ))
        
        fig.update_layout(
            title='Top Collision Risks',
            xaxis_title='Collision Probability',
            height=400 + len(pairs) * 10,
            hovermode='closest'
        )
        
        return fig.to_html(include_plotlyjs='cdn')
    


# ============================================================================
# EXPORT UTILITIES
# ============================================================================
class ExportUtils:
    """Export analysis results to various formats"""
    
    @staticmethod
    def export_conjunctions_csv(conjunctions: List[ConjunctionEvent], filepath: str):
        """Export conjunctions to CSV"""
        import csv
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'sat1_id', 'sat1_name', 'sat2_id', 'sat2_name',
                'tca', 'min_distance_km', 'mahalanobis_distance',
                'probability_of_collision', 'risk_level', 'combined_hbr_km',
                'relative_velocity_kms', 'tle_age_days', 'uncertainty_km', 'long_encounter'
            ])
            writer.writeheader()
            for c in conjunctions:
                writer.writerow(c.to_dict())

    
    @staticmethod
    def export_conjunctions_json(conjunctions: List[ConjunctionEvent], filepath: str):
        """Export conjunctions to JSON"""
        data = [c.to_dict() for c in conjunctions]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    
    @staticmethod
    def export_statistics_json(stats: Dict, filepath: str):
        """Export catalog statistics to JSON"""
        with open(filepath, 'w') as f:
            json.dump(stats, f, indent=2)

 
if __name__ == "__main__":
    from parser_pipeline import CelestrackClient, TLEDatabase
    from conjunction_detection import ConjunctionDetector, ConjunctionSearch
    from sgp4.api import Satrec   # Make sure this is imported

    # Load database
    db = TLEDatabase()
    if db.count_tles() == 0:
        print("Fetching TLEs from Celestrak...")
        result = CelestrackClient.fetch_group_checked(group="active")
        if result.status != "ok":
            raise SystemExit(f"Could not load TLEs from Celestrak: {result.detail}")
        db.insert_batch(result.tles)
    
    all_tles = db.get_all_tles()
    
    # Build orbital elements
    orbital_elements = {}
    MU_EARTH = 398600.4418
    
    for tle in all_tles:
        try:
            sat = Satrec.twoline2rv(tle.line1, tle.line2)
            n_rad_per_sec = sat.no_kozai / 60.0
            a = (MU_EARTH / (n_rad_per_sec ** 2)) ** (1.0 / 3.0)
            
            oe = OrbitalElement(
                a=a, e=sat.ecco, i=sat.inclo,
                omega=sat.argpo, Omega=sat.nodeo, M=sat.mo,
                n=n_rad_per_sec, epoch=tle.epoch, bstar=sat.bstar
            )
            orbital_elements[tle.norad_cat_id] = (oe, tle.object_name)
        except Exception as e:
            print(f"Skipping {tle.object_name}: {e}")
            continue

    print(f"Loaded {len(orbital_elements)} objects for analysis.")
    
    # Analytics
    stats = OrbitalAnalytics.catalog_statistics(orbital_elements)
    print("Catalog Statistics:")
    print(json.dumps(stats, indent=2, default=str))
    
    # ====================== FIXED VISUALIZATION SAVING ======================
    print("\nGenerating visualizations...")
    
    # Use Windows-friendly paths (change folder if you want)
    output_dir = str(Path(__file__).parent / "output")  # ← Create this folder or change it
    
    # Create the output directory if it doesn't exist
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate and save plots
    plot_3d = OrbitalVisualizer.plot_orbits_3d(orbital_elements, subset=8)
    with open(os.path.join(output_dir, "orbit_3d.html"), 'w', encoding='utf-8') as f:
        f.write(plot_3d)
    print(f"3D Orbit plot saved to: {output_dir}\\orbit_3d.html")
    
    plot_ground = OrbitalVisualizer.plot_ground_tracks(orbital_elements, subset=5)
    with open(os.path.join(output_dir, "ground_tracks.html"), 'w', encoding='utf-8') as f:
        f.write(plot_ground)
    print(f"Ground tracks saved to: {output_dir}\\ground_tracks.html")
    
    # Conjunctions
    print("\nComputing conjunctions...")
    detector = ConjunctionDetector(time_horizon_days=1)
    search = ConjunctionSearch(detector)
    conjunctions = search.search_catalog(orbital_elements)
    
    print(f"Found {len(conjunctions)} conjunctions")
    
    if conjunctions:
        print("\nTop 10 highest risk conjunctions:")
        for i, event in enumerate(conjunctions[:10], 1):
            print(f"{i:2d}. {event.sat1_name[:25]:<25} <-> {event.sat2_name[:25]:<25} | "
                  f"Pc: {event.probability_of_collision:.2e} | Risk: {event.risk_level} | "
                  f"Dist: {event.min_distance:.1f} km")
    
 




    
