import { BentoTile } from '../BentoTile/BentoTile'
import './GlobeTile.css'

/**
 * The way into the 3D globe. The picture is a light SVG (no three.js on the home page): the Earth seen from above with a
 * ring for each regime, low to geostationary (not to scale), in the same --cat colours as the regime tile. It is
 * decoration (aria-hidden), moves with transform only, and stands still under prefers-reduced-motion. The whole tile is
 * the link.
 */
export function GlobeTile() {
  return (
    <BentoTile title="Globe" span={3} link={{ label: 'Open the globe', href: '#/globe' }}>
      <div className="globe-tile__art">
        <svg viewBox="0 0 240 140" aria-hidden="true" focusable="false">
          <circle className="globe-tile__ring" cx="120" cy="70" r="34" />
          <circle className="globe-tile__ring" cx="120" cy="70" r="48" />
          <circle className="globe-tile__ring globe-tile__ring--geo" cx="120" cy="70" r="64" />
          <circle className="globe-tile__earth" cx="120" cy="70" r="22" />
          <path className="globe-tile__grid" d="M98 70h44M120 48v44M104 56q16 6 32 0M104 84q16-6 32 0" />
          <g className="globe-tile__spin globe-tile__spin--leo">
            <circle className="globe-tile__obj globe-tile__obj--leo" cx="154" cy="70" r="3" />
            <circle className="globe-tile__obj globe-tile__obj--leo" cx="103" cy="40.6" r="3" />
            <circle className="globe-tile__obj globe-tile__obj--leo" cx="103" cy="99.4" r="3" />
          </g>
          <g className="globe-tile__spin globe-tile__spin--meo">
            <circle className="globe-tile__obj globe-tile__obj--meo" cx="72" cy="70" r="3" />
          </g>
          <g className="globe-tile__spin globe-tile__spin--geo">
            <circle className="globe-tile__obj globe-tile__obj--geo" cx="120" cy="6" r="3" />
          </g>
        </svg>
      </div>
      <p className="globe-tile__text">Every object at its computed position, on an Earth you can turn, zoom and play forward in time.</p>
    </BentoTile>
  )
}
