'use strict'
// Key-based translations. Every visible string lives here; markup only carries data-i18n keys.
const STRINGS = {
  zh: {
    title: 'FRAME / 09 — 九宫格分镜裁切器',
    tagline: '九宫格分镜裁切',
    local: '本地处理 · 不上传',
    headline: '九个镜头，<em>一次</em>拆分。',
    lede: '导入一张九宫格分镜，按原始像素拆成 9 张单帧，逐帧写下备注，再一次打包下载。',
    step1: '导入', step2: '裁切与备注', step3: '导出',
    source: '原始分镜', demo: '试用示例 ↗',
    dropTitle: '点击、拖入或粘贴九宫格图片',
    dropMeta: 'PNG · JPG · WebP — 最大 40 MB',
    replace: '更换',
    crop: '裁切设置', modeAuto: '自动识别画框', modeManual: '手动等分',
    margin: '外边距', gutter: '格间距',
    spacingHint: '修改数值会切换到手动等分。编号从左到右、从上到下。',
    cutBtn: '裁切 9 帧', recut: '重新裁切', cutting: '正在裁切…',
    export: '导出', prefix: '文件名前缀', format: '图片格式',
    png: 'PNG 无损', jpeg: 'JPG 高质量',
    captions: '在图片下方附加备注', captionsHint: '增加白色备注区，不覆盖画面',
    zipHint: 'ZIP 内含 9 张图片、备注.txt 与镜头清单.json',
    download: '下载 ZIP', dockImport: '导入九宫格图片',
    sequence: '镜头序列',
    seqEmpty: '导入图片后，九个镜头会出现在这里',
    seqReady: '图片已就绪，点击「裁切 9 帧」',
    seqDone: '点击画面放大 · 备注自动保存',
    seqStale: '设置已更改，请重新裁切',
    awaiting: '等待裁切', noteLabel: '镜头备注', notePh: '景别、动作、对白或灵感…',
    dlOne: '下载 ↓',
    previewOf: n => `预览第 ${n} 帧`, downloadOf: n => `下载第 ${n} 帧`,
    foot1: '图片只在当前设备处理', foot2: '备注按图片指纹保存在本机浏览器',
    footer: '让分镜进入下一步。',
    dropOverlay: '松开即可导入',
    detecting: '正在识别画框…',
    detected: '已识别 9 个画框，自动去除白框与黑色间隔。',
    notDetected: '未识别到规则画框，已按九宫格等分；可手动调整边距。',
    manualInfo: '手动模式：按外边距与格间距等分。',
    close: '关闭', prev: '上一帧', next: '下一帧',
    toLight: '切换到浅色主题', toDark: '切换到深色主题', langBtn: 'EN', langAria: 'Switch to English',
    progress: i => `正在生成 ${i} / 9…`,
    zipDone: 'ZIP 已生成，请查看浏览器下载列表', packaged: '9 张图片与备注已打包',
    exportFail: '导出失败，请重试或缩小原图',
    noNote: '（无备注）', multiFile: '一次处理一张图片，已选择第一张',
    storageFull: '浏览器存储已满，备注仍会随 ZIP 导出',
    cutDone: '裁切完成，9 张单帧已就绪', loaded: '图片已导入',
    notesRestored: '已恢复这张图片之前的备注', settingsChanged: '裁切设置已更改，请重新裁切',
    errSpacing: '边距和间距须为非负整数', errSpacingLarge: '边距或间距过大，请减小数值',
    errType: '请选择 PNG、JPG 或 WebP 图片', errHeic: 'HEIC 格式暂不支持，请先导出为 JPG 或 PNG',
    errSize: '图片超过 40 MB，请先压缩', errTiny: '图片至少需要 3 × 3 像素',
    errPixels: '图片超过 6000 万像素，请先缩小尺寸',
    errRead: '图片无法读取，请使用有效的 PNG、JPG 或 WebP',
    errCanvas: '图片生成失败，设备内存可能不足，请尝试更小的原图',
    errCaption: '附加备注后尺寸过大，请缩短备注或缩小原图',
    zipName: '9帧', notesFile: '备注.txt', jsonFile: '镜头清单.json', demoFile: '九宫格示例.png'
  },
  en: {
    title: 'FRAME / 09 — Storyboard Cutter',
    tagline: '3×3 storyboard cutter',
    local: 'On-device · No uploads',
    headline: 'Nine frames. <em>One</em> cut.',
    lede: 'Drop in a 3×3 storyboard. Get nine full-resolution frames, write a note for each shot, and download them as one ZIP.',
    step1: 'Import', step2: 'Crop & annotate', step3: 'Export',
    source: 'Source storyboard', demo: 'Try a sample ↗',
    dropTitle: 'Click, drop or paste a storyboard',
    dropMeta: 'PNG · JPG · WebP — up to 40 MB',
    replace: 'Replace',
    crop: 'Crop settings', modeAuto: 'Detect borders', modeManual: 'Manual grid',
    margin: 'Margin', gutter: 'Gutter',
    spacingHint: 'Editing spacing switches to manual grid. Shots are numbered left to right, top to bottom.',
    cutBtn: 'Crop 9 frames', recut: 'Crop again', cutting: 'Cropping…',
    export: 'Export', prefix: 'Filename prefix', format: 'Image format',
    png: 'PNG lossless', jpeg: 'JPG high quality',
    captions: 'Append notes below each image', captionsHint: 'Adds a white caption strip; never covers the frame',
    zipHint: 'ZIP contains 9 images, Notes.txt and Frames.json',
    download: 'Download ZIP', dockImport: 'Import a storyboard',
    sequence: 'Shot sequence',
    seqEmpty: 'Your nine shots appear here after import',
    seqReady: 'Image ready — press “Crop 9 frames”',
    seqDone: 'Click a frame to enlarge · notes save automatically',
    seqStale: 'Settings changed — crop again',
    awaiting: 'Awaiting crop', noteLabel: 'Shot notes', notePh: 'Framing, action, dialogue, ideas…',
    dlOne: 'Download ↓',
    previewOf: n => `Preview frame ${n}`, downloadOf: n => `Download frame ${n}`,
    foot1: 'Images never leave this device', foot2: 'Notes are kept in this browser, keyed to the image',
    footer: 'Your next shot starts here.',
    dropOverlay: 'Release to import',
    detecting: 'Detecting frame borders…',
    detected: '9 frames detected — white borders and gutters removed.',
    notDetected: 'No regular borders found — using an equal grid. Adjust spacing if needed.',
    manualInfo: 'Manual: equal division using margin and gutter.',
    close: 'Close', prev: 'Previous frame', next: 'Next frame',
    toLight: 'Switch to light theme', toDark: 'Switch to dark theme', langBtn: '中', langAria: '切换到中文',
    progress: i => `Generating ${i} / 9…`,
    zipDone: 'ZIP ready — check your browser downloads', packaged: '9 images and notes packaged',
    exportFail: 'Export failed. Try again or use a smaller source.',
    noNote: '(no notes)', multiFile: 'One image at a time — using the first file',
    storageFull: 'Browser storage is full. Notes are still included in the ZIP.',
    cutDone: 'Done — 9 frames ready', loaded: 'Image loaded',
    notesRestored: 'Restored your earlier notes for this image', settingsChanged: 'Crop settings changed — crop again',
    errSpacing: 'Spacing must be a non-negative whole number', errSpacingLarge: 'Spacing is too large. Reduce it.',
    errType: 'Choose a PNG, JPG or WebP image', errHeic: 'HEIC is not supported yet. Export as JPG or PNG first.',
    errSize: 'Image exceeds 40 MB. Compress it first.', errTiny: 'Image must be at least 3 × 3 pixels',
    errPixels: 'Image exceeds 60 megapixels. Resize it first.',
    errRead: 'Unable to read image. Use a valid PNG, JPG or WebP.',
    errCanvas: 'Could not render the image — the device may be low on memory. Try a smaller source.',
    errCaption: 'Captioned output is too large. Shorten notes or use a smaller source.',
    zipName: '9-frames', notesFile: 'Notes.txt', jsonFile: 'Frames.json', demoFile: 'storyboard-sample.png'
  }
}

