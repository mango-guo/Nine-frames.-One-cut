'use strict'
const $ = id => document.getElementById(id)
const MAX_BYTES = 40 * 1024 * 1024, MAX_PIXELS = 60e6, MAX_CANVAS = 80e6, PREVIEW_MAX = 1600, NOTE_MAX = 1000
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const NOTES_INDEX = 'frame09-notes-index', NOTES_KEEP = 40
const CAPTION_FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
const encoder = new TextEncoder()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

const state = { picture: null, frames: [], notes: Array(9).fill(''), sourceUrl: '', storageKey: '', busy: false, loadId: 0, stale: false, previewIndex: -1 }
let toastTimer, saveTimer

const pad2 = n => String(n).padStart(2, '0')
const fail = key => Object.assign(new Error(key), { key })
const errorText = (e, fallback) => t(e?.key || fallback)
const cropMode = () => document.querySelector('input[name=mode]:checked').value
const setCropMode = v => { document.querySelector(`input[name=mode][value="${v}"]`).checked = true }
const imageFormat = () => document.querySelector('input[name=format]:checked').value

function toast(message, kind = 'info') {
  const el = $('toast'); el.textContent = message; el.dataset.kind = kind
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show')
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 5000 : 3200)
}

/* ---------- Notes persistence (debounced, pruned to the most recent images) ---------- */
function saveNotesNow() {
  clearTimeout(saveTimer)
  if (!state.storageKey) return
  try {
    localStorage.setItem(state.storageKey, JSON.stringify(state.notes))
    let index = []; try { index = JSON.parse(localStorage.getItem(NOTES_INDEX)) || [] } catch {}
    if (!Array.isArray(index)) index = []
    index = index.filter(k => k !== state.storageKey); index.push(state.storageKey)
    while (index.length > NOTES_KEEP) localStorage.removeItem(index.shift())
    localStorage.setItem(NOTES_INDEX, JSON.stringify(index))
  } catch { toast(t('storageFull'), 'warn') }
}
const saveNotes = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNotesNow, 300) }
addEventListener('pagehide', saveNotesNow)

function setNote(i, value, source) {
  state.notes[i] = value.slice(0, NOTE_MAX)
  const card = $('frames').children[i]
  if (card) {
    const field = card.querySelector('textarea')
    if (field !== source) field.value = state.notes[i]
    card.querySelector('.len').textContent = `${state.notes[i].length} / ${NOTE_MAX}`
  }
  if (state.previewIndex === i && $('preview-note') !== source) $('preview-note').value = state.notes[i]
  saveNotes()
}

async function fingerprint(file) {
  const buffer = await file.arrayBuffer()
  if (globalThis.crypto?.subtle?.digest) {
    try { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), n => n.toString(16).padStart(2, '0')).join('') } catch {}
  }
  // Web Crypto is unavailable on plain-HTTP origins: fall back to a fast FNV-1a fingerprint.
  const bytes = new Uint8Array(buffer); let a = 0x811c9dc5, b = 0x01000193
  for (let i = 0; i < bytes.length; i++) { a = Math.imul(a ^ bytes[i], 0x01000193); b = Math.imul(b ^ bytes[i], 0x5bd1e995) }
  return `fnv${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}-${bytes.length}`
}

/* ---------- Rendering ---------- */
function frameCard(i) {
  const f = state.frames[i], n = i + 1, card = document.createElement('article')
  card.className = 'frame' + (f ? ' is-ready' : '')
  card.style.setProperty('--i', i)
  card.innerHTML = `<div class="frame-media"><button class="frame-picture" type="button"></button><span class="frame-no mono">${pad2(n)}</span><span class="frame-zoom" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/></svg></span></div>
    <div class="frame-body"><div class="frame-meta mono"><span>SHOT ${pad2(n)}</span><span class="dim"></span></div>
    <label class="sr-only" for="note-${i}"></label><textarea id="note-${i}" maxlength="${NOTE_MAX}" rows="2"></textarea>
    <div class="frame-foot"><span class="len mono"></span><button class="link-btn dl" type="button"></button></div></div>`
  const view = card.querySelector('.frame-picture'), field = card.querySelector('textarea'), dl = card.querySelector('.dl')
  view.setAttribute('aria-label', t('previewOf', n))
  if (f) {
    view.style.aspectRatio = `${f.width} / ${f.height}`
    const img = new Image(); img.src = f.url; img.alt = ''; img.decoding = 'async'; view.append(img)
    view.onclick = () => openPreview(i)
    card.querySelector('.dim').textContent = `${f.width} × ${f.height}`
  } else {
    view.disabled = true
    const ph = document.createElement('span'); ph.className = 'placeholder'; ph.textContent = pad2(n); view.append(ph)
    card.querySelector('.dim').textContent = t('awaiting')
  }
  card.querySelector('label').textContent = `${t('noteLabel')} ${pad2(n)}`
  field.placeholder = t('notePh'); field.value = state.notes[i]; field.disabled = !f || state.busy
  field.oninput = () => setNote(i, field.value, field)
  card.querySelector('.len').textContent = `${state.notes[i].length} / ${NOTE_MAX}`
  dl.textContent = t('dlOne'); dl.setAttribute('aria-label', t('downloadOf', n)); dl.disabled = !f || state.busy
  dl.onclick = () => downloadOne(i)
  return card
}

