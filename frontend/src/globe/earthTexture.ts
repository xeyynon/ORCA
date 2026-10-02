const MASK_URL = '/textures/earth_specular_2048.jpg'

let maskPromise: Promise<ImageData> | null = null

/** Load the vendored land/ocean mask once (bright = ocean, dark = land) as raw pixels. */
function loadMask(): Promise<ImageData> {
  maskPromise ??= new Promise<ImageData>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) { reject(new Error('2D canvas unavailable')); return }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, c.width, c.height))
    }
    img.onerror = () => { maskPromise = null; reject(new Error(`Could not load ${MASK_URL}`)) }
    img.src = MASK_URL
  })
  return maskPromise
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Recolour the mask into a matte instrument-style Earth in the CURRENT theme's ocean/land tokens.
 * Done on the texture (not a CSS filter) because a filter cannot reach a WebGL texture.
 */
export async function buildEarthCanvas(oceanHex: string, landHex: string): Promise<HTMLCanvasElement> {
  const mask = await loadMask()
  const [or, og, ob] = parseHex(oceanHex)
  const [lr, lg, lb] = parseHex(landHex)
  const out = new ImageData(mask.width, mask.height)
  for (let i = 0; i < mask.data.length; i += 4) {
    const isOcean = mask.data[i] > 127
    out.data[i] = isOcean ? or : lr
    out.data[i + 1] = isOcean ? og : lg
    out.data[i + 2] = isOcean ? ob : lb
    out.data[i + 3] = 255
  }
  const c = document.createElement('canvas')
  c.width = mask.width
  c.height = mask.height
  c.getContext('2d')!.putImageData(out, 0, 0)
  return c
}
