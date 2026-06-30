import { chromium } from 'patchright';
const URL = process.argv[2];
const REFERER = process.argv[3] || '';
const SECS = Number(process.argv[4] || 45);
// Worker's launch config (lib.mjs): patchright supplies its own stealth — no init script, no anti-AC flag.
const browser = await chromium.launch({ headless: false, args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required','--mute-audio'] });
const ctx = await browser.newContext({ viewport:{width:1280,height:720}, ignoreHTTPSErrors:true, extraHTTPHeaders: REFERER ? { referer: REFERER } : {} });
const hits=new Map(), subs=new Map();
function wire(pg){ pg.on('request',r=>{const u=r.url();
  if(/\.m3u8(\?|$)/i.test(u)&&!hits.has(u))hits.set(u,r.headers()['referer']||'');
  if(/\.mp4(\?|$)/i.test(u)&&(r.resourceType()==='media'||/[?&](sign|token|expires|e)=/i.test(u))&&!hits.has(u))hits.set(u,r.headers()['referer']||'');
  if(/\.(vtt|srt)(\?|$)/i.test(u)&&!subs.has(u))subs.set(u,1);
}); }
const page=await ctx.newPage(); wire(page); ctx.on('page',p=>{wire(p);if(p!==page)p.waitForTimeout(800).then(()=>p.close().catch(()=>{}));});
try{ await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000}); }catch(e){ console.log('goto:',e.message); }
const end=Date.now()+SECS*1000;
while(Date.now()<end && hits.size===0){
  try{await page.mouse.click(640,360);}catch{}
  for(const f of page.frames()){ try{ await f.evaluate(()=>{document.querySelectorAll('video').forEach(v=>v.play?.().catch(()=>{}));for(const s of ['.video-play-button','#player_button','.play-button','.jw-icon-display','.vjs-big-play-button','[class*=play i]','.server','li.server','[data-server]','button'])document.querySelector(s)?.click?.();}); }catch{} }
  await page.waitForTimeout(1500);
}
console.log(`\n### ${URL}\n  hits=${hits.size} subs=${subs.size}`);
for(const [u,r] of hits)console.log(`  STREAM ${u.slice(0,150)}\n     ref=${r}`);
await browser.close(); process.exit(0);
