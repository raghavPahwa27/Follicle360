// OCR finds candidates only. Users must review against the printed label.
export function parseLabel(text) {
  const batch = text.match(/(?:\bBATCH(?:\s*(?:NO\.?|NUMBER))?|\bB\.?\s*NO\.?|\bLOT(?:\s*NO\.?)?)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{1,63})/i)?.[1] || '';
  const expiryLine = text.match(/\b(?:EXP(?:IRY|IRES|IRATION)?(?:\s*DATE)?|USE\s*BY|BEST\s*BEFORE)\s*[:.-]?\s*([^\n]+)/i)?.[1]?.trim() || '';
  let expiry = '', note = '';
  const date = (y,m,d) => {
    const value = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const parsed = new Date(value+'T00:00:00Z');
    return y>=2000 && y<=2100 && Number.isFinite(+parsed) && parsed.toISOString().slice(0,10)===value ? value : '';
  };
  const iso = expiryLine.match(/^(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  const full = expiryLine.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  const month = expiryLine.match(/^(\d{1,2})[-/](20\d{2}|\d{2})\b/);
  const named = expiryLine.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s/.-]+(20\d{2}|\d{2})\b/i);
  if(iso) expiry=date(+iso[1],+iso[2],+iso[3]);
  else if(full) {
    if(+full[1]>12 || full[1]===full[2]) expiry=date(+full[3],+full[2],+full[1]);
    else note='Date order is ambiguous. Enter the expiry exactly as intended on the label.';
  } else if(month || named) {
    const m=month ? +month[1] : ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(named[1].toUpperCase())+1;
    const raw=(month || named)[2], y=raw.length===2 ? 2000+Number(raw):Number(raw);
    expiry=date(y,m,new Date(Date.UTC(y,m,0)).getUTCDate());
    if(expiry) note='Month-only expiry: using the last day of that month. Confirm against the pack.';
  }
  return {batch,expiry,note:note || (!expiry ? 'Expiry not confidently read. Enter it manually from the label.' : 'Review both fields against your pack before checking.')};
}
let scriptPromise;
function loadOCR() {
  if(window.Tesseract) return Promise.resolve();
  return scriptPromise ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script'); script.src='/vendor/ocr/tesseract.min.js';
    script.onload=resolve; script.onerror=()=>{scriptPromise=null;script.remove();reject(new Error('OCR could not load'));};document.head.append(script);
  });
}
export async function extractLabel(file, report) {
  if(!file || !file.type.startsWith('image/')) throw new Error('Choose an image of the batch and expiry label.');
  if(file.size>15*1024*1024) throw new Error('Choose a photo smaller than 15 MB.');
  await loadOCR();
  let worker, timer, expired=false;
  const work=async()=>{
    worker=await window.Tesseract.createWorker('eng',1,{workerPath:'/vendor/ocr/worker.min.js',corePath:'/vendor/ocr/core',langPath:'/vendor/ocr/lang',logger:m=>report(m.status==='recognizing text' ? `Reading label… ${Math.round(m.progress*100)}%` : 'Preparing photo reader…')});
    if(expired) {await worker.terminate();throw new Error('Reader timed out');}
    const {data}=await worker.recognize(file);
    return {...parseLabel(data.text),text:data.text};
  };
  try {return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('Photo reading timed out. Try a clearer crop or enter details manually.'));},60000);})]);}
  finally {clearTimeout(timer);if(worker) await worker.terminate();}
}