function render() {
  $('frames').replaceChildren(...Array.from({ length: 9 }, (_, i) => frameCard(i)))
  updateChrome()
}

function geometryOk() { try { geometry(); return true } catch { return false } }

function updateChrome() {
  const has = !!state.picture, done = state.frames.length === 9, stage = done ? 'done' : has ? 'loaded' : 'empty'
  document.body.dataset.stage = stage
  $('count').textContent = `${state.frames.length} / 9`
  $('cut').disabled = !has || state.busy || !geometryOk()
  $('export').disabled = !done || state.busy
  $('cut-label').textContent = $('cut').classList.contains('is-working') ? t('cutting') : t(done ? 'recut' : 'cutBtn')
  $('frame-info').textContent = t(!has ? 'seqEmpty' : state.stale ? 'seqStale' : done ? 'seqDone' : 'seqReady')
  const current = done ? 3 : has ? 2 : 1
  document.querySelectorAll('#steps li').forEach(li => {
    const n = Number(li.dataset.step)
    li.classList.toggle('is-done', n < current || (done && n === 2))
    li.classList.toggle('is-current', n === current)
    if (n === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current')
  })
  const dock = $('dock-btn')
  dock.dataset.action = stage === 'empty' ? 'import' : stage === 'loaded' ? 'cut' : 'export'
  $('dock-label').textContent = t(stage === 'empty' ? 'dockImport' : stage === 'loaded' ? 'cutBtn' : 'download')
  dock.disabled = state.busy || (stage === 'loaded' && $('cut').disabled)
}

function clearFrames(redraw = true) {
  state.frames.forEach(f => URL.revokeObjectURL(f.url)); state.frames = []
  if ($('preview').open) $('preview').close()
  if (redraw) render()
}

function markStale() {
  if (!state.picture) return
  state.stale = state.frames.length > 0 || state.stale
  clearFrames(false); updateDetection(); overlay(); render()
}

function geometry() {
  const p = state.picture
  if (!p) throw fail('errRead')
  if (cropMode() === 'auto' && p.detected) return p.detected.map(r => ({ ...r }))
  const ms = $('margin').value.trim(), gs = $('gutter').value.trim(), m = Number(ms), g = Number(gs)
  if (ms === '' || gs === '' || !Number.isInteger(m) || !Number.isInteger(g) || m < 0 || g < 0) throw fail('errSpacing')
  const w = p.width - 2 * m - 2 * g, h = p.height - 2 * m - 2 * g
  if (w < 3 || h < 3) throw fail('errSpacingLarge')
  return Array.from({ length: 9 }, (_, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    return { x: m + Math.floor(w * col / 3) + col * g, y: m + Math.floor(h * row / 3) + row * g, width: Math.floor(w * (col + 1) / 3) - Math.floor(w * col / 3), height: Math.floor(h * (row + 1) / 3) - Math.floor(h * row / 3) }
  })
}

function overlay() {
  const svg = $('overlay'), p = state.picture
  if (!p) return svg.replaceChildren()
  let cells; try { cells = geometry() } catch { svg.replaceChildren(); return }
  const fs = Math.max(10, Math.round(Math.min(p.width, p.height) * .055))
  svg.setAttribute('viewBox', `0 0 ${p.width} ${p.height}`)
  const holes = cells.map(c => `M${c.x} ${c.y}h${c.width}v${c.height}h${-c.width}Z`).join('')
  svg.innerHTML = `<path class="trim" fill-rule="evenodd" d="M0 0H${p.width}V${p.height}H0Z${holes}"/>` +
    cells.map((c, i) => `<rect class="cell" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}"/><text class="cell-no" x="${c.x + fs * .45}" y="${c.y + fs * 1.15}" font-size="${fs}">${pad2(i + 1)}</text>`).join('')
}

function updateDetection() {
  const el = $('detection-info'), p = state.picture
  if (!p) { el.textContent = ''; el.dataset.tone = ''; return }
  const manual = cropMode() === 'manual'
  el.textContent = t(manual ? 'manualInfo' : p.detected ? 'detected' : 'notDetected')
  el.dataset.tone = manual ? 'neutral' : p.detected ? 'ok' : 'warn'
}

/* ---------- Import ---------- */
function setBusy(value) {
  state.busy = value
  document.body.classList.toggle('is-busy', value)
  document.querySelectorAll('[data-lock]').forEach(el => { el.disabled = value })
  document.querySelectorAll('.frame textarea, .frame .dl').forEach(el => { el.disabled = value || !state.frames.length })
  updateChrome()
}

async function importFile(file) {
  if (state.busy || !file) return
  const ext = (file.name || '').split('.').pop().toLowerCase()
  const type = TYPES[ext] && (!file.type || file.type === 'application/octet-stream') ? TYPES[ext] : file.type
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) return toast(t(/hei[cf]/i.test(type + ext) ? 'errHeic' : 'errType'), 'error')
  if (file.size > MAX_BYTES) return toast(t('errSize'), 'error')
  const id = ++state.loadId, url = URL.createObjectURL(file)
  let committed = false
  setBusy(true)
  try {
    const img = new Image(); img.src = url
    try { await img.decode() } catch { throw fail('errRead') }
    if (img.naturalWidth < 3 || img.naturalHeight < 3) throw fail('errTiny')
    if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) throw fail('errPixels')
    const key = 'frame09-notes-' + await fingerprint(file)
    if (id !== state.loadId) return
    let restored = null; try { restored = JSON.parse(localStorage.getItem(key)) } catch {}
    const notes = Array.from({ length: 9 }, (_, i) => typeof restored?.[i] === 'string' ? restored[i].slice(0, NOTE_MAX) : '')

    saveNotesNow(); clearFrames(false)
    if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl)
    state.sourceUrl = url; committed = true
    state.picture = { image: img, width: img.naturalWidth, height: img.naturalHeight, name: file.name || 'storyboard.png', type, size: file.size, detected: null }
    state.notes = notes; state.storageKey = key; state.stale = false
    $('original').src = url; $('source').hidden = false; $('drop').hidden = true
    $('filename').textContent = state.picture.name; $('filename').title = state.picture.name
    $('dimensions').textContent = `${img.naturalWidth} × ${img.naturalHeight} px · ${(file.size / 1048576).toFixed(2)} MB`
    $('prefix').value = state.picture.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'storyboard'
    $('margin').value = 0; $('gutter').value = 0; setCropMode('auto')
    $('detection-info').textContent = t('detecting'); $('detection-info').dataset.tone = 'neutral'
    $('source').classList.add('is-scanning'); overlay(); render()

    state.picture.detected = await detectBorders(img)
    if (id !== state.loadId) return
    updateDetection(); overlay()
    toast(notes.some(Boolean) ? t('notesRestored') : t('loaded'), 'ok')
  } catch (e) {
    if (!committed) URL.revokeObjectURL(url)
    toast(errorText(e, 'errRead'), 'error')
  } finally {
    $('source').classList.remove('is-scanning')
    $('file').value = ''
    setBusy(false)
  }
}

