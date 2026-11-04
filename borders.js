'use strict'
// Detect six long bright frame edges per axis, only when they form a regular 3×3 grid.
// Scene content is never trimmed by brightness alone; uncertain images fall back to equal division.
//
// The image is scanned in horizontal strips (≈4 MP each) instead of one full-size canvas.
// This keeps memory bounded, stays under iOS Safari's 16.7 MP canvas limit, and yields to the
// main thread between strips so the page never freezes on large storyboards.
async function detectBorders(image) {
  const w = image.naturalWidth, h = image.naturalHeight
  let canvas
  try {
    const strip = Math.max(1, Math.min(h, Math.floor(4e6 / w)))
    canvas = document.createElement('canvas'); canvas.width = w; canvas.height = strip
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const cols = new Uint32Array(w), rows = new Uint32Array(h)
    for (let y0 = 0; y0 < h; y0 += strip) {
      const sh = Math.min(strip, h - y0)
      ctx.clearRect(0, 0, w, strip)
      ctx.drawImage(image, 0, y0, w, sh, 0, 0, w, sh)
      const data = ctx.getImageData(0, 0, w, sh).data
      for (let y = 0; y < sh; y++) {
        let count = 0
        for (let x = 0, k = y * w * 4; x < w; x++, k += 4) {
          if (data[k] > 195 && data[k + 1] > 195 && data[k + 2] > 195 && data[k + 3] > 240) { cols[x]++; count++ }
        }
        rows[y0 + y] = count
      }
      await yieldToMain()
    }
    const xs = edges(cols, h), ys = edges(rows, w)
    if (!xs || !ys) return null
    return Array.from({ length: 9 }, (_, i) => ({ x: xs[i % 3].start, y: ys[Math.floor(i / 3)].start, width: xs[i % 3].size, height: ys[Math.floor(i / 3)].size }))
  } catch {
    return null // canvas limits, tainted data or memory pressure: equal grid is the safe answer
  } finally {
    if (canvas) canvas.width = canvas.height = 0
  }
}

// MessageChannel is not throttled in background tabs (unlike setTimeout), so detection
// still finishes promptly if the user switches tabs while a large image is scanned.
function yieldToMain() {
  return new Promise(resolve => { const { port1, port2 } = new MessageChannel(); port1.onmessage = () => { port1.close(); resolve() }; port2.postMessage(0) })
}

function edges(projection, cross) {
  const runs = []
  for (let i = 0; i < projection.length; i++) {
    if (projection[i] / cross > .84) { const last = runs.at(-1); if (last && last.end === i - 1) last.end = i; else runs.push({ start: i, end: i }) }
  }
  if (runs.length !== 6) return null
  const n = projection.length, cells = []
  for (let i = 0; i < 3; i++) {
    const left = runs[i * 2], right = runs[i * 2 + 1]
    if (left.end - left.start > n * .015 || right.end - right.start > n * .015) return null
    // One additional pixel rejects JPEG ringing around the high-contrast frame.
    const start = left.end + 2, end = right.start - 1, size = end - start
    if (size < n * .25 || size > n * .36 || Math.abs((start + end) / 2 - n * (i + .5) / 3) > n * .045) return null
    cells.push({ start, size })
  }
  return cells
}
