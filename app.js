'use strict'
const $ = id => document.getElementById(id)
let picture = null, frames = [], notes = Array(9).fill(''), sourceUrl = '', storageKey = '', busy = false, loadId = 0, toastTimer
const encoder = new TextEncoder()
function toast(message) { $('toast').textContent = T(message); $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 3500) }
function saveNotes() { if (!storageKey) return; try { localStorage.setItem(storageKey, JSON.stringify(notes)) } catch { toast('浏览器存储已满，备注仍可随 ZIP 下载') } }
function render() {
  $('frames').replaceChildren()
  for (let i = 0; i < 9; i++) {
    const frame = frames[i], card = document.createElement('article')
    card.className = 'frame'
    card.innerHTML = `<div class="frame-top mono"><b>SHOT ${String(i + 1).padStart(2, '0')}</b><span>${frame ? frame.width + ' × ' + frame.height : T('等待裁切')}</span></div><button class="frame-picture" aria-label="${lang === 'en' ? `Preview frame ${i+1}` : `预览第 ${i+1} 帧`}" ${frame ? '' : 'disabled'}></button><div class="frame-body"><label for="note-${i}">镜头备注</label><textarea id="note-${i}" maxlength="1000" placeholder="景别、动作、对白或灵感…" ${frame ? '' : 'disabled'}></textarea><div class="frame-bottom"><span class="length">${notes[i].length} / 1000</span><button class="text-btn" ${frame ? '' : 'disabled'}>下载单帧 ↓</button></div></div>`
    const view = card.querySelector('.frame-picture')
    if (frame) { view.style.aspectRatio = `${frame.width} / ${frame.height}`; const img = document.createElement('img'); img.src = frame.url; img.alt = `分镜 ${i + 1}`; view.append(img) }
    else { const span = document.createElement('span'); span.className = 'placeholder'; span.textContent = String(i + 1).padStart(2, '0'); view.append(span) }
    view.onclick = () => { $('preview-img').src = frame.url; $('preview-note').textContent = `SHOT ${String(i + 1).padStart(2, '0')}　${notes[i]}`; $('preview').showModal() }
    const field = card.querySelector('textarea'); field.value = notes[i]
    field.oninput = () => { notes[i] = field.value; card.querySelector('.length').textContent = `${field.value.length} / 1000`; saveNotes() }
    card.querySelector('.frame-bottom button').onclick = () => downloadOne(i)
    $('frames').append(card); translateTree(card)
  }
  $('count').textContent = `${frames.length} / 9`
  $('export').disabled = !frames.length || busy
  document.querySelectorAll('.steps span')[1].classList.toggle('active', !!frames.length)
}
function clearFrames() { frames.forEach(f => URL.revokeObjectURL(f.url)); frames = []; render() }
function geometry() {
  if ($('crop-mode').value === 'auto' && picture.detected) return picture.detected.map(r => ({...r}))
  const m = Number($('margin').value), g = Number($('gutter').value)
  if (!Number.isInteger(m) || !Number.isInteger(g) || m < 0 || g < 0) throw Error(T('边距和间距须为非负整数'))
  const w = picture.width - 2 * m - 2 * g, h = picture.height - 2 * m - 2 * g
  if (w < 3 || h < 3) throw Error(T('边距或间距过大，请减小数值'))
  return Array.from({length:9}, (_, i) => { const col = i % 3, row = Math.floor(i / 3); return {x:m + Math.floor(w * col / 3) + col * g, y:m + Math.floor(h * row / 3) + row * g, width:Math.floor(w * (col + 1) / 3) - Math.floor(w * col / 3), height:Math.floor(h * (row + 1) / 3) - Math.floor(h * row / 3)} })
}
function overlay() {
  if (!picture) return
  try { const cells = geometry(); $('overlay').setAttribute('viewBox', `0 0 ${picture.width} ${picture.height}`); $('overlay').innerHTML = cells.map(c => `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="none" stroke="#d4eb88" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join(''); $('cut').disabled = false }
  catch { $('overlay').replaceChildren(); $('cut').disabled = true }
}
async function importFile(file) {
  if (busy || !file) return
  const id = ++loadId
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) return toast('请选择 PNG、JPG 或 WebP 图片')
  if (file.size > 40 * 1024 * 1024) return toast('图片超过 40 MB，请先缩小文件')
  let url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url; await img.decode()
    if (img.naturalWidth < 3 || img.naturalHeight < 3) throw Error(T('图片至少需要 3 × 3 像素'))
    if (img.naturalWidth * img.naturalHeight > 60000000) throw Error(T('图片超过 6000 万像素，请先缩小尺寸'))
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    if (id !== loadId) { URL.revokeObjectURL(url); return }
    const key = 'frame09-notes-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('')
    let restored = null; try { restored = JSON.parse(localStorage.getItem(key)) } catch {}
    notes = Array.from({length:9}, (_, i) => typeof restored?.[i] === 'string' ? restored[i].slice(0,1000) : '')
    storageKey = key; clearFrames(); if (sourceUrl) URL.revokeObjectURL(sourceUrl); sourceUrl = url
    picture = {image:img,width:img.naturalWidth,height:img.naturalHeight,name:file.name}
    picture.detected = detectBorders(img)
    $('crop-mode').value = 'auto'
    updateDetection()
    $('original').src = url; $('source').hidden = false; $('drop').hidden = true; $('drop').style.display = 'none'
    $('filename').textContent = file.name; $('dimensions').textContent = `${picture.width} × ${picture.height} px · ${(file.size / 1024 / 1024).toFixed(2)} MB`
    $('prefix').value = file.name.replace(/\.[^.]+$/, '').slice(0,60)
    $('margin').value = 0; $('gutter').value = 0; overlay()
    $('frame-info').textContent = T('图片已就绪，点击「一键裁切 9 帧」'); toast('已导入图片，可以开始裁切')
  } catch (err) { URL.revokeObjectURL(url); toast((err.message.startsWith('图片') || err.message.startsWith('Image')) ? err.message : '图片无法读取，请使用有效的 PNG、JPG 或 WebP') }
  $('file').value = ''
}
const toBlob = (canvas, type = 'image/png') => new Promise((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error(T('图片生成失败，请尝试更小的原图'))), type, .95))
function setBusy(value) { busy = value; document.querySelectorAll('.frame textarea').forEach(el => el.disabled = value || !frames.length); for (const id of ['cut','export','demo','replace','margin','gutter','crop-mode','language','format','captions','prefix']) $(id).disabled = value; if (!value) { $('cut').disabled = !picture; $('export').disabled = !frames.length } }
async function cut() {
  if (!picture || busy) return
  let rects; try { rects = geometry() } catch (e) { return toast(e.message) }
  setBusy(true); const next = []
  try {
    for (const r of rects) { const c = document.createElement('canvas'); c.width=r.width; c.height=r.height; const ctx=c.getContext('2d'); ctx.drawImage(picture.image,r.x,r.y,r.width,r.height,0,0,r.width,r.height); const blob=await toBlob(c); next.push({...r,canvas:c,url:URL.createObjectURL(blob)}) }
    clearFrames(); frames=next; render(); $('frame-info').textContent = T('9 帧已就绪 · 点击图片放大，备注可直接编辑'); toast('裁切完成，9 张单帧已就绪')
  } catch(e) { next.forEach(f=>URL.revokeObjectURL(f.url)); toast(e.message) }
  finally { setBusy(false) }
}
function wrapText(ctx, text, maxWidth) { const lines=[]; for(const paragraph of text.split('\n')) { let line=''; for(const char of paragraph) { if(line && ctx.measureText(line+char).width>maxWidth) {lines.push(line);line=char} else line+=char } lines.push(line) } return lines }
async function exportFrame(i, settings) {
  const f=frames[i], withNote=settings.captions && notes[i].trim(), c=document.createElement('canvas'); const pad=Math.max(8,Math.round(f.width*.035)), font=Math.max(12,Math.round(f.width*.025));
  let lines=[]; const measure=document.createElement('canvas').getContext('2d'); measure.font=`${font}px sans-serif`
  if(withNote) lines=wrapText(measure,notes[i],Math.max(1,f.width-pad*2))
  c.width=f.width; c.height=f.height+(withNote?pad*2+lines.length*Math.ceil(font*1.6):0)
  if(c.width*c.height>80000000 || c.height>32767) throw Error(T('备注导出尺寸过大，请减少备注或缩小原图'))
  const ctx=c.getContext('2d'); if(settings.format==='jpeg' || withNote) {ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)}
  ctx.drawImage(f.canvas,0,0); if(withNote) {ctx.font=`${font}px sans-serif`;ctx.fillStyle='#202520';ctx.textBaseline='top';lines.forEach((line,j)=>ctx.fillText(line,pad,f.height+pad+j*Math.ceil(font*1.6)))}
  return toBlob(c,settings.format==='jpeg'?'image/jpeg':'image/png')
}
function settings() { return {format:$('format').value,captions:$('captions').checked,prefix:$('prefix').value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/\.+$/,'') || 'storyboard'} }
function fileName(i,s) { return `${s.prefix}_${String(i+1).padStart(2,'0')}.${s.format==='jpeg'?'jpg':'png'}` }
function download(blob,name) { const a=document.createElement('a'), url=URL.createObjectURL(blob); a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000) }
async function downloadOne(i) { if(busy)return;setBusy(true);try {const s=settings();download(await exportFrame(i,s),fileName(i,s))}catch(e){toast(e.message)}finally{setBusy(false)} }
// ZIP STORE format: UTF-8 names, CRC32, local headers and central directory. No network dependency.
function crc32(bytes) { let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0 }
function zip(files) {
 const parts=[],central=[];let offset=0,size=0
 for(const file of files){const name=encoder.encode(file.name),data=file.data,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);parts.push(h,data)
 const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=h.length+data.length;size+=ch.length }
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'})
}
$('export').onclick=async()=>{if(!frames.length||busy)return;setBusy(true);try{const s=settings(),files=[];for(let i=0;i<9;i++){ $('progress').textContent=`${T('正在生成')} ${i+1} / 9…`;files.push({name:fileName(i,s),data:new Uint8Array(await (await exportFrame(i,s)).arrayBuffer())}) }
 files.push({name:lang==='en'?'Notes.txt':'备注.txt',data:encoder.encode('\ufeff'+notes.map((note,i)=>`${fileName(i,s)}\n${note||T('（无备注）')}`).join('\n\n'))});files.push({name:lang==='en'?'Frames.json':'镜头清单.json',data:encoder.encode(JSON.stringify({source:picture.name,mode:$('crop-mode').value,borderDetection:!!picture.detected,margin:Number($('margin').value),gutter:Number($('gutter').value),frames:frames.map((f,i)=>({file:fileName(i,s),x:f.x,y:f.y,width:f.width,height:f.height,note:notes[i]}))},null,2))});download(zip(files),`${s.prefix}_${lang==='en'?'9-frames':'9帧'}.zip`);$('progress').textContent=T('ZIP 已生成，请在浏览器下载列表中查看');toast('9 张图片与备注已打包')}catch(e){$('progress').textContent=T('导出失败');toast(e.message)}finally{setBusy(false)}}
$('cut').onclick=cut
$('drop').onclick=$('replace').onclick=()=>$('file').click()
$('file').onchange=()=>importFile($('file').files[0])
for(const id of ['margin','gutter']) $(id).oninput=()=>{if(!picture)return;$('crop-mode').value='manual';updateDetection();clearFrames();overlay();$('frame-info').textContent=T('裁切设置已更改，请重新裁切')}
document.addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('dragging')})
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)$('drop').classList.remove('dragging')})
document.addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('dragging');if(e.dataTransfer.files.length>1)toast('一次处理一张图片，已选择第一张');importFile(e.dataTransfer.files[0])})
$('close-preview').onclick=()=>$('preview').close()
$('preview').onclick=e=>{if(e.target===$('preview'))$('preview').close()}
$('demo').onclick=async()=>{const c=document.createElement('canvas');c.width=1800;c.height=1080;const ctx=c.getContext('2d');const colors=['#53634c','#787b5b','#365854','#637668','#9b916e','#526472','#857c62','#526553','#415653'];for(let i=0;i<9;i++){const x=i%3*600,y=Math.floor(i/3)*360;ctx.fillStyle=colors[i];ctx.fillRect(x,y,600,360);ctx.strokeStyle='#ffffff35';ctx.lineWidth=1;ctx.strokeRect(x+26,y+26,548,308);ctx.fillStyle='#eef0db';ctx.font='100px sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),x+42,y+180);ctx.font='16px monospace';ctx.fillText('FRAME / 09   ·   TEST GRID',x+44,y+292)}await importFile(new File([await toBlob(c)],'九宫格示例.png',{type:'image/png'}));await cut()}
render()

function updateDetection() { $('detection-info').textContent = T($('crop-mode').value === 'manual' ? '手动模式：按外边距与格间距等分。' : picture?.detected ? '已识别 9 个画框，自动移除黑色间隔与白色细框。' : '未识别到规则画框，使用等分；可手动调整边距。') }
$('crop-mode').onchange=()=>{ if(!picture)return; clearFrames(); updateDetection(); overlay(); $('frame-info').textContent=T('裁切设置已更改，请重新裁切') }
$('language').onclick=()=>{ setLanguage(lang==='zh'?'en':'zh'); render(); if(picture)updateDetection() }
$('theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light')
setLanguage(lang); setTheme(savedTheme)