/* ---------- Cropping ---------- */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const toBlob = (canvas, type = 'image/png', quality = .95) => new Promise((resolve, reject) => {
  try { canvas.toBlob(b => b ? resolve(b) : reject(fail('errCanvas')), type, quality) } catch { reject(fail('errCanvas')) }
})

async function cut() {
  const p = state.picture
  if (!p || state.busy) return
  let rects; try { rects = geometry() } catch (e) { return toast(errorText(e, 'errSpacing'), 'error') }
  $('cut').classList.add('is-working'); setBusy(true)
  const next = []
  try {
    // Only light previews (≤1600 px) are kept in memory. Full-resolution pixels are drawn
    // straight from the source at download time, so nine large canvases never coexist.
    for (const r of rects) {
      const scale = Math.min(1, PREVIEW_MAX / Math.max(r.width, r.height))
      const c = makeCanvas(Math.max(1, Math.round(r.width * scale)), Math.max(1, Math.round(r.height * scale)))
      const ctx = c.getContext('2d'); if (!ctx) throw fail('errCanvas')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(p.image, r.x, r.y, r.width, r.height, 0, 0, c.width, c.height)
      const blob = await toBlob(c, p.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', .9)
      c.width = c.height = 0
      next.push({ ...r, url: URL.createObjectURL(blob) })
    }
    clearFrames(false); state.frames = next; state.stale = false
    $('cut').classList.remove('is-working'); render()
    toast(t('cutDone'), 'ok')
    if (innerWidth < 1024) $('sheet').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' })
  } catch (e) {
    next.forEach(f => URL.revokeObjectURL(f.url)); toast(errorText(e, 'errCanvas'), 'error')
  } finally { $('cut').classList.remove('is-working'); setBusy(false) }
}

/* ---------- Export ---------- */
function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    // CJK characters break anywhere; Latin words stay whole unless a single word is too wide.
    const tokens = paragraph.match(/[⺀-鿿豈-﫿＀-￯]|\s+|[^\s⺀-鿿豈-﫿＀-￯]+/g) || ['']
    let line = ''
    for (const token of tokens) {
      if (line && ctx.measureText(line + token).width > maxWidth) { lines.push(line.trimEnd()); line = '' }
      if (!line && /^\s+$/.test(token)) continue
      if (ctx.measureText(token).width > maxWidth) {
        for (const ch of token) { if (line && ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = '' } line += ch }
      } else line += token
    }
    lines.push(line.trimEnd())
  }
  return lines
}

