import records from './demo-products.json';
const reply = (data: unknown, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const limits = new Map<string, {count:number, until:number}>();
export async function handleAPI(request: Request, env: {GROQ_API_KEY?:string; GROQ_MODEL?:string}) {
  const path = new URL(request.url).pathname;
  if(request.method !== 'POST') return reply({error:'Method not allowed'},405);
  const origin = request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return reply({error:'Origin not allowed'},403);
  if(Number(request.headers.get('content-length')) > 60000) return reply({error:'Request too large'},413);
  let data;
  try {const text = await request.text(); if(text.length>60000) return reply({error:'Request too large'},413);data=JSON.parse(text);} catch {return reply({error:'Invalid JSON'},400);}
  if(!data || typeof data !== 'object') return reply({error:'Invalid request'},400);
  if(path==='/api/verify') {
    const {code,batch,expiry}=data, byBatch=typeof code!=='string', identifier=byBatch?batch:code;
    if(typeof identifier!=='string' || !/^[A-Z0-9/-]{1,64}$/i.test(identifier.trim())) return reply({error:'Enter a valid code or batch number.'},400);
    const parsed=typeof expiry==='string' && /^20\d{2}-\d{2}-\d{2}$/.test(expiry)?new Date(expiry+'T00:00:00Z'):null;
    if(byBatch && (!parsed || !Number.isFinite(+parsed) || parsed.toISOString().slice(0,10)!==expiry)) return reply({error:'Enter a valid expiry date.'},400);
    const product=records.find(p=>p[byBatch?'batch':'code']===identifier.trim().toUpperCase());
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
    const status=byBatch && expiry<today?'expired':!product?'unknown':byBatch && expiry!==product.expiry?'mismatch':product.expiry<today?'expired':'matched';
    return reply({status,product:product || null,demo:true});
  }
  if(path!=='/api/coach') return reply({error:'Not found'},404);
  if(!env.GROQ_API_KEY) return reply({error:'AI Coach is not configured.'},503);
  const messages=data.messages;
  if(!Array.isArray(messages) || messages.length<1 || messages.length>40 || messages.some(m=>!m || !['system','user','assistant'].includes(m.role) || typeof m.content!=='string' || m.content.length>20000)) return reply({error:'Chat is too long or invalid. Clear the chat and try again.'},400);
  const now=Date.now(), ip=request.headers.get('cf-connecting-ip') || 'unknown';
  for(const [key,value] of limits) if(value.until<now) limits.delete(key);
  const limit=limits.get(ip) || {count:0,until:now+600000};
  if(limit.count>=20 || limits.size>5000) return reply({error:'Demo message limit reached. Try again in 10 minutes.'},429);
  limit.count++;limits.set(ip,limit);
  try {
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.GROQ_API_KEY}`},body:JSON.stringify({model:env.GROQ_MODEL || 'openai/gpt-oss-120b',messages,max_completion_tokens:2048,reasoning_effort:'low',temperature:0.7}),signal:AbortSignal.timeout(25000)});
    if(!response.ok) return reply({error:response.status===429?'Coach is busy. Try again shortly.':'Coach is temporarily unavailable.'},502);
    const result=await response.json() as {choices?:{message?:{content?:string}}[]};
    const content=result.choices?.[0]?.message?.content;
    return content ? reply({reply:content}) : reply({error:'No response received. Please try again.'},502);
  } catch {return reply({error:'Coach request timed out. Please try again.'},504);}
}