let lang = 'zh'
try { const saved = localStorage.getItem('frame09-language'); lang = saved === 'en' || saved === 'zh' ? saved : (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en' } catch {}

function t(key, ...args) {
  const value = STRINGS[lang][key] ?? STRINGS.zh[key] ?? key
  return typeof value === 'function' ? value(...args) : value
}

function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n) })
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml) }) // trusted, static strings only
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh) })
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)) })
}

function setLanguage(value) {
  lang = value === 'en' ? 'en' : 'zh'
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  document.documentElement.dataset.lang = lang
  document.title = t('title')
  applyI18n()
  const btn = document.getElementById('language')
  btn.textContent = t('langBtn'); btn.setAttribute('aria-label', t('langAria'))
  try { localStorage.setItem('frame09-language', lang) } catch {}
}

function effectiveTheme() {
  return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

function setTheme(value, persist = true) {
  if (value) document.documentElement.dataset.theme = value
  const dark = effectiveTheme() === 'dark', btn = document.getElementById('theme')
  btn.dataset.mode = dark ? 'dark' : 'light'
  btn.setAttribute('aria-label', t(dark ? 'toLight' : 'toDark'))
  btn.title = btn.getAttribute('aria-label')
  if (persist && value) try { localStorage.setItem('frame09-theme', value) } catch {}
}