async function exportFrame(i, s) {
  const f = state.frames[i], note = state.notes[i].replace(/\s+$/, ''), withNote = s.captions && !!note.trim()
  const pad = Math.max(12, Math.round(f.width * .035)), font = Math.max(14, Math.round(f.width * .024)), lh = Math.ceil(font * 1.55), spec = `${font}px ${CAPTION_FONT}`
  let lines = []
  if (withNote) { const m = makeCanvas(1, 1).getContext('2d'); m.font = spec; lines = wrapText(m, note, Math.max(1, f.width - pad * 2)) }
  const height = f.height + (withNote ? pad * 2 + lines.length * lh : 0)
  if (f.width * height > MAX_CANVAS || height > 32767) throw fail('errCaption')
  const c = makeCanvas(f.width, height), ctx = c.getContext('2d')
  if (!ctx) throw fail('errCanvas')
  ctx.fillStyle = '#fff'
  if (s.format === 'jpeg') ctx.fillRect(0, 0, c.width, c.height)
  else if (withNote) ctx.fillRect(0, f.height, c.width, height - f.height)
  ctx.drawImage(state.picture.image, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height)
  if (withNote) {
    ctx.font = spec; ctx.fillStyle = '#1c1916'; ctx.textBaseline = 'top'
    lines.forEach((line, j) => ctx.fillText(line, pad, f.height + pad + j * lh))
  }
  try { return await toBlob(c, s.format === 'jpeg' ? 'image/jpeg' : 'image/png', .95) } finally { c.width = c.height = 0 }
}

function exportSettings() {
  const prefix = $('prefix').value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 60)
  return { format: imageFormat(), captions: $('captions').checked, prefix: prefix || 'storyboard' }
}
const fileName = (i, s) => `${s.prefix}_${pad2(i + 1)}.${s.format === 'jpeg' ? 'jpg' : 'png'}`

