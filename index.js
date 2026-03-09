/**
 * World Rules Tracker v2.0 — SillyTavern Extension
 * Vector activation, token budgets, priorities, compact mode, AI condensation
 */
(() => {
'use strict';
const MK='world_rules_tracker';
const PI={N:0,I:1,C:2};
const PL={0:'\u26AA',1:'\uD83D\uDFE1',2:'\uD83D\uDD34'};
const PN={0:'\u041E\u0431\u044B\u0447\u043D\u044B\u0439',1:'\u0412\u0430\u0436\u043D\u044B\u0439',2:'\u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439'};

let activeTab='world',_cc={},_pa=false,_kn=new Set(),_sq='';
let _cp={w:'',p:'',r:''},_pd=true;
let _vs=null,_vc={},_va=new Set(),_vt=null,_vb=false;

function ctx(){return SillyTavern.getContext();}
function getHdrs(){try{const h=ctx().getRequestHeaders?.();if(h)return h;}catch(e){}return{'Content-Type':'application/json'};}

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function sH(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return h.toString(36);}

// Russian morphology
function ruS(w){
  if(!w)return '';w=w.toLowerCase().trim();
  for(const s of['\u0430\u043C\u0438','\u044F\u043C\u0438','\u043E\u0433\u043E','\u0435\u0433\u043E','\u043E\u043C\u0443','\u0435\u043C\u0443','\u044B\u043C\u0438','\u0438\u043C\u0438','\u0430\u0445','\u044F\u0445','\u043E\u0432','\u0435\u0432','\u0435\u0439','\u0438\u0439','\u043E\u0439','\u0443\u044E','\u044E\u044E','\u043E\u043C','\u0435\u043C','\u0451\u043C','\u0430\u043C','\u044F\u043C','\u044B\u043C','\u0438\u043C','\u0430','\u044F','\u0443','\u044E','\u0435','\u0451','\u0438','\u044B','\u043E']){
    if(w.length>s.length+2&&w.endsWith(s))return w.slice(0,-s.length);
  }
  return w;
}
function km(kw,text){
  if(!kw||!text)return false;
  const kl=kw.toLowerCase(),ks=ruS(kw);
  for(const w of text.toLowerCase().split(/[\s,.!?;:()\[\]{}"'\u00AB\u00BB\u2014\u2013\-\/\\]+/)){
    if(w===kl)return true;
    if(ks.length>=3&&ruS(w)===ks)return true;
  }
  return false;
}
function akm(kws,text){if(!kws||!kws.length)return false;for(const k of kws)if(km(k,text))return true;return false;}
function rChat(d){return(ctx().chat||[]).slice(-Math.max(d||5,3)).map(m=>m.mes||'').join(' ');}

// ---- Vector support ----
async function chkVec(){
  if(_vs!==null)return _vs;
  try{
    const r=await fetch('/api/embeddings/compute',{method:'POST',headers:getHdrs(),body:JSON.stringify({text:'test',source:'wrt'})});
    if(r.ok){const d=await r.json();const v=d.embedding||d.vector;_vs=!!(v&&v.length>0);}
    else _vs=false;
  }catch(e){_vs=false;}
  console.log('[WRT] Vec:',_vs);return _vs;
}
async function getEmb(text){
  try{
    const r=await fetch('/api/embeddings/compute',{method:'POST',headers:getHdrs(),body:JSON.stringify({text:text.slice(0,500),source:'wrt'})});
    if(!r.ok)return null;const d=await r.json();return d.embedding||d.vector||null;
  }catch(e){return null;}
}
function cos(a,b){
  if(!a||!b||a.length!==b.length)return 0;
  let d=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
  return na&&nb?d/(Math.sqrt(na)*Math.sqrt(nb)):0;
}
async function cacheVec(id,text){const h=sH(text);if(_vc[id]&&_vc[id].hash===h)return;const v=await getEmb(text);if(v)_vc[id]={hash:h,vec:v};}

async function procVec(){
  const s=gs();if(!s.useVectors||!_vs||_vb)return;_vb=true;
  try{
    const text=rChat(s.keywordDepth||5);if(!text.trim()){_vb=false;return;}
    const cv=await getEmb(text.slice(-1500));if(!cv){_vb=false;return;}
    const th=s.vectorThreshold||0.55;const act=new Set();const all=[];
    s.worldRules.forEach(c=>c.rules.forEach(r=>{if(r.enabled)all.push({id:r.id,text:r.text,cid:c.id});}));
    s.personalRules.forEach(c=>c.rules.forEach(r=>{if(r.enabled)all.push({id:r.id,text:r.text,cid:c.id});}));
    s.relationshipRules.forEach(p=>p.rules.forEach(r=>{if(r.enabled)all.push({id:r.id,text:r.text,cid:p.id});}));
    let cached=0;
    for(const r of all){
      const h=sH(r.text);
      if(!_vc[r.id]||_vc[r.id].hash!==h){if(cached<5){await cacheVec(r.id,r.text);cached++;}continue;}
      if(cos(cv,_vc[r.id].vec)>=th){act.add(r.id);act.add('c_'+r.cid);}
    }
    const changed=act.size!==_va.size||[...act].some(id=>!_va.has(id));
    _va=act;
    if(changed){_pd=true;await uP();if(_imo())rT();}
  }catch(e){console.warn('[WRT] vec:',e);}
  _vb=false;
}
function schVec(){clearTimeout(_vt);_vt=setTimeout(()=>procVec(),1500);}

// ---- Names ----
function cNames(){
  const s=gs(),n=new Set();
  s.personalRules.forEach(c=>{if(c.name)n.add(c.name);(c.keywords||[]).forEach(k=>n.add(k));});
  s.relationshipRules.forEach(p=>{if(p.char1)n.add(p.char1);if(p.char2)n.add(p.char2);});
  try{ctx().characters&&ctx().characters.forEach(c=>{if(c.name)n.add(c.name);});}catch(e){}
  _kn=n;return n;
}

// ---- Storage ----
function df(){return{enabled:true,worldRules:[],personalRules:[],relationshipRules:[],depthWorld:0,depthPersonal:1,depthRelations:2,scanDepth:50,keywordDepth:5,scanWithLorebook:false,tokenBudgetWorld:0,tokenBudgetPersonal:0,tokenBudgetRelations:0,compactMode:false,injectDates:false,useVectors:false,vectorThreshold:0.55};}
function _pc(){try{const c=ctx();return!!(c.chat_metadata&&typeof c.saveMetadata==='function');}catch(e){return false;}}
function gs(){
  const c=ctx();let s;
  if(_pc()){if(!c.chat_metadata[MK])c.chat_metadata[MK]=df();s=c.chat_metadata[MK];}
  else{if(!c.extensionSettings[MK])c.extensionSettings[MK]=df();s=c.extensionSettings[MK];}
  const d=df();for(const k in d)if(s[k]===undefined)s[k]=d[k];
  if(!Array.isArray(s.worldRules))s.worldRules=[];
  if(!Array.isArray(s.personalRules))s.personalRules=[];
  if(!Array.isArray(s.relationshipRules))s.relationshipRules=[];
  s.worldRules.forEach(c=>{if(!Array.isArray(c.rules))c.rules=[];if(!Array.isArray(c.keywords))c.keywords=[];if(c.enabled===undefined)c.enabled=true;c.rules.forEach(r=>{if(r.enabled===undefined)r.enabled=true;if(r.sticky===undefined)r.sticky=false;if(r.priority===undefined)r.priority=0;});});
  s.personalRules.forEach(c=>{if(!Array.isArray(c.rules))c.rules=[];if(!Array.isArray(c.keywords))c.keywords=[];c.rules.forEach(r=>{if(r.enabled===undefined)r.enabled=true;if(r.priority===undefined)r.priority=0;});});
  s.relationshipRules.forEach(p=>{if(!Array.isArray(p.rules))p.rules=[];if(!Array.isArray(p.keywords))p.keywords=[];if(p.activationMode===undefined)p.activationMode='strict';p.rules.forEach(r=>{if(r.enabled===undefined)r.enabled=true;if(r.priority===undefined)r.priority=0;});});
  return s;
}
function sv(){_pd=true;const c=ctx();try{if(_pc())c.saveMetadata();else if(typeof c.saveSettingsDebounced==='function')c.saveSettingsDebounced();}catch(e){}}

// ---- Token ----
function tE(t){if(!t)return 0;const c=(t.match(/[\u0400-\u04FF]/g)||[]).length;return Math.ceil((t.length-c)/4+c/2);}
function aB(rules,bud,fn){
  if(!bud||bud<=0)return rules;let cur=[...rules];
  if(tE(fn(cur))<=bud)return cur;
  const rem=cur.map((r,i)=>({r,i,p:r.priority||0})).filter(x=>x.p<PI.C).sort((a,b)=>a.p-b.p||b.i-a.i);
  for(const c of rem){cur=cur.filter(r=>r!==c.r);if(tE(fn(cur))<=bud)break;}
  return cur;
}

// ---- Activation ----
function _iCC(n){if(!n)return false;try{const cn=ctx().characters?.[ctx().characterId]?.name;if(cn&&(cn.toLowerCase()===n.toLowerCase()||ruS(cn)===ruS(n)))return true;}catch(e){}return false;}
function wCA(cat,rt){
  if(cat.rules.some(r=>r.enabled&&r.sticky))return true;
  if(!cat.keywords||!cat.keywords.length)return true;
  if(akm(cat.keywords,rt))return true;
  if(_va.has('c_'+cat.id))return true;
  return false;
}
function pA(ch,rt){return _iCC(ch.name)||akm([ch.name,...(ch.keywords||[])],rt)||_va.has('c_'+ch.id);}
function rA(p,rt){
  const c1=_iCC(p.char1)||akm([p.char1,...(p.keywords||[]).filter(k=>ruS(k)===ruS(p.char1))],rt)||_va.has('c_'+p.id);
  const c2=_iCC(p.char2)||akm([p.char2,...(p.keywords||[]).filter(k=>ruS(k)===ruS(p.char2))],rt)||_va.has('c_'+p.id);
  return p.activationMode==='soft'?(c1||c2):(c1&&c2);
}

// ---- Prompt building ----
function _fR(r,s){let t=r.text;if(s.injectDates&&(r.date||r.reason))t+=' ['+[r.date,r.reason].filter(Boolean).join(' \u2014 ')+']';return t;}

function bW(){
  const s=gs(),rt=rChat(s.keywordDepth),cp=s.compactMode;const cats=[];
  s.worldRules.forEach(cat=>{
    if(!cat.enabled)return;
    if(!wCA(cat,rt)){const st=cat.rules.filter(r=>r.enabled&&r.sticky);if(st.length)cats.push({n:cat.name,rules:st});return;}
    const ar=cat.rules.filter(r=>r.enabled);if(ar.length)cats.push({n:cat.name,rules:ar});
  });
  if(!cats.length)return '';
  let all=[];cats.forEach(c=>c.rules.forEach(r=>all.push({...r,_c:c.n})));
  all=aB(all,s.tokenBudgetWorld,rls=>cp?rls.map(r=>r.text).join('; '):rls.map(r=>'- '+r.text).join('\n'));
  const cm={};all.forEach(r=>{if(!cm[r._c])cm[r._c]=[];cm[r._c].push(r);});
  if(cp)return '[R:World] '+Object.entries(cm).map(([n,rs])=>n+': '+rs.map(r=>r.text).join('; ')).join(' | ')+' [/R]';
  const ln=['[WORLD_RULES_START]'];Object.entries(cm).forEach(([n,rs])=>{ln.push('## '+n);rs.forEach(r=>ln.push('- '+r.text));});ln.push('[WORLD_RULES_END]');return ln.join('\n');
}

function bP(){
  const s=gs(),rt=rChat(s.keywordDepth),cp=s.compactMode,parts=[];
  s.personalRules.forEach(ch=>{
    if(!ch.rules.length||!pA(ch,rt))return;
    let rules=ch.rules.filter(r=>r.enabled);if(!rules.length)return;
    rules=aB(rules,s.tokenBudgetPersonal,rls=>rls.map(r=>_fR(r,s)).join(cp?'; ':'\n'));
    if(!rules.length)return;
    if(cp)parts.push('[R:'+ch.name+'] '+rules.map(r=>_fR(r,s)).join('; ')+' [/R]');
    else{const ln=['[PERSONAL: '+ch.name+']'];rules.forEach(r=>ln.push('- '+_fR(r,s)));ln.push('[/PERSONAL]');parts.push(ln.join('\n'));}
  });
  return parts.join('\n');
}

function bR(){
  const s=gs(),rt=rChat(s.keywordDepth),cp=s.compactMode,parts=[];
  s.relationshipRules.forEach(p=>{
    if(!p.rules.length||!rA(p,rt))return;
    let rules=p.rules.filter(r=>r.enabled);if(!rules.length)return;
    rules=aB(rules,s.tokenBudgetRelations,rls=>rls.map(r=>_fR(r,s)).join(cp?'; ':'\n'));
    if(!rules.length)return;
    const lb=p.char1+'\u2192'+p.char2;
    if(cp)parts.push('[R:'+lb+'] '+rules.map(r=>_fR(r,s)).join('; ')+' [/R]');
    else{const ln=['[REL: '+lb+']'];rules.forEach(r=>ln.push('- '+_fR(r,s)));ln.push('[/REL]');parts.push(ln.join('\n'));}
  });
  return parts.join('\n');
}

// ---- Injection ----
async function uP(){
  const s=gs();const{setExtensionPrompt:sep,extension_prompt_types:ept}=ctx();
  if(!sep){_pa=false;_uUI();return;}const pt=ept?.IN_PROMPT??0;
  if(!s.enabled){sep(MK+'_w','',pt,0);sep(MK+'_p','',pt,0);sep(MK+'_r','',pt,0);_pa=false;}
  else{const w=bW(),p=bP(),r=bR();_cp={w,p,r};sep(MK+'_w',w,pt,s.depthWorld||0);sep(MK+'_p',p,pt,s.depthPersonal||1);sep(MK+'_r',r,pt,s.depthRelations||2);_pa=!!(w||p||r);}
  _pd=false;_uUI();
}
function _uUI(){
  $('#wrt_prompt_dot').css('color',_pa?'#34d399':'#4a5568');
  const $t=$('#wrt_modal_tokens');if(!$t.length)return;
  if(_pa){const w=tE(_cp.w),p=tE(_cp.p),r=tE(_cp.r);$t.html('<span style="color:#c084fc">\uD83C\uDF0D'+w+'</span> \u00B7 <span style="color:#38bdf8">\uD83D\uDC64'+p+'</span> \u00B7 <span style="color:#fb7185">\uD83D\uDC9E'+r+'</span> \u00B7 \u03A3'+(w+p+r)).css('color','#34d399');}
  else $t.text('\u25CB \u0432\u044B\u043A\u043B').css('color','#4a5568');
}

// ---- AI ----
function exAi(d){
  if(d?.choices?.[0]?.message?.content!==undefined)return d.choices[0].message.content;
  if(d?.choices?.[0]?.text!==undefined)return d.choices[0].text;
  if(typeof d?.response==='string')return d.response;
  if(Array.isArray(d?.content)){const t=d.content.find(b=>b.type==='text');return t?.text??null;}
  if(typeof d?.content==='string')return d.content;return null;
}
async function aiG(uPr,sP){
  const c=ctx(),full=sP+'\n\n---\n\n'+uPr;
  if(typeof c.generateRaw==='function'){try{const r=await c.generateRaw(full,'',false,false,'','normal');if(r?.trim())return r;}catch(e){}}
  for(const ep of[
    {url:'/api/backends/chat-completions/generate',body:()=>({messages:[{role:'system',content:sP},{role:'user',content:uPr}],stream:false})},
    {url:'/api/generate',body:()=>({prompt:full,max_new_tokens:2000,stream:false})},
    {url:'/generate',body:()=>({prompt:full,max_new_tokens:2000,stream:false})}
  ]){try{const r=await fetch(ep.url,{method:'POST',headers:getHdrs(),body:JSON.stringify(ep.body())});if(!r.ok)continue;const t=exAi(await r.json());if(t?.trim())return t;}catch(e){}}
  throw new Error('\u041D\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F');
}
function cCtx(d){return(ctx().chat||[]).slice(-d).map(m=>'['+(m.is_user?'U':'C')+']: '+(m.mes||'').slice(0,600)).join('\n\n');}
function gLore(){try{const wi=ctx().worldInfoData||ctx().worldInfo||{};const e=[];Object.values(wi).forEach(b=>{const s=b?.entries||b;if(s&&typeof s==='object')Object.values(s).forEach(x=>{if(x?.content)e.push(String(x.content));});});return e.join('\n\n');}catch(e){return '';}}

// ---- Scanning ----
async function scW(d,wl){
  const s=gs();const ex=s.worldRules.map(c=>'## '+c.name+'\n'+c.rules.map(r=>'- '+r.text).join('\n')).join('\n\n');
  const l=wl?gLore():'';
  return pWR(await aiG(
    'CHAT:\n'+(cCtx(d)||'(empty)')+(l?'\n\nLORE:\n'+l.slice(0,4000):'')+(ex?'\n\nEXISTING:\n'+ex:'')+'\n\nExtract world rules:',
    'Extract WORLD RULES. FORMAT:\n## Category\n- Rule (max 20 words)\nGroup by topic. ONLY permanent laws/mechanics. Preserve existing, ADD new. ALWAYS write rules in ENGLISH regardless of chat language.'
  ),s);
}
function pWR(t,s){
  const cats=[];let cur=null;
  (t||'').split('\n').forEach(l=>{
    const tr=l.trim();if(!tr)return;
    const cm=tr.match(/^#{1,3}\s+(.+)/);
    if(cm){cur={id:uid(),name:cm[1].trim(),enabled:true,keywords:[],rules:[]};const ex=s.worldRules.find(c=>c.name.toLowerCase()===cur.name.toLowerCase());if(ex)cur={...ex,rules:[...ex.rules]};cats.push(cur);return;}
    const rm=tr.match(/^[-\u2022*]\s+(.+)/);
    if(rm&&cur){const rt=rm[1].trim();if(rt.length>=5&&!cur.rules.some(r=>r.text.toLowerCase()===rt.toLowerCase()))cur.rules.push({id:uid(),text:rt,enabled:true,sticky:false,priority:0});}
  });return cats;
}

async function scP(name,d,wl){
  const s=gs();const ex=s.personalRules.find(c=>c.name===name);
  const et=ex?ex.rules.map(r=>'- '+r.text).join('\n'):'';const l=wl?gLore():'';
  return pRL(await aiG(
    'CHAT:\n'+(cCtx(d)||'(empty)')+(l?'\n\nLORE:\n'+l.slice(0,4000):'')+(et?'\n\nEXISTING FOR '+name+':\n'+et:'')+'\n\nExtract personal rules for '+name+':',
    'Extract PERSONAL RULES for "'+name+'". Rules=behavioral codes,limits,vows. Numbered list, max 25 words. Preserve existing, ADD new. ALWAYS write rules in ENGLISH regardless of chat language.'
  ));
}

async function scR(c1,c2,d,wl){
  const s=gs();const ex=s.relationshipRules.find(p=>p.char1===c1&&p.char2===c2);
  const et=ex?ex.rules.map(r=>'- '+r.text).join('\n'):'';const l=wl?gLore():'';
  return pRL(await aiG(
    'CHAT:\n'+(cCtx(d)||'(empty)')+(l?'\n\nLORE:\n'+l.slice(0,4000):'')+(et?'\n\nEXISTING ('+c1+'\u2192'+c2+'):\n'+et:'')+'\n\nExtract relationship rules:',
    'Extract RELATIONSHIP RULES from "'+c1+'" TOWARD "'+c2+'". Focus on how '+c1+' relates to/treats/feels about '+c2+'. Rules=pacts,dynamics,boundaries,attitudes FROM '+c1+' perspective. Mark [OUTDATED] if contradicted. Numbered list, max 25 words. ALWAYS write rules in ENGLISH regardless of chat language.'
  ));
}

function pRL(t){
  const r=[];
  (t||'').split('\n').forEach(l=>{
    const tr=l.trim();if(!tr||/^(EXISTING|OUTPUT|FORMAT|RULES|NOTE|#)/i.test(tr))return;
    const c=tr.replace(/^[-\u2022*\d.)\]]+\s*/,'');if(c.length<5)return;
    const od=/\[OUTDATED\]/i.test(c);const rt=c.replace(/\[OUTDATED\]/gi,'').trim();
    if(rt.length>=5)r.push({id:uid(),text:rt,enabled:!od,date:'',reason:'',priority:0});
  });return r;
}

// ---- Condensation ----
async function condR(rules,name){
  return pRL(await aiG(
    'Category: '+name+'\nRules:\n'+rules.map((r,i)=>(i+1)+'. '+r.text).join('\n')+'\n\nCondense:',
    'Merge overlapping rules. Output MINIMUM set preserving ALL info. Max 25 words each. Numbered list. ALWAYS write in ENGLISH.'
  ));
}

function calD(){try{const c=ctx();const cs=_pc()?c.chat_metadata?.calendar_tracker:c.extensionSettings?.calendar_tracker;return cs?.currentDate||'';}catch(e){return '';}}

// ---- Toast ----
let _tt=null;
function toast(m,c,u,d){
  c=c||'#34d399';d=d||4500;clearTimeout(_tt);$('.wrt-toast').remove();
  $('body').append('<div class="wrt-toast"><div class="wrt-toast-row"><span class="wrt-toast-dot" style="background:'+c+'"></span><span class="wrt-toast-msg">'+esc(m)+'</span>'+(u?'<button class="wrt-toast-undo">\u21A9</button>':'')+'</div></div>');
  setTimeout(()=>$('.wrt-toast').addClass('wrt-in'),10);
  if(u)$('.wrt-toast-undo').on('click',()=>{u();$('.wrt-toast').remove();});
  _tt=setTimeout(()=>{$('.wrt-toast').addClass('wrt-out');setTimeout(()=>$('.wrt-toast').remove(),300);},d);
}

// ---- Settings panel ----
function mS(){
  if($('#wrt_block').length)return;
  const $x=$('#extensions_settings2,#extensions_settings').first();if(!$x.length)return;
  $x.append('<div class="wrt-block" id="wrt_block">'
    +'<div class="wrt-hdr" id="wrt_hdr"><span class="wrt-gem">\uD83D\uDCDC</span><span class="wrt-title">World Rules</span><span class="wrt-badge" id="wrt_badge" style="display:none">0</span><span class="wrt-prompt-dot" id="wrt_prompt_dot" style="color:#4a5568">\u25CF</span><span class="wrt-chev" id="wrt_chev">\u25BE</span></div>'
    +'<div class="wrt-body" id="wrt_body">'
    +'<div class="wrt-meta" id="wrt_meta">\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_en"><span>\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_cm"><span>\u041A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 (~40%)</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_id"><span>\u0414\u0430\u0442\u044B/\u043F\u0440\u0438\u0447\u0438\u043D\u044B \u0432 \u043F\u0440\u043E\u043C\u043F\u0442\u0435</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_uv"><span>\uD83E\uDDE0 \u0421\u0435\u043C\u0430\u043D\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F</span></label>'
    +'<div class="wrt-field-label">\u0413\u043B\u0443\u0431\u0438\u043D\u0430 \u0438\u043D\u0436\u0435\u043A\u0446\u0438\u0438</div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">\uD83C\uDF0D</span><input type="range" id="wrt_dw" min="0" max="15" style="flex:1;accent-color:#c084fc;min-width:0"><span id="wrt_dwv" style="font-size:12px;color:#c084fc;min-width:18px;text-align:right">0</span></div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">\uD83D\uDC64</span><input type="range" id="wrt_dp" min="0" max="15" style="flex:1;accent-color:#38bdf8;min-width:0"><span id="wrt_dpv" style="font-size:12px;color:#38bdf8;min-width:18px;text-align:right">1</span></div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">\uD83D\uDC9E</span><input type="range" id="wrt_dr" min="0" max="15" style="flex:1;accent-color:#fb7185;min-width:0"><span id="wrt_drv" style="font-size:12px;color:#fb7185;min-width:18px;text-align:right">2</span></div>'
    +'<div class="wrt-field-label" style="margin-top:4px">\u0411\u044E\u0434\u0436\u0435\u0442 \u0442\u043E\u043A\u0435\u043D\u043E\u0432 (0=\u221E)</div>'
    +'<div class="wrt-field-row"><span class="wrt-flabel">\uD83C\uDF0D</span><input type="number" class="wrt-depth-inp" id="wrt_bw" min="0" max="2000" style="width:55px"><span class="wrt-flabel">\uD83D\uDC64</span><input type="number" class="wrt-depth-inp" id="wrt_bp" min="0" max="2000" style="width:55px"><span class="wrt-flabel">\uD83D\uDC9E</span><input type="number" class="wrt-depth-inp" id="wrt_br" min="0" max="2000" style="width:55px"></div>'
    +'<div class="wrt-field-row" style="margin-top:4px"><span class="wrt-flabel">\uD83D\uDD0D \u041A\u043B\u044E\u0447\u0438</span><input type="number" class="wrt-depth-inp" id="wrt_kwd" min="1" max="50" style="width:50px"><span style="font-size:10px;color:#3d4a60">\u0441\u043E\u043E\u0431\u0449.</span></div>'
    +'<div class="wrt-field-row" id="wrt_vtrow" style="margin-top:3px;display:none"><span class="wrt-flabel">\uD83E\uDDE0 \u041F\u043E\u0440\u043E\u0433</span><input type="range" id="wrt_vth" min="0.3" max="0.9" step="0.05" style="flex:1;accent-color:#a78bfa;min-width:0"><span id="wrt_vtv" style="font-size:12px;color:#a78bfa;min-width:30px;text-align:right">0.55</span></div>'
    +'<button class="menu_button wrt-open-btn" id="wrt_open_btn">\uD83D\uDCDC \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u0430</button>'
    +'<div class="wrt-sec"><div class="wrt-sec-hdr" id="wrt_ch"><span style="font-size:10px;color:#4a5568" id="wrt_cc2">\u25B8</span><span>\uD83D\uDD0C API</span></div>'
    +'<div class="wrt-sec-body" id="wrt_cb" style="display:none"><button class="menu_button wrt-test-btn" id="wrt_ta">\u26A1 API</button> <button class="menu_button wrt-test-btn" id="wrt_tv">\uD83E\uDDE0 Vec</button><div class="wrt-api-status" id="wrt_ts"></div></div></div>'
    +'</div></div>');
  rUI();_bS();
}

function _bS(){
  $('#wrt_hdr').on('click',()=>{const $b=$('#wrt_body');$b.slideToggle(180);$('#wrt_chev').text($b.is(':visible')?'\u25BE':'\u25B8');});
  $('#wrt_ch').on('click',()=>{const $b=$('#wrt_cb');$b.slideToggle(150);$('#wrt_cc2').text($b.is(':visible')?'\u25BE':'\u25B8');});
  $('#wrt_en').on('change',function(){gs().enabled=this.checked;sv();uP();});
  $('#wrt_cm').on('change',function(){gs().compactMode=this.checked;sv();uP();});
  $('#wrt_id').on('change',function(){gs().injectDates=this.checked;sv();uP();});
  $('#wrt_uv').on('change',async function(){
    const s=gs();s.useVectors=this.checked;sv();
    if(this.checked){const ok=await chkVec();if(!ok){toast('Vector \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D','#f87171');s.useVectors=false;this.checked=false;sv();}else{schVec();toast('\u0421\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0430 \u0432\u043A\u043B','#a78bfa');}}
    $('#wrt_vtrow').toggle(!!s.useVectors);
  });
  let _d={};const db=(k,fn)=>{clearTimeout(_d[k]);_d[k]=setTimeout(fn,400);};
  $('#wrt_dw').on('input',function(){const v=+this.value;$('#wrt_dwv').text(v);db('w',()=>{gs().depthWorld=v;sv();uP();});});
  $('#wrt_dp').on('input',function(){const v=+this.value;$('#wrt_dpv').text(v);db('p',()=>{gs().depthPersonal=v;sv();uP();});});
  $('#wrt_dr').on('input',function(){const v=+this.value;$('#wrt_drv').text(v);db('r',()=>{gs().depthRelations=v;sv();uP();});});
  $('#wrt_vth').on('input',function(){const v=+this.value;$('#wrt_vtv').text(v.toFixed(2));db('v',()=>{gs().vectorThreshold=v;sv();schVec();});});
  $('#wrt_kwd').on('change',function(){gs().keywordDepth=Math.max(1,+this.value||5);sv();uP();});
  $('#wrt_bw').on('change',function(){gs().tokenBudgetWorld=Math.max(0,+this.value||0);sv();uP();});
  $('#wrt_bp').on('change',function(){gs().tokenBudgetPersonal=Math.max(0,+this.value||0);sv();uP();});
  $('#wrt_br').on('change',function(){gs().tokenBudgetRelations=Math.max(0,+this.value||0);sv();uP();});
  $('#wrt_ta').on('click',async()=>{$('#wrt_ts').css('color','#7a8499').text('\u2026');try{await aiG('Reply: OK','Reply: OK');$('#wrt_ts').css('color','#34d399').text('\u2705 API OK');}catch(e){$('#wrt_ts').css('color','#f87171').text('\u2717 '+e.message);}});
  $('#wrt_tv').on('click',async()=>{$('#wrt_ts').css('color','#7a8499').text('\u2026');const ok=await chkVec();$('#wrt_ts').css('color',ok?'#34d399':'#f87171').text(ok?'\u2705 Vector OK':'\u2717 Vector N/A');});
  const el=document.getElementById('wrt_open_btn');
  if(el){let m=false;el.addEventListener('touchstart',e=>{m=false;e.stopPropagation();},{passive:true});el.addEventListener('touchmove',()=>{m=true;},{passive:true});el.addEventListener('touchend',e=>{if(!m){e.preventDefault();e.stopPropagation();oM();}},{passive:false});el.addEventListener('click',oM);}
}

function rUI(){
  const s=gs();
  $('#wrt_en').prop('checked',s.enabled!==false);$('#wrt_cm').prop('checked',!!s.compactMode);$('#wrt_id').prop('checked',!!s.injectDates);$('#wrt_uv').prop('checked',!!s.useVectors);
  $('#wrt_dw').val(s.depthWorld||0);$('#wrt_dwv').text(s.depthWorld||0);$('#wrt_dp').val(s.depthPersonal||1);$('#wrt_dpv').text(s.depthPersonal||1);$('#wrt_dr').val(s.depthRelations||2);$('#wrt_drv').text(s.depthRelations||2);
  $('#wrt_kwd').val(s.keywordDepth||5);$('#wrt_bw').val(s.tokenBudgetWorld||0);$('#wrt_bp').val(s.tokenBudgetPersonal||0);$('#wrt_br').val(s.tokenBudgetRelations||0);
  $('#wrt_vth').val(s.vectorThreshold||0.55);$('#wrt_vtv').text((s.vectorThreshold||0.55).toFixed(2));$('#wrt_vtrow').toggle(!!s.useVectors);
  uBg();uMt();_uUI();
}
function uBg(){const s=gs();const n=s.worldRules.reduce((a,c)=>a+c.rules.length,0)+s.personalRules.reduce((a,c)=>a+c.rules.length,0)+s.relationshipRules.reduce((a,p)=>a+p.rules.length,0);$('#wrt_badge').text(n).toggle(n>0);}
function uMt(){const s=gs(),p=[];const w=s.worldRules.reduce((a,c)=>a+c.rules.length,0),pe=s.personalRules.reduce((a,c)=>a+c.rules.length,0),r=s.relationshipRules.reduce((a,x)=>a+x.rules.length,0);if(w)p.push('\uD83C\uDF0D'+w);if(pe)p.push('\uD83D\uDC64'+pe);if(r)p.push('\uD83D\uDC9E'+r);$('#wrt_meta').text(p.join(' \u00B7 ')||'\u043D\u0435\u0442');uBg();}

// ---- Modal ----
function _sh(){$('#wrt_modal').addClass('wrt-mopen');}
function _hi(){$('#wrt_modal').removeClass('wrt-mopen');}
function _imo(){return $('#wrt_modal').hasClass('wrt-mopen');}
function oM(){
  cNames();if($('#wrt_modal').length){_sh();rT();return;}
  $('body').append('<div class="wrt-modal" id="wrt_modal"><div class="wrt-modal-inner"><div class="wrt-drag-handle"></div>'
    +'<div class="wrt-modal-hdr"><span class="wrt-modal-icon">\uD83D\uDCDC</span><span class="wrt-modal-title">World Rules</span><span class="wrt-modal-tokens" id="wrt_modal_tokens"></span><button class="wrt-modal-x" id="wrt_mx">\u2715</button></div>'
    +'<div class="wrt-tabs" id="wrt_tabs"><button class="wrt-tab active" data-tab="world">\uD83C\uDF0D \u041C\u0438\u0440</button><button class="wrt-tab" data-tab="personal">\uD83D\uDC64 \u041B\u0438\u0447\u043D\u044B\u0435</button><button class="wrt-tab" data-tab="relations">\uD83D\uDC9E \u041E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F</button></div>'
    +'<div class="wrt-tab-body" id="wrt_tb"></div>'
    +'<div class="wrt-modal-footer"><button class="wrt-foot-btn" id="wrt_exp">\uD83D\uDCBE \u042D\u043A\u0441\u043F\u043E\u0440\u0442</button><button class="wrt-foot-btn" id="wrt_imp">\uD83D\uDCE5 \u0418\u043C\u043F\u043E\u0440\u0442</button><button class="wrt-foot-btn wrt-foot-clear" id="wrt_clr">\uD83D\uDDD1</button><button class="wrt-foot-btn wrt-foot-close" id="wrt_mx2">\u0417\u0430\u043A\u0440\u044B\u0442\u044C</button></div>'
    +'</div></div>');
  _sh();
  $(document).on('click touchend','#wrt_mx,#wrt_mx2',function(e){e.preventDefault();e.stopPropagation();_hi();});
  $(document).on('click touchend','#wrt_modal',function(e){if($(e.target).is('#wrt_modal')&&window.innerWidth>600){e.preventDefault();_hi();}});
  $(document).on('click touchend','#wrt_tabs .wrt-tab',function(e){e.preventDefault();$('#wrt_tabs .wrt-tab').removeClass('active');$(this).addClass('active');activeTab=$(this).data('tab');_sq='';rT();});
  $(document).on('click touchend','#wrt_exp',function(e){e.preventDefault();e.stopPropagation();xD();});
  $(document).on('click touchend','#wrt_imp',function(e){e.preventDefault();e.stopPropagation();iD();});
  $(document).on('click touchend','#wrt_clr',function(e){e.preventDefault();e.stopPropagation();cDa();});
  rT();
}
function rT(){const $b=$('#wrt_tb');if(!$b.length)return;_uUI();if(activeTab==='world')$b.html(tW());else if(activeTab==='personal')$b.html(tP());else $b.html(tRe());bT();}

// ---- Tab helpers ----
function kwBadge(kws,catId){
  if(!kws||!kws.length)return '';
  return '<span class="wrt-kw-badge" data-action="show-kw" data-catid="'+catId+'">\uD83D\uDD11'+kws.length+'</span>'
    +'<span class="wrt-kw-pills wrt-kw-hidden" id="wrt_kwp_'+catId+'">'+kws.map(k=>'<span class="wrt-kw-pill">'+esc(k)+'</span>').join('')+'</span>';
}
function sHr(){return '<div class="wrt-search-row"><input class="wrt-search-inp" id="wrt_sq" value="'+esc(_sq)+'" placeholder="\uD83D\uDD0D \u041F\u043E\u0438\u0441\u043A\u2026">'+(_sq?'<button class="wrt-search-clear" id="wrt_sqc">\u2715</button>':'')+'</div>';}
function mSr(r){if(!_sq)return true;const q=_sq.toLowerCase();return(r.text||'').toLowerCase().includes(q)||(r.date||'').toLowerCase().includes(q);}
function pBd(p){const c={0:'#4a5568',1:'#f59e0b',2:'#ef4444'};return '<span class="wrt-prio-badge" style="color:'+c[p||0]+'" title="'+PN[p||0]+'">'+PL[p||0]+'</span>';}
function cTo(rules,cp){if(!rules.length)return 0;return tE(cp?rules.map(r=>r.text).join('; '):rules.map(r=>'- '+r.text).join('\n'));}

function rRw(r,i,cid,tab,sk,mt){
  const mp=[];
  if(mt&&r.date)mp.push('<span class="wrt-rule-date">\uD83D\uDCC5 '+esc(r.date)+'</span>');
  if(mt&&r.reason)mp.push('<span class="wrt-rule-reason">'+esc(r.reason)+'</span>');
  if(sk&&r.sticky)mp.push('<span class="wrt-rule-sticky">\uD83D\uDCCC</span>');
  if(_va.has(r.id))mp.push('<span class="wrt-rule-vec">\uD83E\uDDE0</span>');
  return '<div class="wrt-rule-row'+(r.enabled?'':' disabled')+'"><span class="wrt-rule-num">'+(i+1)+'.</span>'+pBd(r.priority)
    +'<div class="wrt-rule-body"><span class="wrt-rule-text" data-action="edit-rule" data-tab="'+tab+'" data-catid="'+cid+'" data-ruleid="'+r.id+'">'+esc(r.text)+'</span>'
    +(mp.length?'<div class="wrt-rule-meta">'+mp.join('')+'</div>':'')+'</div>'
    +'<div class="wrt-rule-acts"><button class="wrt-rule-btn" data-action="cycle-prio" data-tab="'+tab+'" data-catid="'+cid+'" data-ruleid="'+r.id+'">'+PL[r.priority||0]+'</button>'
    +(sk?'<button class="wrt-rule-btn" data-action="sticky-rule" data-tab="'+tab+'" data-catid="'+cid+'" data-ruleid="'+r.id+'">\uD83D\uDCCC</button>':'')
    +'<button class="wrt-rule-toggle'+(r.enabled?' on':'')+'" data-action="toggle-rule" data-tab="'+tab+'" data-catid="'+cid+'" data-ruleid="'+r.id+'"></button>'
    +'<button class="wrt-rule-btn" data-action="del-rule" data-tab="'+tab+'" data-catid="'+cid+'" data-ruleid="'+r.id+'">\u2715</button></div></div>';
}

function aRw(cid,tab,mt){
  let h='<div class="wrt-add-row" style="padding-left:28px;flex-wrap:wrap"><input class="wrt-add-txt" data-input="ar-'+tab+'-'+cid+'" placeholder="\u041F\u0440\u0430\u0432\u0438\u043B\u043E\u2026" style="flex:1;min-width:130px">';
  if(mt)h+='<input class="wrt-add-txt-sm" data-input="ad-'+tab+'-'+cid+'" placeholder="\u0414\u0430\u0442\u0430" style="width:85px"><input class="wrt-add-txt-sm" data-input="an-'+tab+'-'+cid+'" placeholder="\u041F\u0440\u0438\u0447\u0438\u043D\u0430" style="width:100px">';
  return h+'<button class="wrt-add-btn" data-action="add-rule" data-tab="'+tab+'" data-catid="'+cid+'">+</button></div>';
}

function scHt(tab){
  const s=gs();let sel='';
  if(tab==='personal')sel='<select class="wrt-add-select" id="wrt_sc">'+(s.personalRules.length?s.personalRules.map(c=>'<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>').join(''):'<option>\u2014</option>')+'</select>';
  else if(tab==='relations')sel='<select class="wrt-add-select" id="wrt_sp">'+(s.relationshipRules.length?s.relationshipRules.map(p=>'<option value="'+p.id+'">'+esc(p.char1)+'\u2192'+esc(p.char2)+'</option>').join(''):'<option>\u2014</option>')+'</select>';
  return '<div class="wrt-scan-row"><span class="wrt-scan-lbl">\u0421\u043A\u0430\u043D</span>'+sel+'<input type="number" class="wrt-depth-inp" id="wrt_sd_'+tab+'" value="'+(s.scanDepth||50)+'" min="5" max="200"><label class="wrt-scan-check"><input type="checkbox" id="wrt_sl_'+tab+'"'+(s.scanWithLorebook?' checked':'')+'><span>\u043B\u043E\u0440\u0431\u0443\u043A</span></label><button class="menu_button wrt-scan-btn" id="wrt_sb_'+tab+'">\u2726 \u0421\u043A\u0430\u043D</button></div><div class="wrt-scan-status" id="wrt_ss_'+tab+'"></div>';
}

// ---- Tab: World ----
function tW(){
  const s=gs(),rt=rChat(s.keywordDepth);let l='';
  if(!s.worldRules.length){l='<div class="wrt-empty">\u041F\u0440\u0430\u0432\u0438\u043B \u043C\u0438\u0440\u0430 \u043D\u0435\u0442.<br><small>\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E \u0438\u043B\u0438 \u2726 \u0421\u043A\u0430\u043D</small></div>';}
  else s.worldRules.forEach(cat=>{
    const co=!!_cc['w_'+cat.id],fl=cat.rules.filter(r=>mSr(r));if(_sq&&!fl.length)return;
    const act=wCA(cat,rt),en=cat.rules.filter(r=>r.enabled).length,tk=cTo(cat.rules.filter(r=>r.enabled),s.compactMode);
    const kw=kwBadge(cat.keywords,cat.id);
    l+='<div class="wrt-cat-group'+(act?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+cat.id+'">'
      +'<div class="wrt-cat-hdr" data-section="world" data-catid="'+cat.id+'"><span class="wrt-cat-chev">'+(co?'\u25B8':'\u25BE')+'</span><span class="wrt-cat-name">'+esc(cat.name)+'</span>'+kw
      +'<span class="wrt-cat-count">'+en+'/'+cat.rules.length+'</span><span class="wrt-cat-tokens">~'+tk+'t</span>'
      +'<button class="wrt-cat-toggle'+(cat.enabled?' on':'')+'" data-action="toggle-cat" data-tab="world" data-catid="'+cat.id+'"></button>'
      +'<div class="wrt-cat-actions">'
      +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="world" data-catid="'+cat.id+'" title="AI \u043A\u043E\u043D\u0434\u0435\u043D\u0441\u0430\u0446\u0438\u044F">\u26A1</button>'
      +'<button class="wrt-cat-btn" data-action="auto-kw" data-tab="world" data-catid="'+cat.id+'" title="\u0410\u0432\u0442\u043E-\u043A\u043B\u044E\u0447\u0438">\uD83E\uDD16</button>'
      +'<button class="wrt-cat-btn" data-action="edit-cat-kw" data-tab="world" data-catid="'+cat.id+'" title="\u041A\u043B\u044E\u0447\u0438">\uD83D\uDD11</button>'
      +'<button class="wrt-cat-btn" data-action="rename-cat" data-tab="world" data-catid="'+cat.id+'">\u270E</button>'
      +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="world" data-catid="'+cat.id+'">\u2715</button>'
      +'</div></div><div class="wrt-cat-body"'+(co?' style="display:none"':'')+'>';
    (_sq?fl:cat.rules).forEach((r,i)=>{l+=rRw(r,i,cat.id,'world',true,false);});
    l+=aRw(cat.id,'world',false)+'</div></div>';
  });
  return sHr()+'<div class="wrt-list-wrap"><div class="wrt-list">'+l+'</div></div>'
    +'<div class="wrt-add-row"><input class="wrt-add-txt" id="wrt_awc" placeholder="\u041D\u043E\u0432\u0430\u044F \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F\u2026"><button class="wrt-add-btn" id="wrt_awcb">+ \u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F</button></div>'
    +scHt('world');
}

// ---- Tab: Personal ----
function tP(){
  const s=gs(),rt=rChat(s.keywordDepth);let l='';
  if(!s.personalRules.length){l='<div class="wrt-empty">\u041B\u0438\u0447\u043D\u044B\u0445 \u043F\u0440\u0430\u0432\u0438\u043B \u043D\u0435\u0442</div>';}
  else s.personalRules.forEach(ch=>{
    const co=!!_cc['p_'+ch.id],fl=ch.rules.filter(r=>mSr(r));if(_sq&&!fl.length)return;
    const act=pA(ch,rt),en=ch.rules.filter(r=>r.enabled).length,tk=cTo(ch.rules.filter(r=>r.enabled),s.compactMode);
    const kw=kwBadge(ch.keywords,ch.id);
    l+='<div class="wrt-cat-group'+(act?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+ch.id+'">'
      +'<div class="wrt-cat-hdr" data-section="personal" data-catid="'+ch.id+'"><span class="wrt-cat-chev">'+(co?'\u25B8':'\u25BE')+'</span><span class="wrt-cat-name">'+esc(ch.name)+'</span>'+kw
      +'<span class="wrt-cat-count">'+en+'/'+ch.rules.length+'</span><span class="wrt-cat-tokens">~'+tk+'t</span>'
      +'<div class="wrt-cat-actions">'
      +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="personal" data-catid="'+ch.id+'">\u26A1</button>'
      +'<button class="wrt-cat-btn" data-action="auto-kw" data-tab="personal" data-catid="'+ch.id+'" title="\u0410\u0432\u0442\u043E-\u043A\u043B\u044E\u0447\u0438">\uD83E\uDD16</button>'
      +'<button class="wrt-cat-btn" data-action="edit-char" data-tab="personal" data-catid="'+ch.id+'">\u2699</button>'
      +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="personal" data-catid="'+ch.id+'">\u2715</button>'
      +'</div></div><div class="wrt-cat-body"'+(co?' style="display:none"':'')+'>';
    (_sq?fl:ch.rules).forEach((r,i)=>{l+=rRw(r,i,ch.id,'personal',false,true);});
    l+=aRw(ch.id,'personal',true)+'</div></div>';
  });
  const ns=[...cNames()].filter(Boolean);
  return(ns.length?'<datalist id="wrt_nl">'+ns.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>':'')+sHr()
    +'<div class="wrt-list-wrap"><div class="wrt-list">'+l+'</div></div>'
    +'<div class="wrt-add-row"><input class="wrt-add-txt" id="wrt_apn" placeholder="\u0418\u043C\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430\u2026" list="wrt_nl"><button class="wrt-add-btn" id="wrt_apb">+ \u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436</button></div>'
    +scHt('personal');
}

// ---- Tab: Relations ----
function tRe(){
  const s=gs(),rt=rChat(s.keywordDepth);let l='';
  if(!s.relationshipRules.length){l='<div class="wrt-empty">\u041F\u0440\u0430\u0432\u0438\u043B \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0439 \u043D\u0435\u0442</div>';}
  else s.relationshipRules.forEach(p=>{
    const co=!!_cc['r_'+p.id],fl=p.rules.filter(r=>mSr(r));if(_sq&&!fl.length)return;
    const act=rA(p,rt),en=p.rules.filter(r=>r.enabled).length,tk=cTo(p.rules.filter(r=>r.enabled),s.compactMode);
    const md=p.activationMode==='soft'?'\u043C\u044F\u0433\u043A\u0438\u0439':'\u0441\u0442\u0440\u043E\u0433\u0438\u0439';
    l+='<div class="wrt-cat-group'+(act?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+p.id+'">'
      +'<div class="wrt-cat-hdr" data-section="relations" data-catid="'+p.id+'"><span class="wrt-cat-chev">'+(co?'\u25B8':'\u25BE')+'</span>'
      +'<span class="wrt-pair-badge">'+esc(p.char1)+' <span class="wrt-pair-arrow">\u2192</span> '+esc(p.char2)+'</span>'
      +'<span class="wrt-act-mode" data-action="toggle-mode" data-catid="'+p.id+'">'+md+'</span>'
      +'<span class="wrt-cat-count">'+en+'/'+p.rules.length+'</span><span class="wrt-cat-tokens">~'+tk+'t</span>'
      +'<div class="wrt-cat-actions">'
      +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="relations" data-catid="'+p.id+'">\u26A1</button>'
      +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="relations" data-catid="'+p.id+'">\u2715</button>'
      +'</div></div><div class="wrt-cat-body"'+(co?' style="display:none"':'')+'>';
    (_sq?fl:p.rules).forEach((r,i)=>{l+=rRw(r,i,p.id,'relations',false,true);});
    l+=aRw(p.id,'relations',true)+'</div></div>';
  });
  const ns=[...cNames()].filter(Boolean);
  return(ns.length?'<datalist id="wrt_nlr">'+ns.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist>':'')+sHr()
    +'<div class="wrt-list-wrap"><div class="wrt-list">'+l+'</div></div>'
    +'<div class="wrt-add-row"><input class="wrt-add-txt-sm" id="wrt_ar1" placeholder="\u041A\u0442\u043E\u2026" list="wrt_nlr" style="width:120px"><span style="color:#4a5568">\u2192</span><input class="wrt-add-txt-sm" id="wrt_ar2" placeholder="\u041A \u043A\u043E\u043C\u0443\u2026" list="wrt_nlr" style="width:120px"><button class="wrt-add-btn" id="wrt_arb">+ \u041F\u0430\u0440\u0430</button></div>'
    +scHt('relations');
}

// ---- Bind tab events ----
function bT(){
  const $b=$('#wrt_tb');
  $('#wrt_sq').off('input').on('input',function(){_sq=this.value;rT();});
  $('#wrt_sqc').off('click').on('click',()=>{_sq='';rT();});
  $b.off('click.ch').on('click.ch','.wrt-cat-hdr',function(e){
    if($(e.target).closest('[data-action]').length)return;
    const id=$(this).data('catid'),k=activeTab.charAt(0)+'_'+id;
    _cc[k]=!_cc[k];
    $(this).closest('.wrt-cat-group').find('.wrt-cat-body')[_cc[k]?'slideUp':'slideDown'](160);
    $(this).find('.wrt-cat-chev').text(_cc[k]?'\u25B8':'\u25BE');
  });
  $b.off('click.act').on('click.act','[data-action]',function(e){e.stopPropagation();hA($(this));});
  $b.off('keydown.ar').on('keydown.ar','[data-input^="ar-"]',function(e){if(e.key==='Enter')$(this).closest('.wrt-add-row').find('[data-action="add-rule"]').click();});
  $('#wrt_awcb').off('click').on('click',()=>{const n=$('#wrt_awc').val().trim();if(!n)return;gs().worldRules.push({id:uid(),name:n,enabled:true,keywords:[],rules:[]});sv();uP();uMt();$('#wrt_awc').val('');rT();});
  $('#wrt_awc').off('keydown').on('keydown',e=>{if(e.key==='Enter')$('#wrt_awcb').click();});
  $('#wrt_apb').off('click').on('click',()=>{const n=$('#wrt_apn').val().trim();if(!n)return;const s=gs();if(s.personalRules.some(c=>c.name.toLowerCase()===n.toLowerCase())){toast('\u0423\u0436\u0435 \u0435\u0441\u0442\u044C','#f59e0b');return;}s.personalRules.push({id:uid(),name:n,keywords:[n],rules:[]});sv();uMt();$('#wrt_apn').val('');cNames();rT();});
  $('#wrt_apn').off('keydown').on('keydown',e=>{if(e.key==='Enter')$('#wrt_apb').click();});
  $('#wrt_arb').off('click').on('click',()=>{const c1=$('#wrt_ar1').val().trim(),c2=$('#wrt_ar2').val().trim();if(!c1||!c2){toast('\u041E\u0431\u0430 \u0438\u043C\u0435\u043D\u0438','#f59e0b');return;}if(c1.toLowerCase()===c2.toLowerCase()){toast('\u0420\u0430\u0437\u043D\u044B\u0435 \u0438\u043C\u0435\u043D\u0430','#f59e0b');return;}const s=gs();if(s.relationshipRules.some(p=>p.char1.toLowerCase()===c1.toLowerCase()&&p.char2.toLowerCase()===c2.toLowerCase())){toast('\u0423\u0436\u0435 \u0435\u0441\u0442\u044C','#f59e0b');return;}s.relationshipRules.push({id:uid(),char1:c1,char2:c2,keywords:[c1,c2],activationMode:'strict',rules:[]});sv();uMt();$('#wrt_ar1').val('');$('#wrt_ar2').val('');cNames();rT();});
  $('#wrt_sb_world').off('click').on('click',async function(){await dS('world',$(this));});
  $('#wrt_sb_personal').off('click').on('click',async function(){await dS('personal',$(this));});
  $('#wrt_sb_relations').off('click').on('click',async function(){await dS('relations',$(this));});
}

async function dS(tab,$btn){
  const $st=$('#wrt_ss_'+tab),d=+$('#wrt_sd_'+tab).val()||50,wl=$('#wrt_sl_'+tab).is(':checked');
  $btn.prop('disabled',true).text('\u2026');$st.css('color','#7a8499').text('\u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u044E\u2026');
  try{const s=gs();
    if(tab==='world'){
      const snap=JSON.stringify(s.worldRules);const cats=await scW(d,wl);
      if(cats.length){cats.forEach(nc=>{const ex=s.worldRules.find(c=>c.name.toLowerCase()===nc.name.toLowerCase());if(ex)nc.rules.forEach(nr=>{if(!ex.rules.some(r=>r.text.toLowerCase()===nr.text.toLowerCase()))ex.rules.push(nr);});else s.worldRules.push(nc);});sv();uP();uMt();rT();$st.css('color','#34d399').text('\u2705');toast('\u041C\u0438\u0440 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D','#c084fc',()=>{s.worldRules=JSON.parse(snap);sv();uP();uMt();rT();});}
      else $st.text('\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u043E\u0432\u043E\u0433\u043E');
    }else if(tab==='personal'){
      const cn=$('#wrt_sc').val();if(!cn)throw new Error('\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435');const ch=s.personalRules.find(c=>c.name===cn);if(!ch)throw new Error('?');
      const snap=JSON.stringify(ch.rules);const nr=await scP(cn,d,wl);let a=0;
      nr.forEach(r=>{if(!ch.rules.some(x=>x.text.toLowerCase()===r.text.toLowerCase())){ch.rules.push(r);a++;}});
      sv();uP();uMt();rT();$st.css('color','#34d399').text('\u2705 +'+a);toast(cn+' +'+a,'#38bdf8',()=>{ch.rules=JSON.parse(snap);sv();uP();uMt();rT();});
    }else{
      const pid=$('#wrt_sp').val();if(!pid)throw new Error('\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435');const p=s.relationshipRules.find(x=>x.id===pid);if(!p)throw new Error('?');
      const snap=JSON.stringify(p.rules);const nr=await scR(p.char1,p.char2,d,wl);let a=0;
      nr.forEach(r=>{const ei=p.rules.findIndex(x=>x.text.toLowerCase()===r.text.toLowerCase());if(ei===-1){p.rules.push(r);a++;}else if(!r.enabled)p.rules[ei].enabled=false;});
      sv();uP();uMt();rT();$st.css('color','#34d399').text('\u2705 +'+a);toast('\u041E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F +'+a,'#fb7185',()=>{p.rules=JSON.parse(snap);sv();uP();uMt();rT();});
    }
  }catch(e){$st.css('color','#f87171').text('\u2717 '+e.message);}
  $btn.prop('disabled',false).text('\u2726 \u0421\u043A\u0430\u043D');
}

// ---- Action handler ----
function hA($el){
  const act=$el.data('action'),tab=$el.data('tab')||activeTab,cid=$el.data('catid'),rid=$el.data('ruleid'),s=gs();
  let arr,cat,rule;
  if(tab==='world')arr=s.worldRules;else if(tab==='personal')arr=s.personalRules;else arr=s.relationshipRules;
  if(cid)cat=arr.find(c=>c.id===cid);if(cat&&rid)rule=cat.rules.find(r=>r.id===rid);
  switch(act){
    case 'toggle-cat':if(cat){cat.enabled=!cat.enabled;sv();uP();rT();}break;
    case 'rename-cat':if(cat)oRn(cat);break;
    case 'edit-char':if(cat)oCE(cat);break;
    case 'edit-cat-kw':if(cat)oKE(cat);break;
    case 'toggle-mode':if(cat){cat.activationMode=cat.activationMode==='soft'?'strict':'soft';sv();uP();rT();toast(cat.activationMode==='soft'?'\u041C\u044F\u0433\u043A\u0438\u0439: \u043E\u0434\u0438\u043D \u0438\u0437 \u043F\u0430\u0440\u044B':'\u0421\u0442\u0440\u043E\u0433\u0438\u0439: \u043E\u0431\u0430 \u0432 \u0441\u0446\u0435\u043D\u0435','#fb7185');}break;
    case 'del-cat':{if(!cat||!confirm('\u0423\u0434\u0430\u043B\u0438\u0442\u044C?'))break;const i=arr.indexOf(cat),rm=arr.splice(i,1)[0];sv();uP();uMt();rT();toast('\u0423\u0434\u0430\u043B\u0435\u043D\u043E','#f87171',()=>{arr.splice(i,0,rm);sv();uP();uMt();rT();});break;}
    case 'toggle-rule':if(rule){rule.enabled=!rule.enabled;sv();uP();rT();}break;
    case 'sticky-rule':if(rule){rule.sticky=!rule.sticky;sv();uP();rT();toast(rule.sticky?'\uD83D\uDCCC Sticky':'\u0421\u043D\u044F\u0442\u043E',rule.sticky?'#fbbf24':'#94a3b8');}break;
    case 'cycle-prio':if(rule){rule.priority=((rule.priority||0)+1)%3;sv();uP();rT();toast(PN[rule.priority],['#4a5568','#f59e0b','#ef4444'][rule.priority]);}break;
    case 'del-rule':{if(!cat||!rule)break;const i=cat.rules.indexOf(rule);cat.rules.splice(i,1);sv();uP();uMt();rT();toast('\u0423\u0434\u0430\u043B\u0435\u043D\u043E','#f87171',()=>{cat.rules.splice(i,0,rule);sv();uP();uMt();rT();});break;}
    case 'edit-rule':if(cat&&rule)oRE(cat,rule,tab);break;
    case 'add-rule':{if(!cat)break;const $t=$('[data-input="ar-'+tab+'-'+cid+'"]'),txt=$t.val().trim();if(!txt){$t.focus();return;}
      const nr={id:uid(),text:txt,enabled:true,priority:0};
      if(tab==='world')nr.sticky=false;
      else{nr.date=$('[data-input="ad-'+tab+'-'+cid+'"]').val()?.trim()||'';nr.reason=$('[data-input="an-'+tab+'-'+cid+'"]').val()?.trim()||'';if(!nr.date){const cd=calD();if(cd)nr.date=cd;}}
      cat.rules.push(nr);sv();uP();uMt();$t.val('');
      if(tab!=='world'){$('[data-input="ad-'+tab+'-'+cid+'"]').val('');$('[data-input="an-'+tab+'-'+cid+'"]').val('');}
      rT();break;}
    case 'condense-cat':if(cat)dCo(cat,tab);break;
    case 'show-kw':{const $p=$('#wrt_kwp_'+cid);$p.toggleClass('wrt-kw-hidden');break;}
    case 'auto-kw':if(cat)autoKw(cat,tab);break;
  }
}

async function dCo(cat,tab){
  const en=cat.rules.filter(r=>r.enabled);
  if(en.length<3){toast('\u041C\u0438\u043D. 3 \u043F\u0440\u0430\u0432\u0438\u043B\u0430','#f59e0b');return;}
  const lb=tab==='relations'?(cat.char1+'\u2192'+cat.char2):cat.name;
  toast('\u041A\u043E\u043D\u0434\u0435\u043D\u0441\u0438\u0440\u0443\u044E\u2026','#a78bfa',null,10000);
  try{
    const cd=await condR(en,lb);if(!cd.length){toast('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C','#f59e0b');return;}
    const oT=tE(en.map(r=>r.text).join('\n')),nT=tE(cd.map(r=>r.text).join('\n'));
    if(confirm(en.length+'\u2192'+cd.length+' \u043F\u0440\u0430\u0432\u0438\u043B, ~'+oT+'\u2192~'+nT+' \u0442\u043E\u043A\u0435\u043D\u043E\u0432\n\n'+cd.map((r,i)=>(i+1)+'. '+r.text).join('\n')+'\n\n\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C?')){
      const snap=JSON.stringify(cat.rules);cat.rules=[...cat.rules.filter(r=>!r.enabled),...cd];sv();uP();uMt();rT();
      toast('\u041A\u043E\u043D\u0434\u0435\u043D\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043E','#a78bfa',()=>{cat.rules=JSON.parse(snap);sv();uP();uMt();rT();});
    }
  }catch(e){toast('\u041E\u0448\u0438\u0431\u043A\u0430: '+e.message,'#f87171');}
}

// ---- Auto keywords ----
async function autoKw(cat,tab){
  const name=tab==='relations'?(cat.char1+', '+cat.char2):cat.name;
  const ruleTexts=cat.rules.map(r=>r.text).join('; ');
  toast('\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u043A\u043B\u044E\u0447\u0438\u2026','#a78bfa',null,8000);
  try{
    const result=await aiG(
      'Name: '+name+'\nRules: '+ruleTexts.slice(0,800)+'\n\nGenerate activation keywords:',
      'Generate keyword list for a rule category. Keywords activate these rules when found in chat.\n\n'
      +'OUTPUT: comma-separated list of 5-15 keywords.\n'
      +'Include: the name itself, all grammatical forms (cases, declensions), related terms, synonyms.\n'
      +'For Russian names generate ALL case forms: nom, gen, dat, acc, inst, prep.\n'
      +'For topic categories (Magic, Politics) include related nouns, verbs, adjectives.\n'
      +'ONLY output the comma-separated list, nothing else.\n'
      +'Write keywords in the SAME LANGUAGE as the input.'
    );
    const kws=result.split(',').map(s=>s.trim().replace(/[."']/g,'')).filter(s=>s.length>=2&&s.length<40);
    if(kws.length){
      const merged=new Set([...(cat.keywords||[]),...kws]);
      cat.keywords=[...merged];
      sv();uP();rT();
      toast('\uD83D\uDD11 +'+kws.length+' \u043A\u043B\u044E\u0447\u0435\u0439','#34d399');
    }else toast('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C','#f59e0b');
  }catch(e){toast('\u041E\u0448\u0438\u0431\u043A\u0430: '+e.message,'#f87171');}
}

// ---- Edit modals ----
function oRn(cat){
  $('.wrt-edit-overlay').remove();
  $('body').append('<div class="wrt-edit-overlay"><div class="wrt-edit-modal"><div class="wrt-edit-hdr"><span class="wrt-edit-title">\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435</span><button class="wrt-edit-x" id="wrx">\u2715</button></div><div class="wrt-edit-body"><input class="wrt-einput" id="wrv" value="'+esc(cat.name)+'"></div><div class="wrt-edit-footer"><button class="menu_button" id="wrc">\u041E\u0442\u043C\u0435\u043D\u0430</button><button class="menu_button wrt-save-btn" id="wrs">\uD83D\uDCBE</button></div></div></div>');
  $('#wrv').focus().select();$('#wrx,#wrc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wrs').on('click',()=>{const v=$('#wrv').val().trim();if(!v)return;cat.name=v;sv();uP();rT();$('.wrt-edit-overlay').remove();});
  $('#wrv').on('keydown',e=>{if(e.key==='Enter')$('#wrs').click();});
}

function oKE(cat){
  $('.wrt-edit-overlay').remove();
  $('body').append('<div class="wrt-edit-overlay"><div class="wrt-edit-modal"><div class="wrt-edit-hdr"><span class="wrt-edit-title">\u041A\u043B\u044E\u0447\u0438: '+esc(cat.name)+'</span><button class="wrt-edit-x" id="wkx">\u2715</button></div><div class="wrt-edit-body"><div class="wrt-elabel">\u0427\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E</div><input class="wrt-einput" id="wkv" value="'+esc((cat.keywords||[]).join(', '))+'" placeholder="\u043C\u0430\u0433\u0438\u044F, \u0437\u0430\u043A\u043B\u0438\u043D\u0430\u043D\u0438\u0435"><div style="font-size:10px;color:#3d4a60;margin-top:4px">\u041F\u0443\u0441\u0442\u043E = \u0432\u0441\u0435\u0433\u0434\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u0430</div></div><div class="wrt-edit-footer"><button class="menu_button" id="wkc">\u041E\u0442\u043C\u0435\u043D\u0430</button><button class="menu_button wrt-save-btn" id="wks">\uD83D\uDCBE</button></div></div></div>');
  $('#wkv').focus();$('#wkx,#wkc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wks').on('click',()=>{cat.keywords=$('#wkv').val().split(',').map(s=>s.trim()).filter(Boolean);sv();uP();rT();$('.wrt-edit-overlay').remove();});
}

function oCE(ch){
  $('.wrt-edit-overlay').remove();
  $('body').append('<div class="wrt-edit-overlay"><div class="wrt-edit-modal"><div class="wrt-edit-hdr"><span class="wrt-edit-title">'+esc(ch.name)+'</span><button class="wrt-edit-x" id="wcx">\u2715</button></div><div class="wrt-edit-body"><div class="wrt-elabel">\u0418\u043C\u044F</div><input class="wrt-einput" id="wcn" value="'+esc(ch.name)+'"><div class="wrt-elabel">\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430</div><input class="wrt-einput" id="wck" value="'+esc((ch.keywords||[]).join(', '))+'" placeholder="\u0413\u0430\u0441\u0438\u043B, \u0413\u0430\u0441\u0438\u043B\u0430, \u0413\u0430\u0441\u0438\u043B\u0443"><div style="font-size:10px;color:#3d4a60;margin-top:3px">\u0424\u043E\u0440\u043C\u044B \u0438\u043C\u0435\u043D\u0438 \u0434\u043B\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0438</div></div><div class="wrt-edit-footer"><button class="menu_button" id="wcc">\u041E\u0442\u043C\u0435\u043D\u0430</button><button class="menu_button wrt-save-btn" id="wcs">\uD83D\uDCBE</button></div></div></div>');
  $('#wcn').focus();$('#wcx,#wcc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wcs').on('click',()=>{const n=$('#wcn').val().trim(),kw=$('#wck').val().split(',').map(s=>s.trim()).filter(Boolean);if(!n)return;ch.name=n;ch.keywords=kw.length?kw:[n];sv();uP();cNames();rT();$('.wrt-edit-overlay').remove();});
}

function oRE(cat,rule,tab){
  $('.wrt-edit-overlay').remove();
  const m=(tab==='personal'||tab==='relations'),sk=(tab==='world');
  let f='<div class="wrt-elabel">\u0422\u0435\u043A\u0441\u0442 \u043F\u0440\u0430\u0432\u0438\u043B\u0430</div><textarea class="wrt-etextarea" id="wrt_ret" rows="3">'+esc(rule.text)+'</textarea>';
  if(m)f+='<div class="wrt-elabel">\u0414\u0430\u0442\u0430 (\u043E\u043F\u0446.)</div><input class="wrt-einput" id="wrt_red" value="'+esc(rule.date||'')+'" placeholder="14 \u041D\u0430\u0435\u0440\u0438\u0441"><div class="wrt-elabel">\u041F\u0440\u0438\u0447\u0438\u043D\u0430 (\u043E\u043F\u0446.)</div><input class="wrt-einput" id="wrt_rer" value="'+esc(rule.reason||'')+'">';
  f+='<div class="wrt-elabel" style="margin-top:8px">\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442</div><div class="wrt-prio-row">'+[0,1,2].map(p=>'<label class="wrt-prio-opt'+(rule.priority===p?' active':'')+'"><input type="radio" name="wrp" value="'+p+'"'+(rule.priority===p?' checked':'')+'>'+PL[p]+' '+PN[p]+'</label>').join('')+'</div>';
  if(sk)f+='<label class="wrt-check-row" style="margin-top:6px"><input type="checkbox" id="wrt_resk"'+(rule.sticky?' checked':'')+'><span>\uD83D\uDCCC Sticky \u2014 \u0432\u0441\u0435\u0433\u0434\u0430 \u0432 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0435</span></label>';
  $('body').append('<div class="wrt-edit-overlay"><div class="wrt-edit-modal"><div class="wrt-edit-hdr"><span class="wrt-edit-title">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435</span><button class="wrt-edit-x" id="wrex">\u2715</button></div><div class="wrt-edit-body">'+f+'</div><div class="wrt-edit-footer"><button class="menu_button" id="wrec">\u041E\u0442\u043C\u0435\u043D\u0430</button><button class="menu_button wrt-save-btn" id="wres">\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button></div></div></div>');
  $('#wrt_ret').focus();$('#wrex,#wrec').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wres').on('click',()=>{
    const t=$('#wrt_ret').val().trim();if(!t)return;rule.text=t;rule.priority=+$('input[name=wrp]:checked').val()||0;
    if(m){rule.date=($('#wrt_red').val()||'').trim();rule.reason=($('#wrt_rer').val()||'').trim();}
    if(sk)rule.sticky=$('#wrt_resk').is(':checked');
    sv();uP();rT();$('.wrt-edit-overlay').remove();toast('\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E','#34d399');
  });
  $('#wrt_ret').on('keydown',e=>{if(e.key==='Enter'&&e.ctrlKey)$('#wres').click();});
}

// ---- Export/Import/Clear ----
function xD(){
  const s=gs();
  const b=new Blob([JSON.stringify({worldRules:s.worldRules,personalRules:s.personalRules,relationshipRules:s.relationshipRules,depthWorld:s.depthWorld,depthPersonal:s.depthPersonal,depthRelations:s.depthRelations,keywordDepth:s.keywordDepth,tokenBudgetWorld:s.tokenBudgetWorld,tokenBudgetPersonal:s.tokenBudgetPersonal,tokenBudgetRelations:s.tokenBudgetRelations,compactMode:s.compactMode,injectDates:s.injectDates,useVectors:s.useVectors,vectorThreshold:s.vectorThreshold},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='wrt_'+Date.now()+'.json';a.click();toast('\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E','#34d399');
}
function iD(){
  const i=document.createElement('input');i.type='file';i.accept='.json';
  i.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result),s=gs();
      ['worldRules','personalRules','relationshipRules'].forEach(k=>{if(Array.isArray(d[k]))s[k]=d[k];});
      ['depthWorld','depthPersonal','depthRelations','keywordDepth','tokenBudgetWorld','tokenBudgetPersonal','tokenBudgetRelations','compactMode','injectDates','useVectors','vectorThreshold'].forEach(k=>{if(d[k]!==undefined)s[k]=d[k];});
      sv();uP();uMt();rUI();rT();toast('\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E','#34d399');
    }catch(e){toast('\u041E\u0448\u0438\u0431\u043A\u0430 \u0444\u043E\u0440\u043C\u0430\u0442\u0430','#f87171');}};r.readAsText(f);};
  i.click();
}
function cDa(){
  if(!confirm('\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0412\u0421\u0415 \u043F\u0440\u0430\u0432\u0438\u043B\u0430?'))return;
  const s=gs(),snap=JSON.stringify({w:s.worldRules,p:s.personalRules,r:s.relationshipRules});
  s.worldRules=[];s.personalRules=[];s.relationshipRules=[];
  sv();uP();uMt();rUI();rT();
  toast('\u041E\u0447\u0438\u0449\u0435\u043D\u043E','#f87171',()=>{const d=JSON.parse(snap);s.worldRules=d.w;s.personalRules=d.p;s.relationshipRules=d.r;sv();uP();uMt();rUI();rT();},8000);
}

// ---- ST events + keyboard ----
function wE(){
  const{eventSource:es,event_types:et}=ctx();
  es.on(et.APP_READY,async()=>{mS();await uP();if(gs().useVectors)chkVec();});
  es.on(et.CHAT_CHANGED,async()=>{_cc={};_sq='';_va=new Set();cNames();rUI();await uP();if(_imo())rT();});
  es.on(et.MESSAGE_RECEIVED,async()=>{_pd=true;await uP();if(gs().useVectors&&_vs)schVec();});
  if(et.GENERATION_ENDED)es.on(et.GENERATION_ENDED,async()=>{_pd=true;await uP();});
  $(document).on('keydown.wrt',e=>{if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();if(_imo())_hi();else oM();}});
}

// ---- Boot ----
jQuery(()=>{try{wE();console.log('[World Rules Tracker v2.0] \u2726 loaded');}catch(e){console.error('[WRT]',e);}});
})();
