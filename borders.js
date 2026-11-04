// Detect six long bright frame edges per axis, only when they form a regular 3×3 grid.
// Scene content is never trimmed by its brightness alone. Uncertain images use equal division.
function detectBorders(image) {
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0)
  const {width:w,height:h}=canvas, data=ctx.getImageData(0,0,w,h).data
  const cols=new Uint32Array(w),rows=new Uint32Array(h)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(data[k]>195&&data[k+1]>195&&data[k+2]>195&&data[k+3]>240){cols[x]++;rows[y]++}}
  function edges(projection,cross){
    const runs=[];for(let i=0;i<projection.length;i++){if(projection[i]/cross>.84){const last=runs.at(-1);if(last&&last.end===i-1)last.end=i;else runs.push({start:i,end:i})}}
    if(runs.length!==6)return null
    const n=projection.length, cells=[]
    for(let i=0;i<3;i++){const left=runs[i*2],right=runs[i*2+1];if(left.end-left.start>n*.015||right.end-right.start>n*.015)return null
      // One additional pixel rejects JPEG ringing around the high-contrast frame.
      const start=left.end+2,end=right.start-1,size=end-start
      if(size<n*.25||size>n*.36||Math.abs((start+end)/2-n*(i+.5)/3)>n*.045)return null
      cells.push({start,size})}
    return cells
  }
  const xs=edges(cols,h),ys=edges(rows,w)
  if(!xs||!ys)return null
  return Array.from({length:9},(_,i)=>({x:xs[i%3].start,y:ys[Math.floor(i/3)].start,width:xs[i%3].size,height:ys[Math.floor(i/3)].size}))
}