function download(blob, name) {
  const a = document.createElement('a'), url = URL.createObjectURL(blob)
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

async function downloadOne(i) {
  if (state.busy || !state.frames[i]) return
  setBusy(true)
  try { const s = exportSettings(); download(await exportFrame(i, s), fileName(i, s)) }
  catch (e) { toast(errorText(e, 'exportFail'), 'error') }
  finally { setBusy(false) }
}

// ZIP (STORE): UTF-8 names, table-driven CRC32, real timestamps. No network dependency.
const CRC_TABLE = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 } return table })()
function crc32(bytes) { let crc = 0xffffffff; for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0 }
function zip(files) {
  const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts = [], central = []; let offset = 0, size = 0
  for (const file of files) {
    const name = encoder.encode(file.name), data = file.data, crc = crc32(data)
    const h = new Uint8Array(30 + name.length), v = new DataView(h.buffer)
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true); v.setUint16(10, time, true); v.setUint16(12, date, true)
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, name.length, true); h.set(name, 30)
    parts.push(h, data)
    const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(12, time, true); cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); ch.set(name, 46)
    central.push(ch); offset += h.length + data.length; size += ch.length
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}

function setExportProgress(ratio) { $('export-fill').style.transform = `scaleX(${ratio})` }

async function exportZip() {
  if (state.frames.length !== 9 || state.busy) return
  saveNotesNow(); setBusy(true); $('export').classList.add('is-working')
  try {
    const s = exportSettings(), files = []
    for (let i = 0; i < 9; i++) {
      $('progress').textContent = t('progress', i + 1); setExportProgress((i + .5) / 10)
      files.push({ name: fileName(i, s), data: new Uint8Array(await (await exportFrame(i, s)).arrayBuffer()) })
    }
    files.push({ name: t('notesFile'), data: encoder.encode('﻿' + state.notes.map((note, i) => `${fileName(i, s)}\n${note || t('noNote')}`).join('\n\n')) })
    const p = state.picture
    files.push({ name: t('jsonFile'), data: encoder.encode(JSON.stringify({ source: p.name, size: { width: p.width, height: p.height }, mode: cropMode(), borderDetection: !!p.detected, margin: Number($('margin').value), gutter: Number($('gutter').value), exportedAt: new Date().toISOString(), frames: state.frames.map((f, i) => ({ file: fileName(i, s), x: f.x, y: f.y, width: f.width, height: f.height, note: state.notes[i] })) }, null, 2)) })
    setExportProgress(1)
    download(zip(files), `${s.prefix}_${t('zipName')}.zip`)
    $('progress').textContent = t('zipDone'); toast(t('packaged'), 'ok')
  } catch (e) {
    $('progress').textContent = t('exportFail'); toast(errorText(e, 'exportFail'), 'error')
  } finally {
    $('export').classList.remove('is-working'); setBusy(false)
    setTimeout(() => setExportProgress(0), 900)
  }
}

/* ---------- Preview dialog ---------- */
function openPreview(i) {
  const f = state.frames[i], dlg = $('preview')
  if (!f) return
  state.previewIndex = i
  $('preview-img').src = f.url
  $('preview-shot').textContent = `SHOT ${pad2(i + 1)}`
  $('preview-dim').textContent = `${f.width} × ${f.height}`
  $('preview-note').value = state.notes[i]
  $('preview-note').placeholder = t('notePh')
  $('prev').disabled = i === 0; $('next').disabled = i === 8
  if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '') }
}
$('preview').addEventListener('close', () => {
  const i = state.previewIndex; state.previewIndex = -1
  $('frames').children[i]?.querySelector('.frame-picture')?.focus({ preventScroll: true })
})
$('preview-note').oninput = () => { if (state.previewIndex >= 0) setNote(state.previewIndex, $('preview-note').value, $('preview-note')) }
$('prev').onclick = () => openPreview(state.previewIndex - 1)
$('next').onclick = () => openPreview(state.previewIndex + 1)
$('close-preview').onclick = () => $('preview').close()
$('preview').onclick = e => { if (e.target === $('preview')) $('preview').close() }
$('preview').addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA') return
  if (e.key === 'ArrowLeft' && state.previewIndex > 0) { e.preventDefault(); openPreview(state.previewIndex - 1) }
  if (e.key === 'ArrowRight' && state.previewIndex < 8) { e.preventDefault(); openPreview(state.previewIndex + 1) }
})

/* ---------- Sample storyboard (white borders + black gutters, so detection is exercised) ---------- */
async function demo() {
  if (state.busy) return
  const W = 1800, H = 1080, M = 24, G = 24, L = 3, cw = (W - 2 * M - 2 * G) / 3, chh = (H - 2 * M - 2 * G) / 3
  const c = makeCanvas(W, H), ctx = c.getContext('2d')
  const skies = [['#2b1d2f', '#e0845c'], ['#1d2a3a', '#7aa0b8'], ['#13202a', '#3d6273'], ['#33261d', '#c79a5e'], ['#1b1f2b', '#55607d'], ['#2a1a18', '#b65a3c'], ['#162224', '#6f8f86'], ['#251d2b', '#8a6e93'], ['#0f1418', '#2c3d4a']]
  const labels = ['EXT. 码头 — 黎明', 'WIDE · 远景', 'MS · 中景', 'CU · 特写', 'POV · 主观', 'OTS · 过肩', 'INSERT · 插入', 'LOW · 仰拍', 'FADE OUT']
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 9; i++) {
    const x = M + (i % 3) * (cw + G), y = M + Math.floor(i / 3) * (chh + G), ix = x + L, iy = y + L, iw = cw - 2 * L, ih = chh - 2 * L
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, cw, chh)
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip()
    const sky = ctx.createLinearGradient(0, iy, 0, iy + ih); sky.addColorStop(0, skies[i][0]); sky.addColorStop(1, skies[i][1]); ctx.fillStyle = sky; ctx.fillRect(ix, iy, iw, ih)
    const horizon = iy + ih * (.55 + (i % 3) * .07)
    ctx.fillStyle = '#f2c98a'; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(ix + iw * (.25 + (i * .23) % .55), horizon - ih * .12, ih * (.07 + (i % 4) * .025), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(8,6,5,.82)'; ctx.fillRect(ix, horizon, iw, ih)
    for (let k = 0; k < 6; k++) { const bw = iw * (.05 + ((i + k) % 3) * .03), bx = ix + iw * ((k * .17 + i * .07) % 1), bh = ih * (.08 + ((i * 3 + k) % 5) * .05); ctx.fillRect(bx, horizon - bh, bw, bh) }
    ctx.fillStyle = 'rgba(242,236,226,.92)'; ctx.font = 'italic 64px Georgia, serif'; ctx.textAlign = 'right'; ctx.fillText(pad2(i + 1), ix + iw - 26, iy + 82); ctx.textAlign = 'left'
    ctx.font = '15px ui-monospace, Menlo, monospace'; ctx.fillStyle = 'rgba(242,236,226,.75)'; ctx.fillText(labels[i], ix + 28, iy + ih - 24)
    ctx.restore()
  }
  const blob = await toBlob(c); c.width = c.height = 0
  await importFile(new File([blob], t('demoFile'), { type: 'image/png' }))
  if (state.picture) await cut()
}

/* ---------- Events ---------- */
$('cut').onclick = cut
$('export').onclick = exportZip
$('demo').onclick = demo
$('drop').onclick = $('replace').onclick = () => $('file').click()
$('file').onchange = () => importFile($('file').files[0])
$('dock-btn').onclick = () => { const a = $('dock-btn').dataset.action; if (a === 'import') $('file').click(); else if (a === 'cut') cut(); else exportZip() }
for (const id of ['margin', 'gutter']) $(id).addEventListener('input', () => {
  if (!state.picture) return
  setCropMode('manual'); markStale()
})
document.querySelectorAll('input[name=mode]').forEach(el => el.addEventListener('change', markStale))

let dragDepth = 0
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files')
addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); if (++dragDepth === 1 && !state.busy) $('drag-overlay').classList.add('show') })
addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = state.busy ? 'none' : 'copy' } })
addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; $('drag-overlay').classList.remove('show') } })
addEventListener('drop', e => {
  if (!hasFiles(e)) return
  e.preventDefault(); dragDepth = 0; $('drag-overlay').classList.remove('show')
  const files = [...e.dataTransfer.files]
  if (files.length > 1) toast(t('multiFile'))
  importFile(files[0])
})
addEventListener('paste', e => {
  const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'))
  if (!file) return
  e.preventDefault()
  importFile(file.name ? file : new File([file], `pasted.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: file.type }))
})

$('language').onclick = () => {
  setLanguage(lang === 'zh' ? 'en' : 'zh'); setTheme(null, false)
  render(); updateDetection()
  if (state.previewIndex >= 0) openPreview(state.previewIndex)
}
$('theme').onclick = () => setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark')
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => setTheme(null, false))

setLanguage(lang); setTheme(null, false); render()
