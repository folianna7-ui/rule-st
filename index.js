/**
 * World Rules Tracker v3.0 — SillyTavern Extension
 * Full combined release (Part 1 engine + Part 2 UI)
 *
 * Improvements vs v2.0:
 *  #1  Readable variable/function names throughout
 *  #2  Modular structure with clear section headers
 *  #8  Conflict detection between rules in the same category
 *  #9  Full vector cache (no 5-per-cycle limit)
 *  #10 Drag-and-drop rule reordering (HTML5 drag API)
 *  #11 Rule edit history (createdAt, updatedAt, history[])
 *  #13 Activation summary bar (live active-rule counts)
 *  #15 Selective export modal (choose sections)
 *  #16 i18n — RU / EN, stored in settings
 *  #17 Improved token estimation (BPE-aware Cyrillic/Latin)
 *  #20 Per-tab scan depth (world / personal / relations)
 */
(() => {
'use strict';

// ══════════════════════════════════════════════════════════════════
// § 1 · CONSTANTS
// ══════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'world_rules_tracker';
const PRIORITY    = { NORMAL:0, IMPORTANT:1, CRITICAL:2 };
const PRIO_ICON   = { 0:'⚪', 1:'🟡', 2:'🔴' };

// ══════════════════════════════════════════════════════════════════
// § 2 · i18n  (#16)
// ══════════════════════════════════════════════════════════════════

const I18N = {
  ru: {
    enabled:'Включено', compact:'Компактный промпт (~40%)', injectDates:'Даты/причины в промпте',
    semanticAct:'🧠 Семантическая активация', injDepth:'Глубина инъекции',
    tokenBudget:'Бюджет токенов (0=∞)', kwDepth:'🔍 Ключи', msgs:'сообщ.',
    openBtn:'📜 Открыть правила', apiSec:'🔌 API', lang:'Язык', noData:'нет данных',
    vecThreshold:'🧠 Порог', scanDepthLbl:'Глубина скана (сообщ.)',
    worldTab:'🌍 Мир', personalTab:'👤 Личные', relTab:'💞 Отношения',
    exportBtn:'💾 Экспорт', importBtn:'📥 Импорт', clearBtn:'🗑', closeBtn:'Закрыть',
    save:'💾 Сохранить', cancel:'Отмена', nameLabel:'Название', kwLabel:'Ключи (через запятую)',
    alwaysActive:'Пусто = всегда активна', charName:'Имя', kwForms:'Формы имени для активации',
    ruleText:'Текст правила', dateLabel:'Дата (опц.)', reasonLabel:'Причина (опц.)',
    prioLabel:'Приоритет', stickyLabel:'📌 Sticky — всегда в контексте', editTitle:'Редактирование',
    saved:'Сохранено', deleted:'Удалено', cleared:'Очищено',
    exported:'Экспортировано', imported:'Импортировано', importErr:'Ошибка формата',
    apiOk:'✅ API OK', vecOk:'✅ Vector OK', vecNA:'✗ Vector N/A',
    vecOn:'Семантика вкл', vecOff:'Vector недоступен',
    condensing:'Конденсирую…', condensed:'Конденсировано', condenseFail:'Не удалось', condenseMin:'Мин. 3 правила',
    genKw:'Генерирую ключи…', kwFail:'Не удалось',
    scanning:'Анализирую…', worldUpd:'Мир обновлён', nothingNew:'Ничего нового',
    alreadyExists:'Уже есть', bothNames:'Оба имени', diffNames:'Разные имена',
    selectTarget:'Выберите', errNoConn:'Нет подключения',
    softMode:'мягкий', strictMode:'строгий', rulePh:'Правило…',
    searchPh:'🔍 Поиск…', scanBtn:'✦ Скан', lorebook:'лорбук',
    newCatPh:'Новая категория…', addCat:'+ Категория', addChar:'+ Персонаж', addPair:'+ Пара',
    whoLabel:'Кто…', toWhomLabel:'К кому…',
    activeSummary:(w,p,r)=>`Активно: 🌍${w} · 👤${p} · 💞${r}`,
    noActiveRules:'Нет активных правил', promptOff:'○ выкл',
    noWorld:'Правил мира нет.\nДобавьте категорию или ✦ Скан',
    noPersonal:'Личных правил нет', noRelations:'Правил отношений нет',
    conflictTip:'⚠ Возможный конфликт с другим правилом в этой категории',
    histTitle:'📋 История изменений', histEmpty:'Изменений не было',
    histCreated:'Создано', histEdited:'Изменено',
    exportTitle:'Экспорт — выберите разделы',
    exportWorld:'🌍 Правила мира', exportPersonal:'👤 Личные правила',
    exportRelations:'💞 Отношения', exportSettings:'⚙️ Настройки',
    doExport:'Экспортировать',
    pN0:'Обычный', pN1:'Важный', pN2:'Критический',
    confirmDel:'Удалить?', confirmClear:'Очистить ВСЕ правила?',
    dragHandle:'≡',
  },
  en: {
    enabled:'Enabled', compact:'Compact prompt (~40%)', injectDates:'Dates/reasons in prompt',
    semanticAct:'🧠 Semantic activation', injDepth:'Injection depth',
    tokenBudget:'Token budget (0=∞)', kwDepth:'🔍 Keywords', msgs:'msgs',
    openBtn:'📜 Open rules', apiSec:'🔌 API', lang:'Language', noData:'no data',
    vecThreshold:'🧠 Threshold', scanDepthLbl:'Scan depth (messages)',
    worldTab:'🌍 World', personalTab:'👤 Personal', relTab:'💞 Relations',
    exportBtn:'💾 Export', importBtn:'📥 Import', clearBtn:'🗑', closeBtn:'Close',
    save:'💾 Save', cancel:'Cancel', nameLabel:'Name', kwLabel:'Keywords (comma-separated)',
    alwaysActive:'Empty = always active', charName:'Name', kwForms:'Name forms for activation',
    ruleText:'Rule text', dateLabel:'Date (opt.)', reasonLabel:'Reason (opt.)',
    prioLabel:'Priority', stickyLabel:'📌 Sticky — always in context', editTitle:'Edit',
    saved:'Saved', deleted:'Deleted', cleared:'Cleared',
    exported:'Exported', imported:'Imported', importErr:'Format error',
    apiOk:'✅ API OK', vecOk:'✅ Vector OK', vecNA:'✗ Vector N/A',
    vecOn:'Semantics on', vecOff:'Vector unavailable',
    condensing:'Condensing…', condensed:'Condensed', condenseFail:'Failed', condenseMin:'Min 3 rules',
    genKw:'Generating keywords…', kwFail:'Failed',
    scanning:'Scanning…', worldUpd:'World updated', nothingNew:'Nothing new',
    alreadyExists:'Already exists', bothNames:'Both names', diffNames:'Different names',
    selectTarget:'Select', errNoConn:'No connection',
    softMode:'soft', strictMode:'strict', rulePh:'Rule…',
    searchPh:'🔍 Search…', scanBtn:'✦ Scan', lorebook:'lorebook',
    newCatPh:'New category…', addCat:'+ Category', addChar:'+ Character', addPair:'+ Pair',
    whoLabel:'Who…', toWhomLabel:'To whom…',
    activeSummary:(w,p,r)=>`Active: 🌍${w} · 👤${p} · 💞${r}`,
    noActiveRules:'No active rules', promptOff:'○ off',
    noWorld:'No world rules.\nAdd a category or ✦ Scan',
    noPersonal:'No personal rules', noRelations:'No relationship rules',
    conflictTip:'⚠ Possible conflict with another rule in this category',
    histTitle:'📋 Edit history', histEmpty:'No edits yet',
    histCreated:'Created', histEdited:'Edited',
    exportTitle:'Export — select sections',
    exportWorld:'🌍 World rules', exportPersonal:'👤 Personal rules',
    exportRelations:'💞 Relations', exportSettings:'⚙️ Settings',
    doExport:'Export',
    pN0:'Normal', pN1:'Important', pN2:'Critical',
    confirmDel:'Delete?', confirmClear:'Clear ALL rules?',
    dragHandle:'≡',
  }
};

let currentLang = 'ru';
function tr(key)          { return I18N[currentLang]?.[key] ?? I18N.ru[key] ?? key; }
function trf(key,...args) { const v=tr(key); return typeof v==='function'?v(...args):v; }
function prioName(p)      { return tr('pN'+(p||0)); }

// ══════════════════════════════════════════════════════════════════
// § 3 · STATE  (#1 readable names)
// ══════════════════════════════════════════════════════════════════

let activeTab         = 'world';
let collapsedCats     = {};
let promptIsActive    = false;
let knownNames        = new Set();
let searchQuery       = '';
let currentPrompts    = {w:'',p:'',r:''};
let promptDirty       = true;

let vectorsAvailable  = null;
let vectorCache       = {};
let vectorActivated   = new Set();
let vectorTimer       = null;
let vectorBusy        = false;

// Drag state (#10)
let dragSrcRuleId = null;
let dragSrcCatId  = null;
let dragSrcTab    = null;

// ══════════════════════════════════════════════════════════════════
// § 4 · UTILITIES
// ══════════════════════════════════════════════════════════════════

function getCtx()   { return SillyTavern.getContext(); }

function getHeaders() {
  try { const h=getCtx().getRequestHeaders?.(); if(h)return h; } catch(e){}
  return {'Content-Type':'application/json'};
}

function escHtml(s) {
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function hashText(s) {
  let h=0;
  for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return h.toString(36);
}

function nowLabel() {
  return new Date().toLocaleString(currentLang==='en'?'en-US':'ru-RU',
    {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// ══════════════════════════════════════════════════════════════════
// § 5 · RUSSIAN MORPHOLOGY & KEYWORD MATCHING
// ══════════════════════════════════════════════════════════════════

function ruStem(word) {
  if(!word)return '';
  word=word.toLowerCase().trim();
  const sfx=['амии','ями','ого','его','ому','ему','ыми','ими','ах','ях','ов','ев',
    'ей','ий','ой','ую','юю','ом','ем','ём','ам','ям','ым','им','а','я','у','ю','е','ё','и','ы','о'];
  for(const s of sfx){ if(word.length>s.length+2&&word.endsWith(s)) return word.slice(0,-s.length); }
  return word;
}

function keywordMatch(kw,text) {
  if(!kw||!text)return false;
  const kl=kw.toLowerCase(), ks=ruStem(kw);
  for(const tok of text.toLowerCase().split(/[\s,.!?;:()\[\]{}"'«»—–\-\/\\]+/)){
    if(tok===kl)return true;
    if(ks.length>=3&&ruStem(tok)===ks)return true;
  }
  return false;
}

function anyKeywordMatch(keywords,text) {
  if(!keywords||!keywords.length)return false;
  for(const k of keywords)if(keywordMatch(k,text))return true;
  return false;
}

function recentChatText(depth) {
  return (getCtx().chat||[]).slice(-Math.max(depth||5,3)).map(m=>m.mes||'').join(' ');
}

// ══════════════════════════════════════════════════════════════════
// § 6 · VECTORS  (#9 — full cache, no 5-per-cycle limit)
// ══════════════════════════════════════════════════════════════════

async function checkVectors() {
  if(vectorsAvailable!==null)return vectorsAvailable;
  try {
    const r=await fetch('/api/embeddings/compute',{method:'POST',headers:getHeaders(),body:JSON.stringify({text:'test',source:'wrt'})});
    if(r.ok){const d=await r.json();const v=d.embedding||d.vector;vectorsAvailable=!!(v&&v.length>0);}
    else vectorsAvailable=false;
  }catch(e){vectorsAvailable=false;}
  console.log('[WRT] vectors:',vectorsAvailable);
  return vectorsAvailable;
}

async function getEmbedding(text) {
  try {
    const r=await fetch('/api/embeddings/compute',{method:'POST',headers:getHeaders(),body:JSON.stringify({text:text.slice(0,500),source:'wrt'})});
    if(!r.ok)return null;
    const d=await r.json();return d.embedding||d.vector||null;
  }catch(e){return null;}
}

function cosineSimilarity(a,b) {
  if(!a||!b||a.length!==b.length)return 0;
  let dot=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
  return(na&&nb)?dot/(Math.sqrt(na)*Math.sqrt(nb)):0;
}

async function ensureVectorCached(id,text) {
  const hash=hashText(text);
  if(vectorCache[id]&&vectorCache[id].hash===hash)return;
  const vec=await getEmbedding(text);
  if(vec)vectorCache[id]={hash,vec};
}

async function processVectors() {
  const s=getSettings();
  if(!s.useVectors||!vectorsAvailable||vectorBusy)return;
  vectorBusy=true;
  try {
    const text=recentChatText(s.keywordDepth||5);
    if(!text.trim()){vectorBusy=false;return;}
    const ctxVec=await getEmbedding(text.slice(-1500));
    if(!ctxVec){vectorBusy=false;return;}

    const allRules=[];
    s.worldRules.forEach(cat=>cat.rules.forEach(r=>{if(r.enabled)allRules.push({id:r.id,text:r.text,catId:cat.id});}));
    s.personalRules.forEach(cat=>cat.rules.forEach(r=>{if(r.enabled)allRules.push({id:r.id,text:r.text,catId:cat.id});}));
    s.relationshipRules.forEach(pair=>pair.rules.forEach(r=>{if(r.enabled)allRules.push({id:r.id,text:r.text,catId:pair.id});}));

    // FIX #9: cache ALL rules — no arbitrary limit
    for(const rule of allRules) await ensureVectorCached(rule.id,rule.text);

    const threshold=s.vectorThreshold||0.55;
    const activated=new Set();
    for(const rule of allRules){
      if(vectorCache[rule.id]&&cosineSimilarity(ctxVec,vectorCache[rule.id].vec)>=threshold){
        activated.add(rule.id);
        activated.add('c_'+rule.catId);
      }
    }
    const changed=activated.size!==vectorActivated.size||[...activated].some(id=>!vectorActivated.has(id));
    vectorActivated=activated;
    if(changed){promptDirty=true;await updatePrompts();if(isModalOpen())renderTab();}
  }catch(e){console.warn('[WRT] vec error:',e);}
  vectorBusy=false;
}

function scheduleVectors(){clearTimeout(vectorTimer);vectorTimer=setTimeout(()=>processVectors(),1500);}

// ══════════════════════════════════════════════════════════════════
// § 7 · KNOWN NAMES
// ══════════════════════════════════════════════════════════════════

function collectNames(){
  const s=getSettings(),names=new Set();
  s.personalRules.forEach(c=>{if(c.name)names.add(c.name);(c.keywords||[]).forEach(k=>names.add(k));});
  s.relationshipRules.forEach(p=>{if(p.char1)names.add(p.char1);if(p.char2)names.add(p.char2);});
  try{getCtx().characters?.forEach(c=>{if(c.name)names.add(c.name);});}catch(e){}
  knownNames=names;return names;
}

// ══════════════════════════════════════════════════════════════════
// § 8 · STORAGE & SETTINGS  (#11 history, #16 lang, #20 per-tab depths)
// ══════════════════════════════════════════════════════════════════

function defaultSettings(){
  return{
    enabled:true, lang:'ru',
    worldRules:[], personalRules:[], relationshipRules:[],
    depthWorld:0, depthPersonal:1, depthRelations:2,
    keywordDepth:5,
    // #20 per-tab scan depths
    scanDepthWorld:50, scanDepthPersonal:50, scanDepthRelations:50,
    scanWithLorebook:false,
    tokenBudgetWorld:0, tokenBudgetPersonal:0, tokenBudgetRelations:0,
    compactMode:false, injectDates:false, useVectors:false, vectorThreshold:0.55,
  };
}

function hasChatCtx(){
  try{const c=getCtx();return!!(c.chat_metadata&&typeof c.saveMetadata==='function');}
  catch(e){return false;}
}

// #11: stamp history fields on every rule
function normalizeRule(rule){
  if(rule.enabled===undefined) rule.enabled=true;
  if(rule.priority===undefined) rule.priority=0;
  if(!rule.createdAt) rule.createdAt=nowLabel();
  if(!Array.isArray(rule.history)) rule.history=[];
}

function getSettings(){
  const ctx=getCtx(); let s;
  if(hasChatCtx()){
    if(!ctx.chat_metadata[STORAGE_KEY]) ctx.chat_metadata[STORAGE_KEY]=defaultSettings();
    s=ctx.chat_metadata[STORAGE_KEY];
  }else{
    if(!ctx.extensionSettings[STORAGE_KEY]) ctx.extensionSettings[STORAGE_KEY]=defaultSettings();
    s=ctx.extensionSettings[STORAGE_KEY];
  }
  const d=defaultSettings();
  for(const k in d) if(s[k]===undefined) s[k]=d[k];

  // #20 migrate old flat scanDepth
  if(s.scanDepth!==undefined){
    if(s.scanDepthWorld===undefined)    s.scanDepthWorld    =s.scanDepth;
    if(s.scanDepthPersonal===undefined) s.scanDepthPersonal =s.scanDepth;
    if(s.scanDepthRelations===undefined)s.scanDepthRelations=s.scanDepth;
    delete s.scanDepth;
  }

  if(!Array.isArray(s.worldRules))        s.worldRules=[];
  if(!Array.isArray(s.personalRules))     s.personalRules=[];
  if(!Array.isArray(s.relationshipRules)) s.relationshipRules=[];

  s.worldRules.forEach(cat=>{
    if(!Array.isArray(cat.rules))    cat.rules=[];
    if(!Array.isArray(cat.keywords)) cat.keywords=[];
    if(cat.enabled===undefined)      cat.enabled=true;
    cat.rules.forEach(r=>{normalizeRule(r);if(r.sticky===undefined)r.sticky=false;});
  });
  s.personalRules.forEach(cat=>{
    if(!Array.isArray(cat.rules))    cat.rules=[];
    if(!Array.isArray(cat.keywords)) cat.keywords=[];
    cat.rules.forEach(normalizeRule);
  });
  s.relationshipRules.forEach(pair=>{
    if(!Array.isArray(pair.rules))    pair.rules=[];
    if(!Array.isArray(pair.keywords)) pair.keywords=[];
    if(pair.activationMode===undefined) pair.activationMode='strict';
    pair.rules.forEach(normalizeRule);
  });

  if(s.lang) currentLang=s.lang;
  return s;
}

function saveSettings(){
  promptDirty=true; const ctx=getCtx();
  try{
    if(hasChatCtx()) ctx.saveMetadata();
    else if(typeof ctx.saveSettingsDebounced==='function') ctx.saveSettingsDebounced();
  }catch(e){}
}

// ══════════════════════════════════════════════════════════════════
// § 9 · TOKEN ESTIMATION  (#17 BPE-aware)
// ══════════════════════════════════════════════════════════════════

function estimateTokens(text){
  if(!text)return 0;
  let tokens=0;
  for(const chunk of text.split(/\s+/)){
    if(!chunk)continue;
    const cyr=(chunk.match(/[\u0400-\u04FF]/g)||[]).length;
    const lat=chunk.length-cyr;
    tokens+=Math.ceil(cyr/2)+Math.ceil(lat/3.5);
  }
  tokens+=Math.ceil(((text.match(/\n/g)||[]).length)*0.3);
  return Math.max(1,tokens);
}

function applyTokenBudget(rules,budget,formatFn){
  if(!budget||budget<=0)return rules;
  let cur=[...rules];
  if(estimateTokens(formatFn(cur))<=budget)return cur;
  const removable=cur.map((r,i)=>({r,i,p:r.priority||0})).filter(x=>x.p<PRIORITY.CRITICAL).sort((a,b)=>a.p-b.p||b.i-a.i);
  for(const item of removable){
    cur=cur.filter(r=>r!==item.r);
    if(estimateTokens(formatFn(cur))<=budget)break;
  }
  return cur;
}

// ══════════════════════════════════════════════════════════════════
// § 10 · CONFLICT DETECTION  (#8)
// ══════════════════════════════════════════════════════════════════

const ANTONYM_PAIRS=[
  ['любит','ненавидит'],['любит','не любит'],['любит','боится'],['любит','избегает'],
  ['боится','не боится'],['хочет','не хочет'],['верит','не верит'],['доверяет','не доверяет'],
  ['нравится','не нравится'],['всегда','никогда'],['должен','не должен'],
  ['likes','hates'],['loves','hates'],['always','never'],['must','must not'],
  ['trusts','distrusts'],['wants','refuses'],['loves','fears'],['likes','dislikes'],
];

function detectConflicts(rules){
  const conflicted=new Set();
  const active=rules.filter(r=>r.enabled);
  for(let i=0;i<active.length;i++){
    for(let j=i+1;j<active.length;j++){
      const ta=active[i].text.toLowerCase(), tb=active[j].text.toLowerCase();
      for(const[pos,neg]of ANTONYM_PAIRS){
        if(!((ta.includes(pos)&&tb.includes(neg))||(ta.includes(neg)&&tb.includes(pos))))continue;
        const stemsA=new Set(ta.split(/\s+/).map(ruStem).filter(w=>w.length>3));
        const stemsB=new Set(tb.split(/\s+/).map(ruStem).filter(w=>w.length>3));
        if([...stemsA].some(w=>stemsB.has(w))){conflicted.add(active[i].id);conflicted.add(active[j].id);}
      }
    }
  }
  return conflicted;
}

// ══════════════════════════════════════════════════════════════════
// § 11 · ACTIVATION LOGIC
// ══════════════════════════════════════════════════════════════════

function isCurrentChar(name){
  if(!name)return false;
  try{const cn=getCtx().characters?.[getCtx().characterId]?.name;if(cn&&(cn.toLowerCase()===name.toLowerCase()||ruStem(cn)===ruStem(name)))return true;}catch(e){}
  return false;
}

function worldCatActive(cat,rt){
  if(cat.rules.some(r=>r.enabled&&r.sticky))return true;
  if(!cat.keywords||!cat.keywords.length)return true;
  if(anyKeywordMatch(cat.keywords,rt))return true;
  if(vectorActivated.has('c_'+cat.id))return true;
  return false;
}

function charIsActive(ch,rt){
  return isCurrentChar(ch.name)||anyKeywordMatch([ch.name,...(ch.keywords||[])],rt)||vectorActivated.has('c_'+ch.id);
}

function pairIsActive(pair,rt){
  const c1=isCurrentChar(pair.char1)||anyKeywordMatch([pair.char1,...(pair.keywords||[]).filter(k=>ruStem(k)===ruStem(pair.char1))],rt)||vectorActivated.has('c_'+pair.id);
  const c2=isCurrentChar(pair.char2)||anyKeywordMatch([pair.char2,...(pair.keywords||[]).filter(k=>ruStem(k)===ruStem(pair.char2))],rt)||vectorActivated.has('c_'+pair.id);
  return pair.activationMode==='soft'?(c1||c2):(c1&&c2);
}

// ══════════════════════════════════════════════════════════════════
// § 12 · PROMPT BUILDING
// ══════════════════════════════════════════════════════════════════

function fmtRule(r,s){
  let t=r.text;
  if(s.injectDates&&(r.date||r.reason))t+=' ['+[r.date,r.reason].filter(Boolean).join(' — ')+']';
  return t;
}

function buildWorldPrompt(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth),cp=s.compactMode,cats=[];
  s.worldRules.forEach(cat=>{
    if(!cat.enabled)return;
    if(!worldCatActive(cat,rt)){const st=cat.rules.filter(r=>r.enabled&&r.sticky);if(st.length)cats.push({n:cat.name,rules:st});return;}
    const ar=cat.rules.filter(r=>r.enabled);if(ar.length)cats.push({n:cat.name,rules:ar});
  });
  if(!cats.length)return '';
  let all=[];cats.forEach(c=>c.rules.forEach(r=>all.push({...r,_c:c.n})));
  all=applyTokenBudget(all,s.tokenBudgetWorld,rls=>cp?rls.map(r=>r.text).join('; '):rls.map(r=>'- '+r.text).join('\n'));
  const gp={};all.forEach(r=>{if(!gp[r._c])gp[r._c]=[];gp[r._c].push(r);});
  if(cp)return '[R:World] '+Object.entries(gp).map(([n,rs])=>n+': '+rs.map(r=>r.text).join('; ')).join(' | ')+' [/R]';
  const ln=['[WORLD_RULES_START]'];Object.entries(gp).forEach(([n,rs])=>{ln.push('## '+n);rs.forEach(r=>ln.push('- '+r.text));});ln.push('[WORLD_RULES_END]');return ln.join('\n');
}

function buildPersonalPrompt(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth),cp=s.compactMode,parts=[];
  s.personalRules.forEach(ch=>{
    if(!ch.rules.length||!charIsActive(ch,rt))return;
    let rules=ch.rules.filter(r=>r.enabled);if(!rules.length)return;
    rules=applyTokenBudget(rules,s.tokenBudgetPersonal,rls=>rls.map(r=>fmtRule(r,s)).join(cp?'; ':'\n'));
    if(!rules.length)return;
    if(cp)parts.push('[R:'+ch.name+'] '+rules.map(r=>fmtRule(r,s)).join('; ')+' [/R]');
    else{const ln=['[PERSONAL: '+ch.name+']'];rules.forEach(r=>ln.push('- '+fmtRule(r,s)));ln.push('[/PERSONAL]');parts.push(ln.join('\n'));}
  });
  return parts.join('\n');
}

function buildRelationsPrompt(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth),cp=s.compactMode,parts=[];
  s.relationshipRules.forEach(pair=>{
    if(!pair.rules.length||!pairIsActive(pair,rt))return;
    let rules=pair.rules.filter(r=>r.enabled);if(!rules.length)return;
    rules=applyTokenBudget(rules,s.tokenBudgetRelations,rls=>rls.map(r=>fmtRule(r,s)).join(cp?'; ':'\n'));
    if(!rules.length)return;
    const lb=pair.char1+'→'+pair.char2;
    if(cp)parts.push('[R:'+lb+'] '+rules.map(r=>fmtRule(r,s)).join('; ')+' [/R]');
    else{const ln=['[REL: '+lb+']'];rules.forEach(r=>ln.push('- '+fmtRule(r,s)));ln.push('[/REL]');parts.push(ln.join('\n'));}
  });
  return parts.join('\n');
}

// ══════════════════════════════════════════════════════════════════
// § 13 · PROMPT INJECTION + ACTIVATION SUMMARY  (#13)
// ══════════════════════════════════════════════════════════════════

async function updatePrompts(){
  const s=getSettings();const{setExtensionPrompt,extension_prompt_types:ept}=getCtx();
  if(!setExtensionPrompt){promptIsActive=false;refreshStatusUI();return;}
  const pt=ept?.IN_PROMPT??0;
  if(!s.enabled){
    setExtensionPrompt(STORAGE_KEY+'_w','',pt,0);setExtensionPrompt(STORAGE_KEY+'_p','',pt,0);setExtensionPrompt(STORAGE_KEY+'_r','',pt,0);
    promptIsActive=false;
  }else{
    const w=buildWorldPrompt(),p=buildPersonalPrompt(),r=buildRelationsPrompt();
    currentPrompts={w,p,r};
    setExtensionPrompt(STORAGE_KEY+'_w',w,pt,s.depthWorld||0);
    setExtensionPrompt(STORAGE_KEY+'_p',p,pt,s.depthPersonal||1);
    setExtensionPrompt(STORAGE_KEY+'_r',r,pt,s.depthRelations||2);
    promptIsActive=!!(w||p||r);
  }
  promptDirty=false;
  refreshStatusUI();
}

function countActiveRules(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth);
  let wc=0,pc=0,rc=0;
  s.worldRules.forEach(cat=>{
    if(!cat.enabled)return;
    if(worldCatActive(cat,rt)) wc+=cat.rules.filter(r=>r.enabled).length;
    else wc+=cat.rules.filter(r=>r.enabled&&r.sticky).length;
  });
  s.personalRules.forEach(ch=>{if(charIsActive(ch,rt))pc+=ch.rules.filter(r=>r.enabled).length;});
  s.relationshipRules.forEach(pair=>{if(pairIsActive(pair,rt))rc+=pair.rules.filter(r=>r.enabled).length;});
  return{wc,pc,rc};
}

function refreshStatusUI(){
  $('#wrt_prompt_dot').css('color',promptIsActive?'#34d399':'#4a5568');
  // Token counter in modal header
  const $t=$('#wrt_modal_tokens');
  if($t.length){
    if(promptIsActive){
      const w=estimateTokens(currentPrompts.w),p=estimateTokens(currentPrompts.p),r=estimateTokens(currentPrompts.r);
      $t.html(`<span style="color:#c084fc">🌍${w}</span>&nbsp;·&nbsp;<span style="color:#38bdf8">👤${p}</span>&nbsp;·&nbsp;<span style="color:#fb7185">💞${r}</span>&nbsp;·&nbsp;Σ${w+p+r}`).css('color','#34d399');
    }else{
      $t.text(tr('promptOff')).css('color','#4a5568');
    }
  }
  renderActivationSummary();
}

// #13 — summary bar inside modal tab body
function renderActivationSummary(){
  const $bar=$('#wrt_act_summary');if(!$bar.length)return;
  const{wc,pc,rc}=countActiveRules();
  const total=wc+pc+rc;
  if(total>0){
    $bar.html(trf('activeSummary',wc,pc,rc)).css('color','#34d399').show();
  }else{
    $bar.text(tr('noActiveRules')).css('color','#4a5568').show();
  }
}

// ══════════════════════════════════════════════════════════════════
// § 14 · AI
// ══════════════════════════════════════════════════════════════════

function extractAiText(d){
  if(d?.choices?.[0]?.message?.content!==undefined)return d.choices[0].message.content;
  if(d?.choices?.[0]?.text!==undefined)return d.choices[0].text;
  if(typeof d?.response==='string')return d.response;
  if(Array.isArray(d?.content)){const t=d.content.find(b=>b.type==='text');return t?.text??null;}
  if(typeof d?.content==='string')return d.content;
  return null;
}

async function aiGenerate(userPrompt,systemPrompt){
  const ctx=getCtx(),full=systemPrompt+'\n\n---\n\n'+userPrompt;
  if(typeof ctx.generateRaw==='function'){
    try{const r=await ctx.generateRaw(full,'',false,false,'','normal');if(r?.trim())return r;}catch(e){}
  }
  const eps=[
    {url:'/api/backends/chat-completions/generate',body:()=>({messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],stream:false})},
    {url:'/api/generate',body:()=>({prompt:full,max_new_tokens:2000,stream:false})},
    {url:'/generate',body:()=>({prompt:full,max_new_tokens:2000,stream:false})},
  ];
  for(const ep of eps){
    try{const r=await fetch(ep.url,{method:'POST',headers:getHeaders(),body:JSON.stringify(ep.body())});if(!r.ok)continue;const t=extractAiText(await r.json());if(t?.trim())return t;}catch(e){}
  }
  throw new Error(tr('errNoConn'));
}

function chatContext(depth){
  return(getCtx().chat||[]).slice(-depth).map(m=>'['+(m.is_user?'U':'C')+']: '+(m.mes||'').slice(0,600)).join('\n\n');
}

function getLoreText(){
  try{
    const wi=getCtx().worldInfoData||getCtx().worldInfo||{};const entries=[];
    Object.values(wi).forEach(block=>{const items=block?.entries||block;if(items&&typeof items==='object')Object.values(items).forEach(x=>{if(x?.content)entries.push(String(x.content));});});
    return entries.join('\n\n');
  }catch(e){return '';}
}

// ══════════════════════════════════════════════════════════════════
// § 15 · AI SCANNING  (#20 per-tab depth used in dS())
// ══════════════════════════════════════════════════════════════════

function parseRuleLines(text){
  const rules=[];
  (text||'').split('\n').forEach(line=>{
    const ln=line.trim();if(!ln||/^(EXISTING|OUTPUT|FORMAT|RULES|NOTE|#)/i.test(ln))return;
    const content=ln.replace(/^[-•*\d.)\]]+\s*/,'');if(content.length<5)return;
    const outdated=/\[OUTDATED\]/i.test(content);
    const rt=content.replace(/\[OUTDATED\]/gi,'').trim();
    if(rt.length>=5)rules.push({id:genId(),text:rt,enabled:!outdated,date:'',reason:'',priority:0,createdAt:nowLabel(),history:[]});
  });
  return rules;
}

async function scanWorld(depth,withLorebook){
  const s=getSettings();
  const existing=s.worldRules.map(c=>'## '+c.name+'\n'+c.rules.map(r=>'- '+r.text).join('\n')).join('\n\n');
  const lore=withLorebook?getLoreText():'';
  const raw=await aiGenerate(
    'CHAT:\n'+(chatContext(depth)||'(empty)')+(lore?'\n\nLORE:\n'+lore.slice(0,4000):'')+(existing?'\n\nEXISTING:\n'+existing:'')+'\n\nExtract world rules:',
    'Extract WORLD RULES. FORMAT:\n## Category\n- Rule (max 20 words)\nGroup by topic. ONLY permanent laws/mechanics. Preserve existing, ADD new. ALWAYS write rules in ENGLISH regardless of chat language.'
  );
  return parseWorldResponse(raw,s);
}

function parseWorldResponse(text,s){
  const cats=[];let cur=null;
  (text||'').split('\n').forEach(line=>{
    const ln=line.trim();if(!ln)return;
    const cm=ln.match(/^#{1,3}\s+(.+)/);
    if(cm){
      cur={id:genId(),name:cm[1].trim(),enabled:true,keywords:[],rules:[]};
      const ex=s.worldRules.find(c=>c.name.toLowerCase()===cur.name.toLowerCase());
      if(ex)cur={...ex,rules:[...ex.rules]};
      cats.push(cur);return;
    }
    const rm=ln.match(/^[-•*]\s+(.+)/);
    if(rm&&cur){const rt=rm[1].trim();if(rt.length>=5&&!cur.rules.some(r=>r.text.toLowerCase()===rt.toLowerCase()))cur.rules.push({id:genId(),text:rt,enabled:true,sticky:false,priority:0,createdAt:nowLabel(),history:[]});}
  });
  return cats;
}

async function scanPersonal(name,depth,withLorebook){
  const s=getSettings();
  const ex=s.personalRules.find(c=>c.name===name);
  const et=ex?ex.rules.map(r=>'- '+r.text).join('\n'):'';
  const lore=withLorebook?getLoreText():'';
  return parseRuleLines(await aiGenerate(
    'CHAT:\n'+(chatContext(depth)||'(empty)')+(lore?'\n\nLORE:\n'+lore.slice(0,4000):'')+(et?'\n\nEXISTING FOR '+name+':\n'+et:'')+'\n\nExtract personal rules for '+name+':',
    'Extract PERSONAL RULES for "'+name+'". Rules=behavioral codes,limits,vows. Numbered list, max 25 words. Preserve existing, ADD new. ALWAYS write rules in ENGLISH regardless of chat language.'
  ));
}

async function scanRelations(c1,c2,depth,withLorebook){
  const s=getSettings();
  const ex=s.relationshipRules.find(p=>p.char1===c1&&p.char2===c2);
  const et=ex?ex.rules.map(r=>'- '+r.text).join('\n'):'';
  const lore=withLorebook?getLoreText():'';
  return parseRuleLines(await aiGenerate(
    'CHAT:\n'+(chatContext(depth)||'(empty)')+(lore?'\n\nLORE:\n'+lore.slice(0,4000):'')+(et?'\n\nEXISTING ('+c1+'→'+c2+'):\n'+et:'')+'\n\nExtract relationship rules:',
    'Extract RELATIONSHIP RULES from "'+c1+'" TOWARD "'+c2+'". Focus on how '+c1+' relates to/treats/feels about '+c2+'. Rules=pacts,dynamics,boundaries,attitudes FROM '+c1+' perspective. Mark [OUTDATED] if contradicted. Numbered list, max 25 words. ALWAYS write rules in ENGLISH regardless of chat language.'
  ));
}

// ══════════════════════════════════════════════════════════════════
// § 16 · AI CONDENSATION & AUTO-KEYWORDS
// ══════════════════════════════════════════════════════════════════

async function condenseRules(rules,catName){
  return parseRuleLines(await aiGenerate(
    'Category: '+catName+'\nRules:\n'+rules.map((r,i)=>(i+1)+'. '+r.text).join('\n')+'\n\nCondense:',
    'Merge overlapping rules. Output MINIMUM set preserving ALL info. Max 25 words each. Numbered list. ALWAYS write in ENGLISH.'
  ));
}

function getCalendarDate(){
  try{const ctx=getCtx();const cs=hasChatCtx()?ctx.chat_metadata?.calendar_tracker:ctx.extensionSettings?.calendar_tracker;return cs?.currentDate||'';}catch(e){return '';}
}

async function autoKeywords(cat,tab){
  const name=tab==='relations'?(cat.char1+', '+cat.char2):cat.name;
  showToast(tr('genKw'),'#a78bfa',null,8000);
  try{
    const result=await aiGenerate(
      'Name: '+name+'\nRules: '+cat.rules.map(r=>r.text).join('; ').slice(0,800)+'\n\nGenerate activation keywords:',
      'Generate keyword list for a rule category. Keywords activate these rules when found in chat.\nOUTPUT: comma-separated list of 5-15 keywords.\nInclude: the name itself, all grammatical forms (cases, declensions), related terms, synonyms.\nFor Russian names generate ALL case forms: nom, gen, dat, acc, inst, prep.\nFor topic categories include related nouns, verbs, adjectives.\nONLY output the comma-separated list, nothing else.\nWrite keywords in the SAME LANGUAGE as the input.'
    );
    const kws=result.split(',').map(s=>s.trim().replace(/[."']/g,'')).filter(s=>s.length>=2&&s.length<40);
    if(kws.length){
      cat.keywords=[...new Set([...(cat.keywords||[]),...kws])];
      saveSettings();updatePrompts();renderTab();
      showToast(trf('kwAdded',kws.length),'#34d399');
    }else showToast(tr('kwFail'),'#f59e0b');
  }catch(e){showToast('Error: '+e.message,'#f87171');}
}

// ══════════════════════════════════════════════════════════════════
// § 17 · TOAST
// ══════════════════════════════════════════════════════════════════

let toastTimer=null;

function showToast(msg,color,undoFn,duration){
  color=color||'#34d399';duration=duration||4500;
  clearTimeout(toastTimer);$('.wrt-toast').remove();
  $('body').append('<div class="wrt-toast"><div class="wrt-toast-row">'
    +'<span class="wrt-toast-dot" style="background:'+color+'"></span>'
    +'<span class="wrt-toast-msg">'+escHtml(msg)+'</span>'
    +(undoFn?'<button class="wrt-toast-undo">↩</button>':'')
    +'</div></div>');
  setTimeout(()=>$('.wrt-toast').addClass('wrt-in'),10);
  if(undoFn)$('.wrt-toast-undo').on('click',()=>{undoFn();$('.wrt-toast').remove();});
  toastTimer=setTimeout(()=>{$('.wrt-toast').addClass('wrt-out');setTimeout(()=>$('.wrt-toast').remove(),300);},duration);
}

// ══════════════════════════════════════════════════════════════════
// § 18 · EXPORT / IMPORT  (#15 selective)
// ══════════════════════════════════════════════════════════════════

function buildExportPayload(opts){
  const s=getSettings(),payload={};
  if(opts.world)     payload.worldRules=s.worldRules;
  if(opts.personal)  payload.personalRules=s.personalRules;
  if(opts.relations) payload.relationshipRules=s.relationshipRules;
  if(opts.settings){
    ['depthWorld','depthPersonal','depthRelations','keywordDepth',
     'scanDepthWorld','scanDepthPersonal','scanDepthRelations',
     'tokenBudgetWorld','tokenBudgetPersonal','tokenBudgetRelations',
     'compactMode','injectDates','useVectors','vectorThreshold','lang'
    ].forEach(k=>{payload[k]=s[k];});
  }
  return payload;
}

function downloadJson(payload,filename){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
  showToast(tr('exported'),'#34d399');
}

function applyImport(data){
  const s=getSettings();
  ['worldRules','personalRules','relationshipRules'].forEach(k=>{if(Array.isArray(data[k]))s[k]=data[k];});
  ['depthWorld','depthPersonal','depthRelations','keywordDepth',
   'scanDepthWorld','scanDepthPersonal','scanDepthRelations',
   'tokenBudgetWorld','tokenBudgetPersonal','tokenBudgetRelations',
   'compactMode','injectDates','useVectors','vectorThreshold','lang'
  ].forEach(k=>{if(data[k]!==undefined)s[k]=data[k];});
  if(data.lang)currentLang=data.lang;
  saveSettings();updatePrompts();rebuildMetaUI();rebuildUI();renderTab();
}

// #15 — Selective export modal
function openExportModal(){
  $('.wrt-edit-overlay').remove();
  $('body').append(
    '<div class="wrt-edit-overlay" id="wrt_exp_ov">'
    +'<div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+tr('exportTitle')+'</span>'
    +'<button class="wrt-edit-x" id="wrt_exp_x">✕</button></div>'
    +'<div class="wrt-edit-body">'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_ex_w" checked><span>'+tr('exportWorld')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_ex_p" checked><span>'+tr('exportPersonal')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_ex_r" checked><span>'+tr('exportRelations')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_ex_s" checked><span>'+tr('exportSettings')+'</span></label>'
    +'</div>'
    +'<div class="wrt-edit-footer">'
    +'<button class="menu_button" id="wrt_exp_c">'+tr('cancel')+'</button>'
    +'<button class="menu_button wrt-save-btn" id="wrt_exp_ok">'+tr('doExport')+'</button>'
    +'</div></div></div>'
  );
  $('#wrt_exp_x,#wrt_exp_c').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wrt_exp_ok').on('click',()=>{
    const opts={world:$('#wrt_ex_w').is(':checked'),personal:$('#wrt_ex_p').is(':checked'),relations:$('#wrt_ex_r').is(':checked'),settings:$('#wrt_ex_s').is(':checked')};
    if(!opts.world&&!opts.personal&&!opts.relations&&!opts.settings){showToast('Выберите хотя бы один раздел','#f59e0b');return;}
    downloadJson(buildExportPayload(opts),'wrt_'+Date.now()+'.json');
    $('.wrt-edit-overlay').remove();
  });
}

function doImport(){
  const input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{try{applyImport(JSON.parse(ev.target.result));showToast(tr('imported'),'#34d399');}catch(e){showToast(tr('importErr'),'#f87171');}};
    reader.readAsText(file);
  };
  input.click();
}

function clearAll(){
  if(!confirm(tr('confirmClear')))return;
  const s=getSettings();
  const snap=JSON.stringify({w:s.worldRules,p:s.personalRules,r:s.relationshipRules});
  s.worldRules=[];s.personalRules=[];s.relationshipRules=[];
  saveSettings();updatePrompts();rebuildMetaUI();rebuildUI();renderTab();
  showToast(tr('cleared'),'#f87171',()=>{
    const d=JSON.parse(snap);const s2=getSettings();
    s2.worldRules=d.w;s2.personalRules=d.p;s2.relationshipRules=d.r;
    saveSettings();updatePrompts();rebuildMetaUI();rebuildUI();renderTab();
  },8000);
}

// ══════════════════════════════════════════════════════════════════
// § 19 · SETTINGS PANEL  (#16 lang toggle, #20 per-tab scan depths)
// ══════════════════════════════════════════════════════════════════

function buildSettingsPanel(){
  if($('#wrt_block').length)return;
  const $x=$('#extensions_settings2,#extensions_settings').first();if(!$x.length)return;

  $x.append(
    '<div class="wrt-block" id="wrt_block">'
    +'<div class="wrt-hdr" id="wrt_hdr">'
    +'<span class="wrt-gem">📜</span><span class="wrt-title">World Rules</span>'
    +'<span class="wrt-badge" id="wrt_badge" style="display:none">0</span>'
    +'<span class="wrt-prompt-dot" id="wrt_prompt_dot" style="color:#4a5568">●</span>'
    +'<span class="wrt-chev" id="wrt_chev">▾</span>'
    +'</div>'
    +'<div class="wrt-body" id="wrt_body">'
    +'<div class="wrt-meta" id="wrt_meta">'+tr('noData')+'</div>'

    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_en"><span>'+tr('enabled')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_cm"><span>'+tr('compact')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_id"><span>'+tr('injectDates')+'</span></label>'
    +'<label class="wrt-check-row"><input type="checkbox" id="wrt_uv"><span>'+tr('semanticAct')+'</span></label>'

    // #16 lang toggle
    +'<div class="wrt-field-label">'+tr('lang')+'</div>'
    +'<div class="wrt-field-row" style="margin-top:3px;gap:5px">'
    +'<button class="wrt-lang-btn" data-lang="ru" id="wrt_lang_ru">RU</button>'
    +'<button class="wrt-lang-btn" data-lang="en" id="wrt_lang_en">EN</button>'
    +'</div>'

    +'<div class="wrt-field-label">'+tr('injDepth')+'</div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">🌍</span><input type="range" id="wrt_dw" min="0" max="15" style="flex:1;accent-color:#c084fc;min-width:0"><span id="wrt_dwv" style="font-size:12px;color:#c084fc;min-width:18px;text-align:right">0</span></div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">👤</span><input type="range" id="wrt_dp" min="0" max="15" style="flex:1;accent-color:#38bdf8;min-width:0"><span id="wrt_dpv" style="font-size:12px;color:#38bdf8;min-width:18px;text-align:right">1</span></div>'
    +'<div class="wrt-field-row" style="margin-top:3px"><span class="wrt-flabel">💞</span><input type="range" id="wrt_dr" min="0" max="15" style="flex:1;accent-color:#fb7185;min-width:0"><span id="wrt_drv" style="font-size:12px;color:#fb7185;min-width:18px;text-align:right">2</span></div>'

    +'<div class="wrt-field-label" style="margin-top:4px">'+tr('tokenBudget')+'</div>'
    +'<div class="wrt-field-row">'
    +'<span class="wrt-flabel">🌍</span><input type="number" class="wrt-depth-inp" id="wrt_bw" min="0" max="2000" style="width:55px">'
    +'<span class="wrt-flabel">👤</span><input type="number" class="wrt-depth-inp" id="wrt_bp" min="0" max="2000" style="width:55px">'
    +'<span class="wrt-flabel">💞</span><input type="number" class="wrt-depth-inp" id="wrt_br" min="0" max="2000" style="width:55px">'
    +'</div>'

    +'<div class="wrt-field-row" style="margin-top:4px">'
    +'<span class="wrt-flabel">🔍 '+tr('kwDepth')+'</span>'
    +'<input type="number" class="wrt-depth-inp" id="wrt_kwd" min="1" max="50" style="width:50px">'
    +'<span style="font-size:10px;color:#3d4a60">'+tr('msgs')+'</span>'
    +'</div>'

    +'<div class="wrt-field-row" id="wrt_vtrow" style="margin-top:3px;display:none">'
    +'<span class="wrt-flabel">'+tr('vecThreshold')+'</span>'
    +'<input type="range" id="wrt_vth" min="0.3" max="0.9" step="0.05" style="flex:1;accent-color:#a78bfa;min-width:0">'
    +'<span id="wrt_vtv" style="font-size:12px;color:#a78bfa;min-width:30px;text-align:right">0.55</span>'
    +'</div>'

    +'<button class="menu_button wrt-open-btn" id="wrt_open_btn">'+tr('openBtn')+'</button>'

    +'<div class="wrt-sec">'
    +'<div class="wrt-sec-hdr" id="wrt_ch"><span style="font-size:10px;color:#4a5568" id="wrt_cc2">▸</span><span>'+tr('apiSec')+'</span></div>'
    +'<div class="wrt-sec-body" id="wrt_cb" style="display:none">'
    +'<button class="menu_button wrt-test-btn" id="wrt_ta">⚡ API</button> '
    +'<button class="menu_button wrt-test-btn" id="wrt_tv">🧠 Vec</button>'
    +'<div class="wrt-api-status" id="wrt_ts"></div>'
    +'</div></div>'

    +'</div></div>'
  );

  syncSettingsUI();
  bindSettingsEvents();
}

function syncSettingsUI(){
  const s=getSettings();
  $('#wrt_en').prop('checked',s.enabled!==false);
  $('#wrt_cm').prop('checked',!!s.compactMode);
  $('#wrt_id').prop('checked',!!s.injectDates);
  $('#wrt_uv').prop('checked',!!s.useVectors);
  $('#wrt_dw').val(s.depthWorld||0);          $('#wrt_dwv').text(s.depthWorld||0);
  $('#wrt_dp').val(s.depthPersonal||1);        $('#wrt_dpv').text(s.depthPersonal||1);
  $('#wrt_dr').val(s.depthRelations||2);       $('#wrt_drv').text(s.depthRelations||2);
  $('#wrt_kwd').val(s.keywordDepth||5);
  $('#wrt_bw').val(s.tokenBudgetWorld||0);
  $('#wrt_bp').val(s.tokenBudgetPersonal||0);
  $('#wrt_br').val(s.tokenBudgetRelations||0);
  $('#wrt_vth').val(s.vectorThreshold||0.55);
  $('#wrt_vtv').text((s.vectorThreshold||0.55).toFixed(2));
  $('#wrt_vtrow').toggle(!!s.useVectors);
  $('#wrt_lang_ru').toggleClass('active',currentLang==='ru');
  $('#wrt_lang_en').toggleClass('active',currentLang==='en');
  rebuildMetaUI();
}

function rebuildMetaUI(){
  const s=getSettings();
  const nw=s.worldRules.reduce((a,c)=>a+c.rules.length,0);
  const np=s.personalRules.reduce((a,c)=>a+c.rules.length,0);
  const nr=s.relationshipRules.reduce((a,x)=>a+x.rules.length,0);
  const total=nw+np+nr;
  $('#wrt_badge').text(total).toggle(total>0);
  const parts=[];if(nw)parts.push('🌍'+nw);if(np)parts.push('👤'+np);if(nr)parts.push('💞'+nr);
  $('#wrt_meta').text(parts.join(' · ')||tr('noData'));
}

function rebuildUI(){syncSettingsUI();}

function bindSettingsEvents(){
  const db={};const debounce=(k,fn)=>{clearTimeout(db[k]);db[k]=setTimeout(fn,400);};

  $('#wrt_hdr').on('click',()=>{const $b=$('#wrt_body');$b.slideToggle(180);$('#wrt_chev').text($b.is(':visible')?'▾':'▸');});
  $('#wrt_ch').on('click',()=>{const $b=$('#wrt_cb');$b.slideToggle(150);$('#wrt_cc2').text($b.is(':visible')?'▾':'▸');});

  $('#wrt_en').on('change',function(){getSettings().enabled=this.checked;saveSettings();updatePrompts();});
  $('#wrt_cm').on('change',function(){getSettings().compactMode=this.checked;saveSettings();updatePrompts();});
  $('#wrt_id').on('change',function(){getSettings().injectDates=this.checked;saveSettings();updatePrompts();});

  $('#wrt_uv').on('change',async function(){
    const s=getSettings();s.useVectors=this.checked;saveSettings();
    if(this.checked){const ok=await checkVectors();if(!ok){showToast(tr('vecOff'),'#f87171');s.useVectors=false;this.checked=false;saveSettings();}else{scheduleVectors();showToast(tr('vecOn'),'#a78bfa');}}
    $('#wrt_vtrow').toggle(!!s.useVectors);
  });

  // #16 language toggle
  $(document).on('click','[data-lang]',function(){
    const lang=$(this).data('lang');if(!['ru','en'].includes(lang))return;
    currentLang=lang;getSettings().lang=lang;saveSettings();
    $('#wrt_lang_ru').toggleClass('active',lang==='ru');
    $('#wrt_lang_en').toggleClass('active',lang==='en');
    if(isModalOpen())renderTab();
  });

  $('#wrt_dw').on('input',function(){const v=+this.value;$('#wrt_dwv').text(v);debounce('dw',()=>{getSettings().depthWorld=v;saveSettings();updatePrompts();});});
  $('#wrt_dp').on('input',function(){const v=+this.value;$('#wrt_dpv').text(v);debounce('dp',()=>{getSettings().depthPersonal=v;saveSettings();updatePrompts();});});
  $('#wrt_dr').on('input',function(){const v=+this.value;$('#wrt_drv').text(v);debounce('dr',()=>{getSettings().depthRelations=v;saveSettings();updatePrompts();});});
  $('#wrt_vth').on('input',function(){const v=+this.value;$('#wrt_vtv').text(v.toFixed(2));debounce('vt',()=>{getSettings().vectorThreshold=v;saveSettings();scheduleVectors();});});
  $('#wrt_kwd').on('change',function(){getSettings().keywordDepth=Math.max(1,+this.value||5);saveSettings();updatePrompts();});
  $('#wrt_bw').on('change',function(){getSettings().tokenBudgetWorld=Math.max(0,+this.value||0);saveSettings();updatePrompts();});
  $('#wrt_bp').on('change',function(){getSettings().tokenBudgetPersonal=Math.max(0,+this.value||0);saveSettings();updatePrompts();});
  $('#wrt_br').on('change',function(){getSettings().tokenBudgetRelations=Math.max(0,+this.value||0);saveSettings();updatePrompts();});

  $('#wrt_ta').on('click',async()=>{$('#wrt_ts').css('color','#7a8499').text('…');try{await aiGenerate('Reply: OK','Reply: OK');$('#wrt_ts').css('color','#34d399').text(tr('apiOk'));}catch(e){$('#wrt_ts').css('color','#f87171').text('✗ '+e.message);}});
  $('#wrt_tv').on('click',async()=>{$('#wrt_ts').css('color','#7a8499').text('…');const ok=await checkVectors();$('#wrt_ts').css('color',ok?'#34d399':'#f87171').text(ok?tr('vecOk'):tr('vecNA'));});

  // mobile-safe open button
  const el=document.getElementById('wrt_open_btn');
  if(el){
    let moved=false;
    el.addEventListener('touchstart',()=>{moved=false;},{passive:true});
    el.addEventListener('touchmove',()=>{moved=true;},{passive:true});
    el.addEventListener('touchend',e=>{if(!moved){e.preventDefault();openModal();}},{passive:false});
    el.addEventListener('click',openModal);
  }
}

// ══════════════════════════════════════════════════════════════════
// § 20 · MODAL
// ══════════════════════════════════════════════════════════════════

function isModalOpen(){return $('#wrt_modal').hasClass('wrt-mopen');}
function showModal(){$('#wrt_modal').addClass('wrt-mopen');}
function closeModal(){$('#wrt_modal').removeClass('wrt-mopen');}

function openModal(){
  collectNames();
  if($('#wrt_modal').length){showModal();renderTab();return;}

  $('body').append(
    '<div class="wrt-modal" id="wrt_modal">'
    +'<div class="wrt-modal-inner">'
    +'<div class="wrt-drag-handle"></div>'
    +'<div class="wrt-modal-hdr">'
    +'<span class="wrt-modal-icon">📜</span>'
    +'<span class="wrt-modal-title">World Rules</span>'
    +'<span class="wrt-modal-tokens" id="wrt_modal_tokens"></span>'
    +'<button class="wrt-modal-x" id="wrt_mx">✕</button>'
    +'</div>'
    +'<div class="wrt-tabs" id="wrt_tabs">'
    +'<button class="wrt-tab active" data-tab="world">'+tr('worldTab')+'</button>'
    +'<button class="wrt-tab" data-tab="personal">'+tr('personalTab')+'</button>'
    +'<button class="wrt-tab" data-tab="relations">'+tr('relTab')+'</button>'
    +'</div>'
    // #13 Activation summary bar
    +'<div id="wrt_act_summary" class="wrt-act-summary" style="display:none"></div>'
    +'<div class="wrt-tab-body" id="wrt_tb"></div>'
    +'<div class="wrt-modal-footer">'
    +'<button class="wrt-foot-btn" id="wrt_exp_btn">'+tr('exportBtn')+'</button>'
    +'<button class="wrt-foot-btn" id="wrt_imp_btn">'+tr('importBtn')+'</button>'
    +'<button class="wrt-foot-btn wrt-foot-clear" id="wrt_clr_btn">'+tr('clearBtn')+'</button>'
    +'<button class="wrt-foot-btn wrt-foot-close" id="wrt_cls_btn">'+tr('closeBtn')+'</button>'
    +'</div>'
    +'</div></div>'
  );

  showModal();
  refreshStatusUI();

  // Close
  $(document).on('click touchend','#wrt_mx,#wrt_cls_btn',e=>{e.preventDefault();e.stopPropagation();closeModal();});
  $(document).on('click touchend','#wrt_modal',function(e){if($(e.target).is('#wrt_modal')&&window.innerWidth>600){e.preventDefault();closeModal();}});
  // Tabs
  $(document).on('click touchend','#wrt_tabs .wrt-tab',function(e){
    e.preventDefault();
    $('#wrt_tabs .wrt-tab').removeClass('active');$(this).addClass('active');
    activeTab=$(this).data('tab');searchQuery='';renderTab();
  });
  // Footer
  $(document).on('click touchend','#wrt_exp_btn',e=>{e.preventDefault();e.stopPropagation();openExportModal();});
  $(document).on('click touchend','#wrt_imp_btn',e=>{e.preventDefault();e.stopPropagation();doImport();});
  $(document).on('click touchend','#wrt_clr_btn',e=>{e.preventDefault();e.stopPropagation();clearAll();});

  renderTab();
}

// ══════════════════════════════════════════════════════════════════
// § 21 · TAB RENDERING
// ══════════════════════════════════════════════════════════════════

function renderTab(){
  const $b=$('#wrt_tb');if(!$b.length)return;
  refreshStatusUI();
  if(activeTab==='world')      $b.html(buildWorldTabHtml());
  else if(activeTab==='personal') $b.html(buildPersonalTabHtml());
  else                          $b.html(buildRelationsTabHtml());
  bindTabEvents();
}

// ── search bar
function searchBarHtml(){
  return '<div class="wrt-search-row">'
    +'<input class="wrt-search-inp" id="wrt_sq" value="'+escHtml(searchQuery)+'" placeholder="'+tr('searchPh')+'">'
    +(searchQuery?'<button class="wrt-search-clear" id="wrt_sqc">✕</button>':'')
    +'</div>';
}

function matchesSearch(rule){
  if(!searchQuery)return true;
  const q=searchQuery.toLowerCase();
  return(rule.text||'').toLowerCase().includes(q)||(rule.date||'').toLowerCase().includes(q);
}

// ── priority badge
function prioBadgeHtml(p){
  const colors={0:'#4a5568',1:'#f59e0b',2:'#ef4444'};
  return'<span class="wrt-prio-badge" style="color:'+colors[p||0]+'" title="'+prioName(p||0)+'">'+PRIO_ICON[p||0]+'</span>';
}

// ── keyword badge
function kwBadgeHtml(kws,catId){
  if(!kws||!kws.length)return'';
  return'<span class="wrt-kw-badge" data-action="show-kw" data-catid="'+catId+'">🔑'+kws.length+'</span>'
    +'<span class="wrt-kw-pills wrt-kw-hidden" id="wrt_kwp_'+catId+'">'+kws.map(k=>'<span class="wrt-kw-pill">'+escHtml(k)+'</span>').join('')+'</span>';
}

// ── count tokens for display
function catTokens(rules,compact){
  if(!rules.length)return 0;
  return estimateTokens(compact?rules.map(r=>r.text).join('; '):rules.map(r=>'- '+r.text).join('\n'));
}

// ── single rule row  (#8 conflict, #10 drag handle, #11 history btn)
function ruleRowHtml(rule,idx,catId,tab,isWorld,showMeta,conflicts){
  const conflict=conflicts&&conflicts.has(rule.id);
  const meta=[];
  if(showMeta&&rule.date)  meta.push('<span class="wrt-rule-date">📅 '+escHtml(rule.date)+'</span>');
  if(showMeta&&rule.reason)meta.push('<span class="wrt-rule-reason">'+escHtml(rule.reason)+'</span>');
  if(isWorld&&rule.sticky) meta.push('<span class="wrt-rule-sticky">📌</span>');
  if(vectorActivated.has(rule.id))meta.push('<span class="wrt-rule-vec">🧠</span>');
  if(conflict)             meta.push('<span class="wrt-rule-conflict" title="'+tr('conflictTip')+'">⚠</span>');

  return'<div class="wrt-rule-row'+(rule.enabled?'':' disabled')+'" '
    +'data-ruleid="'+rule.id+'" data-catid="'+catId+'" data-tab="'+tab+'" '
    +'draggable="true">'
    // drag handle (#10)
    +'<span class="wrt-drag-grip" title="drag to reorder">≡</span>'
    +'<span class="wrt-rule-num">'+(idx+1)+'.</span>'
    +prioBadgeHtml(rule.priority)
    +'<div class="wrt-rule-body">'
    +'<span class="wrt-rule-text" data-action="edit-rule" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'">'+escHtml(rule.text)+'</span>'
    +(meta.length?'<div class="wrt-rule-meta">'+meta.join('')+'</div>':'')
    +'</div>'
    +'<div class="wrt-rule-acts">'
    +'<button class="wrt-rule-btn" data-action="cycle-prio" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'">'+PRIO_ICON[rule.priority||0]+'</button>'
    +(isWorld?'<button class="wrt-rule-btn" data-action="sticky-rule" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'" title="sticky">📌</button>':'')
    // #11 history button
    +(rule.history&&rule.history.length?'<button class="wrt-rule-btn" data-action="show-history" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'" title="history">📋</button>':'')
    +'<button class="wrt-rule-toggle'+(rule.enabled?' on':'')+'" data-action="toggle-rule" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'"></button>'
    +'<button class="wrt-rule-btn" data-action="del-rule" data-tab="'+tab+'" data-catid="'+catId+'" data-ruleid="'+rule.id+'">✕</button>'
    +'</div></div>';
}

// ── add-rule row
function addRuleRowHtml(catId,tab,showMeta){
  let h='<div class="wrt-add-row" style="padding-left:28px;flex-wrap:wrap">'
    +'<input class="wrt-add-txt" data-input="ar-'+tab+'-'+catId+'" placeholder="'+tr('rulePh')+'" style="flex:1;min-width:130px">';
  if(showMeta){
    h+='<input class="wrt-add-txt-sm" data-input="ad-'+tab+'-'+catId+'" placeholder="'+tr('dateLabel')+'" style="width:85px">'
      +'<input class="wrt-add-txt-sm" data-input="an-'+tab+'-'+catId+'" placeholder="'+tr('reasonLabel')+'" style="width:100px">';
  }
  return h+'<button class="wrt-add-btn" data-action="add-rule" data-tab="'+tab+'" data-catid="'+catId+'">+</button></div>';
}

// ── scan row  (#20 per-tab depth input)
function scanRowHtml(tab){
  const s=getSettings();
  const depthKey={'world':'scanDepthWorld','personal':'scanDepthPersonal','relations':'scanDepthRelations'}[tab];
  const depth=s[depthKey]||50;
  let sel='';
  if(tab==='personal') sel='<select class="wrt-add-select" id="wrt_sc">'+(s.personalRules.length?s.personalRules.map(c=>'<option value="'+escHtml(c.name)+'">'+escHtml(c.name)+'</option>').join(''):'<option>—</option>')+'</select>';
  else if(tab==='relations') sel='<select class="wrt-add-select" id="wrt_sp">'+(s.relationshipRules.length?s.relationshipRules.map(p=>'<option value="'+p.id+'">'+escHtml(p.char1)+'→'+escHtml(p.char2)+'</option>').join(''):'<option>—</option>')+'</select>';
  return'<div class="wrt-scan-row"><span class="wrt-scan-lbl">'+tr('scan')+'</span>'+sel
    +'<input type="number" class="wrt-depth-inp" id="wrt_sd_'+tab+'" value="'+depth+'" min="5" max="200" style="width:52px" title="'+tr('scanDepthLbl')+'">'
    +'<label class="wrt-scan-check"><input type="checkbox" id="wrt_sl_'+tab+'"'+(s.scanWithLorebook?' checked':'')+'><span>'+tr('lorebook')+'</span></label>'
    +'<button class="menu_button wrt-scan-btn" id="wrt_sb_'+tab+'">'+tr('scanBtn')+'</button>'
    +'</div><div class="wrt-scan-status" id="wrt_ss_'+tab+'"></div>';
}

// ── WORLD TAB
function buildWorldTabHtml(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth);
  let list='';
  if(!s.worldRules.length){
    list='<div class="wrt-empty">'+escHtml(tr('noWorld'))+'</div>';
  }else{
    s.worldRules.forEach(cat=>{
      const collapsed=!!collapsedCats['w_'+cat.id];
      const filtered=cat.rules.filter(r=>matchesSearch(r));
      if(searchQuery&&!filtered.length)return;
      const active=worldCatActive(cat,rt);
      const enabledCount=cat.rules.filter(r=>r.enabled).length;
      const tokens=catTokens(cat.rules.filter(r=>r.enabled),s.compactMode);
      const conflicts=detectConflicts(cat.rules);
      const kw=kwBadgeHtml(cat.keywords,cat.id);

      list+='<div class="wrt-cat-group'+(active?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+cat.id+'">'
        +'<div class="wrt-cat-hdr" data-section="world" data-catid="'+cat.id+'">'
        +'<span class="wrt-cat-chev">'+(collapsed?'▸':'▾')+'</span>'
        +'<span class="wrt-cat-name">'+escHtml(cat.name)+'</span>'+kw
        +'<span class="wrt-cat-count">'+enabledCount+'/'+cat.rules.length+'</span>'
        +'<span class="wrt-cat-tokens">~'+tokens+'t</span>'
        +(conflicts.size?'<span style="color:#f59e0b;font-size:10px" title="'+tr('conflictTip')+'">⚠</span>':'')
        +'<button class="wrt-cat-toggle'+(cat.enabled?' on':'')+'" data-action="toggle-cat" data-tab="world" data-catid="'+cat.id+'"></button>'
        +'<div class="wrt-cat-actions">'
        +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="world" data-catid="'+cat.id+'" title="AI condense">⚡</button>'
        +'<button class="wrt-cat-btn" data-action="auto-kw" data-tab="world" data-catid="'+cat.id+'" title="auto-keywords">🤖</button>'
        +'<button class="wrt-cat-btn" data-action="edit-cat-kw" data-tab="world" data-catid="'+cat.id+'" title="keywords">🔑</button>'
        +'<button class="wrt-cat-btn" data-action="rename-cat" data-tab="world" data-catid="'+cat.id+'">✎</button>'
        +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="world" data-catid="'+cat.id+'">✕</button>'
        +'</div></div>'
        +'<div class="wrt-cat-body"'+(collapsed?' style="display:none"':'')+'>';
      (searchQuery?filtered:cat.rules).forEach((r,i)=>{list+=ruleRowHtml(r,i,cat.id,'world',true,false,conflicts);});
      list+=addRuleRowHtml(cat.id,'world',false)+'</div></div>';
    });
  }

  const ns=[...collectNames()].filter(Boolean);
  const datalist=ns.length?'<datalist id="wrt_nl">'+ns.map(n=>'<option value="'+escHtml(n)+'">').join('')+'</datalist>':'';

  return datalist+searchBarHtml()
    +'<div class="wrt-list-wrap"><div class="wrt-list">'+list+'</div></div>'
    +'<div class="wrt-add-row"><input class="wrt-add-txt" id="wrt_awc" placeholder="'+tr('newCatPh')+'"><button class="wrt-add-btn" id="wrt_awcb">'+tr('addCat')+'</button></div>'
    +scanRowHtml('world');
}

// ── PERSONAL TAB
function buildPersonalTabHtml(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth);
  let list='';
  if(!s.personalRules.length){
    list='<div class="wrt-empty">'+escHtml(tr('noPersonal'))+'</div>';
  }else{
    s.personalRules.forEach(ch=>{
      const collapsed=!!collapsedCats['p_'+ch.id];
      const filtered=ch.rules.filter(r=>matchesSearch(r));
      if(searchQuery&&!filtered.length)return;
      const active=charIsActive(ch,rt);
      const enabledCount=ch.rules.filter(r=>r.enabled).length;
      const tokens=catTokens(ch.rules.filter(r=>r.enabled),s.compactMode);
      const conflicts=detectConflicts(ch.rules);
      const kw=kwBadgeHtml(ch.keywords,ch.id);

      list+='<div class="wrt-cat-group'+(active?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+ch.id+'">'
        +'<div class="wrt-cat-hdr" data-section="personal" data-catid="'+ch.id+'">'
        +'<span class="wrt-cat-chev">'+(collapsed?'▸':'▾')+'</span>'
        +'<span class="wrt-cat-name">'+escHtml(ch.name)+'</span>'+kw
        +'<span class="wrt-cat-count">'+enabledCount+'/'+ch.rules.length+'</span>'
        +'<span class="wrt-cat-tokens">~'+tokens+'t</span>'
        +(conflicts.size?'<span style="color:#f59e0b;font-size:10px" title="'+tr('conflictTip')+'">⚠</span>':'')
        +'<div class="wrt-cat-actions">'
        +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="personal" data-catid="'+ch.id+'">⚡</button>'
        +'<button class="wrt-cat-btn" data-action="auto-kw" data-tab="personal" data-catid="'+ch.id+'" title="auto-keywords">🤖</button>'
        +'<button class="wrt-cat-btn" data-action="edit-char" data-tab="personal" data-catid="'+ch.id+'">⚙</button>'
        +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="personal" data-catid="'+ch.id+'">✕</button>'
        +'</div></div>'
        +'<div class="wrt-cat-body"'+(collapsed?' style="display:none"':'')+'>';
      (searchQuery?filtered:ch.rules).forEach((r,i)=>{list+=ruleRowHtml(r,i,ch.id,'personal',false,true,conflicts);});
      list+=addRuleRowHtml(ch.id,'personal',true)+'</div></div>';
    });
  }

  const ns=[...collectNames()].filter(Boolean);
  const datalist=ns.length?'<datalist id="wrt_nl">'+ns.map(n=>'<option value="'+escHtml(n)+'">').join('')+'</datalist>':'';

  return datalist+searchBarHtml()
    +'<div class="wrt-list-wrap"><div class="wrt-list">'+list+'</div></div>'
    +'<div class="wrt-add-row"><input class="wrt-add-txt" id="wrt_apn" placeholder="'+tr('whoLabel')+'" list="wrt_nl"><button class="wrt-add-btn" id="wrt_apb">'+tr('addChar')+'</button></div>'
    +scanRowHtml('personal');
}

// ── RELATIONS TAB
function buildRelationsTabHtml(){
  const s=getSettings(),rt=recentChatText(s.keywordDepth);
  let list='';
  if(!s.relationshipRules.length){
    list='<div class="wrt-empty">'+escHtml(tr('noRelations'))+'</div>';
  }else{
    s.relationshipRules.forEach(pair=>{
      const collapsed=!!collapsedCats['r_'+pair.id];
      const filtered=pair.rules.filter(r=>matchesSearch(r));
      if(searchQuery&&!filtered.length)return;
      const active=pairIsActive(pair,rt);
      const enabledCount=pair.rules.filter(r=>r.enabled).length;
      const tokens=catTokens(pair.rules.filter(r=>r.enabled),s.compactMode);
      const conflicts=detectConflicts(pair.rules);
      const md=pair.activationMode==='soft'?tr('softMode'):tr('strictMode');

      list+='<div class="wrt-cat-group'+(active?' wrt-cat-active':' wrt-cat-inactive')+'" data-catid="'+pair.id+'">'
        +'<div class="wrt-cat-hdr" data-section="relations" data-catid="'+pair.id+'">'
        +'<span class="wrt-cat-chev">'+(collapsed?'▸':'▾')+'</span>'
        +'<span class="wrt-pair-badge">'+escHtml(pair.char1)+' <span class="wrt-pair-arrow">→</span> '+escHtml(pair.char2)+'</span>'
        +'<span class="wrt-act-mode" data-action="toggle-mode" data-catid="'+pair.id+'">'+md+'</span>'
        +'<span class="wrt-cat-count">'+enabledCount+'/'+pair.rules.length+'</span>'
        +'<span class="wrt-cat-tokens">~'+tokens+'t</span>'
        +(conflicts.size?'<span style="color:#f59e0b;font-size:10px" title="'+tr('conflictTip')+'">⚠</span>':'')
        +'<div class="wrt-cat-actions">'
        +'<button class="wrt-cat-btn" data-action="condense-cat" data-tab="relations" data-catid="'+pair.id+'">⚡</button>'
        +'<button class="wrt-cat-btn" data-action="del-cat" data-tab="relations" data-catid="'+pair.id+'">✕</button>'
        +'</div></div>'
        +'<div class="wrt-cat-body"'+(collapsed?' style="display:none"':'')+'>';
      (searchQuery?filtered:pair.rules).forEach((r,i)=>{list+=ruleRowHtml(r,i,pair.id,'relations',false,true,conflicts);});
      list+=addRuleRowHtml(pair.id,'relations',true)+'</div></div>';
    });
  }

  const ns=[...collectNames()].filter(Boolean);
  const datalist=ns.length?'<datalist id="wrt_nlr">'+ns.map(n=>'<option value="'+escHtml(n)+'">').join('')+'</datalist>':'';

  return datalist+searchBarHtml()
    +'<div class="wrt-list-wrap"><div class="wrt-list">'+list+'</div></div>'
    +'<div class="wrt-add-row">'
    +'<input class="wrt-add-txt-sm" id="wrt_ar1" placeholder="'+tr('whoLabel')+'" list="wrt_nlr" style="width:120px">'
    +'<span style="color:#4a5568">→</span>'
    +'<input class="wrt-add-txt-sm" id="wrt_ar2" placeholder="'+tr('toWhomLabel')+'" list="wrt_nlr" style="width:120px">'
    +'<button class="wrt-add-btn" id="wrt_arb">'+tr('addPair')+'</button>'
    +'</div>'
    +scanRowHtml('relations');
}

// ══════════════════════════════════════════════════════════════════
// § 22 · EDIT MODALS  (#11 save to history on rule edit)
// ══════════════════════════════════════════════════════════════════

function openRenameCatModal(cat){
  $('.wrt-edit-overlay').remove();
  $('body').append(
    '<div class="wrt-edit-overlay"><div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+tr('nameLabel')+'</span><button class="wrt-edit-x" id="wrx">✕</button></div>'
    +'<div class="wrt-edit-body"><input class="wrt-einput" id="wrv" value="'+escHtml(cat.name)+'"></div>'
    +'<div class="wrt-edit-footer"><button class="menu_button" id="wrc">'+tr('cancel')+'</button><button class="menu_button wrt-save-btn" id="wrs">'+tr('save')+'</button></div>'
    +'</div></div>'
  );
  $('#wrv').focus().select();
  $('#wrx,#wrc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wrs').on('click',()=>{const v=$('#wrv').val().trim();if(!v)return;cat.name=v;saveSettings();updatePrompts();renderTab();$('.wrt-edit-overlay').remove();});
  $('#wrv').on('keydown',e=>{if(e.key==='Enter')$('#wrs').click();});
}

function openEditKwModal(cat){
  $('.wrt-edit-overlay').remove();
  $('body').append(
    '<div class="wrt-edit-overlay"><div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+tr('kwLabel')+': '+escHtml(cat.name)+'</span><button class="wrt-edit-x" id="wkx">✕</button></div>'
    +'<div class="wrt-edit-body">'
    +'<div class="wrt-elabel">'+tr('kwLabel')+'</div>'
    +'<input class="wrt-einput" id="wkv" value="'+escHtml((cat.keywords||[]).join(', '))+'">'
    +'<div style="font-size:10px;color:#3d4a60;margin-top:4px">'+tr('alwaysActive')+'</div>'
    +'</div>'
    +'<div class="wrt-edit-footer"><button class="menu_button" id="wkc">'+tr('cancel')+'</button><button class="menu_button wrt-save-btn" id="wks">'+tr('save')+'</button></div>'
    +'</div></div>'
  );
  $('#wkv').focus();
  $('#wkx,#wkc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wks').on('click',()=>{cat.keywords=$('#wkv').val().split(',').map(s=>s.trim()).filter(Boolean);saveSettings();updatePrompts();renderTab();$('.wrt-edit-overlay').remove();});
}

function openEditCharModal(ch){
  $('.wrt-edit-overlay').remove();
  $('body').append(
    '<div class="wrt-edit-overlay"><div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+escHtml(ch.name)+'</span><button class="wrt-edit-x" id="wcx">✕</button></div>'
    +'<div class="wrt-edit-body">'
    +'<div class="wrt-elabel">'+tr('charName')+'</div><input class="wrt-einput" id="wcn" value="'+escHtml(ch.name)+'">'
    +'<div class="wrt-elabel">'+tr('kwForms')+'</div><input class="wrt-einput" id="wck" value="'+escHtml((ch.keywords||[]).join(', '))+'">'
    +'</div>'
    +'<div class="wrt-edit-footer"><button class="menu_button" id="wcc">'+tr('cancel')+'</button><button class="menu_button wrt-save-btn" id="wcs">'+tr('save')+'</button></div>'
    +'</div></div>'
  );
  $('#wcn').focus();
  $('#wcx,#wcc').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wcs').on('click',()=>{
    const n=$('#wcn').val().trim(),kw=$('#wck').val().split(',').map(s=>s.trim()).filter(Boolean);
    if(!n)return;ch.name=n;ch.keywords=kw.length?kw:[n];
    saveSettings();updatePrompts();collectNames();renderTab();$('.wrt-edit-overlay').remove();
  });
}

// #11: Rule edit with history tracking
function openEditRuleModal(cat,rule,tab){
  $('.wrt-edit-overlay').remove();
  const showMeta=(tab==='personal'||tab==='relations');
  const isWorld=(tab==='world');

  let body='<div class="wrt-elabel">'+tr('ruleText')+'</div>'
    +'<textarea class="wrt-etextarea" id="wrt_ret" rows="3">'+escHtml(rule.text)+'</textarea>';
  if(showMeta){
    body+='<div class="wrt-elabel">'+tr('dateLabel')+'</div><input class="wrt-einput" id="wrt_red" value="'+escHtml(rule.date||'')+'">'
      +'<div class="wrt-elabel">'+tr('reasonLabel')+'</div><input class="wrt-einput" id="wrt_rer" value="'+escHtml(rule.reason||'')+'">';
  }
  body+='<div class="wrt-elabel" style="margin-top:8px">'+tr('prioLabel')+'</div>'
    +'<div class="wrt-prio-row">'
    +[0,1,2].map(p=>'<label class="wrt-prio-opt'+(rule.priority===p?' active':'')+'">'
      +'<input type="radio" name="wrp" value="'+p+'"'+(rule.priority===p?' checked':'')+'>'
      +PRIO_ICON[p]+' '+prioName(p)+'</label>').join('')
    +'</div>';
  if(isWorld) body+='<label class="wrt-check-row" style="margin-top:6px"><input type="checkbox" id="wrt_resk"'+(rule.sticky?' checked':'')+'>'+tr('stickyLabel')+'</label>';

  // #11: show history preview
  if(rule.history&&rule.history.length){
    body+='<div class="wrt-elabel" style="margin-top:8px">'+tr('histEdited')+': '+rule.history.length+'×</div>';
  }

  $('body').append(
    '<div class="wrt-edit-overlay"><div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+tr('editTitle')+'</span><button class="wrt-edit-x" id="wrex">✕</button></div>'
    +'<div class="wrt-edit-body">'+body+'</div>'
    +'<div class="wrt-edit-footer"><button class="menu_button" id="wrec">'+tr('cancel')+'</button><button class="menu_button wrt-save-btn" id="wres">'+tr('save')+'</button></div>'
    +'</div></div>'
  );
  $('#wrt_ret').focus();
  $('#wrex,#wrec').on('click',()=>$('.wrt-edit-overlay').remove());
  $('#wres').on('click',()=>{
    const newText=$('#wrt_ret').val().trim();if(!newText)return;

    // #11: push old text to history before overwriting
    if(rule.text&&rule.text!==newText){
      if(!Array.isArray(rule.history)) rule.history=[];
      rule.history.push({text:rule.text,at:nowLabel()});
    }

    rule.text=newText;
    rule.priority=+$('input[name=wrp]:checked').val()||0;
    rule.updatedAt=nowLabel();
    if(showMeta){rule.date=($('#wrt_red').val()||'').trim();rule.reason=($('#wrt_rer').val()||'').trim();}
    if(isWorld) rule.sticky=$('#wrt_resk').is(':checked');
    saveSettings();updatePrompts();renderTab();$('.wrt-edit-overlay').remove();
    showToast(tr('saved'),'#34d399');
  });
  $('#wrt_ret').on('keydown',e=>{if(e.key==='Enter'&&e.ctrlKey)$('#wres').click();});
}

// ══════════════════════════════════════════════════════════════════
// § 23 · HISTORY MODAL  (#11)
// ══════════════════════════════════════════════════════════════════

function openHistoryModal(rule){
  $('.wrt-edit-overlay').remove();
  const hist=rule.history||[];
  let body='<div class="wrt-elabel">'+tr('histCreated')+': '+(rule.createdAt||'—')+'</div>';
  if(rule.updatedAt) body+='<div class="wrt-elabel">'+tr('histEdited')+': '+rule.updatedAt+'</div>';
  body+='<hr style="border-color:rgba(255,255,255,0.06);margin:10px 0">';
  if(!hist.length){
    body+='<div style="color:#3d4a60;font-size:12px">'+tr('histEmpty')+'</div>';
  }else{
    body+=hist.slice().reverse().map((h,i)=>
      '<div style="margin-bottom:10px">'
      +'<div style="font-size:10px;color:#4a5568">'+escHtml(h.at)+'</div>'
      +'<div style="font-size:12px;color:#94a3b8;margin-top:3px;padding-left:6px;border-left:2px solid rgba(255,255,255,0.08)">'+escHtml(h.text)+'</div>'
      +'</div>'
    ).join('');
  }

  $('body').append(
    '<div class="wrt-edit-overlay"><div class="wrt-edit-modal">'
    +'<div class="wrt-edit-hdr"><span class="wrt-edit-title">'+tr('histTitle')+'</span><button class="wrt-edit-x" id="whx">✕</button></div>'
    +'<div class="wrt-edit-body">'+body+'</div>'
    +'<div class="wrt-edit-footer"><button class="menu_button wrt-save-btn" id="whc">'+tr('closeBtn')+'</button></div>'
    +'</div></div>'
  );
  $('#whx,#whc').on('click',()=>$('.wrt-edit-overlay').remove());
}

// ══════════════════════════════════════════════════════════════════
// § 24 · ACTION HANDLER
// ══════════════════════════════════════════════════════════════════

function handleAction($el){
  const act=$el.data('action'),tab=$el.data('tab')||activeTab;
  const catId=$el.data('catid'),ruleId=$el.data('ruleid');
  const s=getSettings();
  let arr,cat,rule;
  if(tab==='world')arr=s.worldRules;else if(tab==='personal')arr=s.personalRules;else arr=s.relationshipRules;
  if(catId)cat=arr.find(c=>c.id===catId);if(cat&&ruleId)rule=cat.rules.find(r=>r.id===ruleId);

  switch(act){
    case 'toggle-cat':
      if(cat){cat.enabled=!cat.enabled;saveSettings();updatePrompts();renderTab();}break;
    case 'rename-cat': if(cat)openRenameCatModal(cat);break;
    case 'edit-char':  if(cat)openEditCharModal(cat);break;
    case 'edit-cat-kw':if(cat)openEditKwModal(cat);break;
    case 'toggle-mode':
      if(cat){cat.activationMode=cat.activationMode==='soft'?'strict':'soft';saveSettings();updatePrompts();renderTab();showToast(cat.activationMode==='soft'?tr('softMode'):tr('strictMode'),'#fb7185');}break;
    case 'del-cat':{
      if(!cat||!confirm(tr('confirmDel')))break;
      const idx=arr.indexOf(cat);arr.splice(idx,1);
      saveSettings();updatePrompts();rebuildMetaUI();renderTab();
      showToast(tr('deleted'),'#f87171',()=>{arr.splice(idx,0,cat);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});break;}
    case 'toggle-rule':
      if(rule){rule.enabled=!rule.enabled;saveSettings();updatePrompts();renderTab();}break;
    case 'sticky-rule':
      if(rule){rule.sticky=!rule.sticky;saveSettings();updatePrompts();renderTab();showToast(rule.sticky?'📌 Sticky':'Снято',rule.sticky?'#fbbf24':'#94a3b8');}break;
    case 'cycle-prio':
      if(rule){rule.priority=((rule.priority||0)+1)%3;saveSettings();updatePrompts();renderTab();showToast(prioName(rule.priority),[' #4a5568','#f59e0b','#ef4444'][rule.priority]);}break;
    case 'del-rule':{
      if(!cat||!rule)break;
      const idx=cat.rules.indexOf(rule);cat.rules.splice(idx,1);
      saveSettings();updatePrompts();rebuildMetaUI();renderTab();
      showToast(tr('deleted'),'#f87171',()=>{cat.rules.splice(idx,0,rule);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});break;}
    case 'edit-rule':  if(cat&&rule)openEditRuleModal(cat,rule,tab);break;
    case 'show-history':if(cat&&rule)openHistoryModal(rule);break;
    case 'add-rule':{
      if(!cat)break;
      const $inp=$('[data-input="ar-'+tab+'-'+catId+'"]'),txt=$inp.val().trim();
      if(!txt){$inp.focus();return;}
      const nr={id:genId(),text:txt,enabled:true,priority:0,createdAt:nowLabel(),history:[]};
      if(tab==='world') nr.sticky=false;
      else{
        nr.date=$('[data-input="ad-'+tab+'-'+catId+'"]').val()?.trim()||'';
        nr.reason=$('[data-input="an-'+tab+'-'+catId+'"]').val()?.trim()||'';
        if(!nr.date){const cd=getCalendarDate();if(cd)nr.date=cd;}
      }
      cat.rules.push(nr);saveSettings();updatePrompts();rebuildMetaUI();$inp.val('');
      if(tab!=='world'){$('[data-input="ad-'+tab+'-'+catId+'"]').val('');$('[data-input="an-'+tab+'-'+catId+'"]').val('');}
      renderTab();break;}
    case 'condense-cat':if(cat)doCondense(cat,tab);break;
    case 'show-kw':{$('#wrt_kwp_'+catId).toggleClass('wrt-kw-hidden');break;}
    case 'auto-kw':if(cat)autoKeywords(cat,tab);break;
  }
}

// ══════════════════════════════════════════════════════════════════
// § 25 · CONDENSE
// ══════════════════════════════════════════════════════════════════

async function doCondense(cat,tab){
  const enabled=cat.rules.filter(r=>r.enabled);
  if(enabled.length<3){showToast(tr('condenseMin'),'#f59e0b');return;}
  const label=tab==='relations'?(cat.char1+'→'+cat.char2):cat.name;
  showToast(tr('condensing'),'#a78bfa',null,10000);
  try{
    const condensed=await condenseRules(enabled,label);if(!condensed.length){showToast(tr('condenseFail'),'#f59e0b');return;}
    const oldTokens=estimateTokens(enabled.map(r=>r.text).join('\n'));
    const newTokens=estimateTokens(condensed.map(r=>r.text).join('\n'));
    if(confirm(enabled.length+'→'+condensed.length+' правил, ~'+oldTokens+'→~'+newTokens+' токенов\n\n'+condensed.map((r,i)=>(i+1)+'. '+r.text).join('\n')+'\n\nПрименить?')){
      const snap=JSON.stringify(cat.rules);
      cat.rules=[...cat.rules.filter(r=>!r.enabled),...condensed];
      saveSettings();updatePrompts();rebuildMetaUI();renderTab();
      showToast(tr('condensed'),'#a78bfa',()=>{cat.rules=JSON.parse(snap);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});
    }
  }catch(e){showToast('Error: '+e.message,'#f87171');}
}

// ══════════════════════════════════════════════════════════════════
// § 26 · SCAN HANDLER  (#20 uses per-tab depth)
// ══════════════════════════════════════════════════════════════════

async function doScan(tab,$btn){
  const $status=$('#wrt_ss_'+tab);
  // #20: read per-tab depth
  const depth=+$('#wrt_sd_'+tab).val()||50;
  const withLore=$('#wrt_sl_'+tab).is(':checked');

  // Save per-tab depth back to settings
  const s=getSettings();
  const depthKey={'world':'scanDepthWorld','personal':'scanDepthPersonal','relations':'scanDepthRelations'}[tab];
  s[depthKey]=depth;s.scanWithLorebook=withLore;saveSettings();

  $btn.prop('disabled',true).text('…');
  $status.css('color','#7a8499').text(tr('scanning'));
  try{
    if(tab==='world'){
      const snap=JSON.stringify(s.worldRules);
      const cats=await scanWorld(depth,withLore);
      if(cats.length){
        cats.forEach(nc=>{
          const ex=s.worldRules.find(c=>c.name.toLowerCase()===nc.name.toLowerCase());
          if(ex) nc.rules.forEach(nr=>{if(!ex.rules.some(r=>r.text.toLowerCase()===nr.text.toLowerCase()))ex.rules.push(nr);});
          else s.worldRules.push(nc);
        });
        saveSettings();updatePrompts();rebuildMetaUI();renderTab();
        $status.css('color','#34d399').text('✅');
        showToast(tr('worldUpd'),'#c084fc',()=>{s.worldRules=JSON.parse(snap);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});
      }else $status.text(tr('nothingNew'));

    }else if(tab==='personal'){
      const name=$('#wrt_sc').val();if(!name)throw new Error(tr('selectTarget'));
      const ch=s.personalRules.find(c=>c.name===name);if(!ch)throw new Error('?');
      const snap=JSON.stringify(ch.rules);
      const newRules=await scanPersonal(name,depth,withLore);let added=0;
      newRules.forEach(r=>{if(!ch.rules.some(x=>x.text.toLowerCase()===r.text.toLowerCase())){ch.rules.push(r);added++;}});
      saveSettings();updatePrompts();rebuildMetaUI();renderTab();
      $status.css('color','#34d399').text('✅ +'+added);
      showToast(name+' +'+added,'#38bdf8',()=>{ch.rules=JSON.parse(snap);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});

    }else{
      const pid=$('#wrt_sp').val();if(!pid)throw new Error(tr('selectTarget'));
      const pair=s.relationshipRules.find(x=>x.id===pid);if(!pair)throw new Error('?');
      const snap=JSON.stringify(pair.rules);
      const newRules=await scanRelations(pair.char1,pair.char2,depth,withLore);let added=0;
      newRules.forEach(r=>{
        const ei=pair.rules.findIndex(x=>x.text.toLowerCase()===r.text.toLowerCase());
        if(ei===-1){pair.rules.push(r);added++;}else if(!r.enabled)pair.rules[ei].enabled=false;
      });
      saveSettings();updatePrompts();rebuildMetaUI();renderTab();
      $status.css('color','#34d399').text('✅ +'+added);
      showToast('Отношения +'+added,'#fb7185',()=>{pair.rules=JSON.parse(snap);saveSettings();updatePrompts();rebuildMetaUI();renderTab();});
    }
  }catch(e){$status.css('color','#f87171').text('✗ '+e.message);}
  $btn.prop('disabled',false).text(tr('scanBtn'));
}

// ══════════════════════════════════════════════════════════════════
// § 27 · TAB EVENTS + DRAG-AND-DROP  (#10)
// ══════════════════════════════════════════════════════════════════

function bindTabEvents(){
  const $tb=$('#wrt_tb');

  // Search
  $('#wrt_sq').off('input').on('input',function(){searchQuery=this.value;renderTab();});
  $('#wrt_sqc').off('click').on('click',()=>{searchQuery='';renderTab();});

  // Collapse / expand categories
  $tb.off('click.ch').on('click.ch','.wrt-cat-hdr',function(e){
    if($(e.target).closest('[data-action]').length)return;
    const id=$(this).data('catid');
    const key=activeTab.charAt(0)+'_'+id;
    collapsedCats[key]=!collapsedCats[key];
    $(this).closest('.wrt-cat-group').find('.wrt-cat-body')[collapsedCats[key]?'slideUp':'slideDown'](160);
    $(this).find('.wrt-cat-chev').text(collapsedCats[key]?'▸':'▾');
  });

  // Actions
  $tb.off('click.act').on('click.act','[data-action]',function(e){e.stopPropagation();handleAction($(this));});

  // Enter in add-rule input
  $tb.off('keydown.ar').on('keydown.ar','[data-input^="ar-"]',function(e){
    if(e.key==='Enter')$(this).closest('.wrt-add-row').find('[data-action="add-rule"]').click();
  });

  // Add world category
  $('#wrt_awcb').off('click').on('click',()=>{
    const n=$('#wrt_awc').val().trim();if(!n)return;
    getSettings().worldRules.push({id:genId(),name:n,enabled:true,keywords:[],rules:[]});
    saveSettings();updatePrompts();rebuildMetaUI();$('#wrt_awc').val('');renderTab();
  });
  $('#wrt_awc').off('keydown').on('keydown',e=>{if(e.key==='Enter')$('#wrt_awcb').click();});

  // Add personal character
  $('#wrt_apb').off('click').on('click',()=>{
    const n=$('#wrt_apn').val().trim();if(!n)return;
    const s=getSettings();
    if(s.personalRules.some(c=>c.name.toLowerCase()===n.toLowerCase())){showToast(tr('alreadyExists'),'#f59e0b');return;}
    s.personalRules.push({id:genId(),name:n,keywords:[n],rules:[]});
    saveSettings();rebuildMetaUI();$('#wrt_apn').val('');collectNames();renderTab();
  });
  $('#wrt_apn').off('keydown').on('keydown',e=>{if(e.key==='Enter')$('#wrt_apb').click();});

  // Add relations pair
  $('#wrt_arb').off('click').on('click',()=>{
    const c1=$('#wrt_ar1').val().trim(),c2=$('#wrt_ar2').val().trim();
    if(!c1||!c2){showToast(tr('bothNames'),'#f59e0b');return;}
    if(c1.toLowerCase()===c2.toLowerCase()){showToast(tr('diffNames'),'#f59e0b');return;}
    const s=getSettings();
    if(s.relationshipRules.some(p=>p.char1.toLowerCase()===c1.toLowerCase()&&p.char2.toLowerCase()===c2.toLowerCase())){showToast(tr('alreadyExists'),'#f59e0b');return;}
    s.relationshipRules.push({id:genId(),char1:c1,char2:c2,keywords:[c1,c2],activationMode:'strict',rules:[]});
    saveSettings();rebuildMetaUI();$('#wrt_ar1').val('');$('#wrt_ar2').val('');collectNames();renderTab();
  });

  // Scan buttons
  $('#wrt_sb_world').off('click').on('click',async function(){await doScan('world',$(this));});
  $('#wrt_sb_personal').off('click').on('click',async function(){await doScan('personal',$(this));});
  $('#wrt_sb_relations').off('click').on('click',async function(){await doScan('relations',$(this));});

  // ── Drag-and-drop rule reordering (#10)
  $tb.off('dragstart.dr').on('dragstart.dr','.wrt-rule-row',function(e){
    dragSrcRuleId=$(this).data('ruleid');
    dragSrcCatId =$(this).data('catid');
    dragSrcTab   =$(this).data('tab');
    e.originalEvent.dataTransfer.effectAllowed='move';
    $(this).addClass('wrt-dragging');
  });

  $tb.off('dragend.dr').on('dragend.dr','.wrt-rule-row',function(){
    $(this).removeClass('wrt-dragging');
    $tb.find('.wrt-rule-row').removeClass('wrt-drag-over');
    dragSrcRuleId=null;dragSrcCatId=null;dragSrcTab=null;
  });

  $tb.off('dragover.dr').on('dragover.dr','.wrt-rule-row',function(e){
    e.preventDefault();
    e.originalEvent.dataTransfer.dropEffect='move';
    if($(this).data('ruleid')!==dragSrcRuleId){
      $tb.find('.wrt-rule-row').removeClass('wrt-drag-over');
      $(this).addClass('wrt-drag-over');
    }
  });

  $tb.off('drop.dr').on('drop.dr','.wrt-rule-row',function(e){
    e.preventDefault();e.stopPropagation();
    $(this).removeClass('wrt-drag-over');
    const destRuleId=$(this).data('ruleid');
    const destCatId =$(this).data('catid');
    const destTab   =$(this).data('tab');
    // Only reorder within the same category
    if(!dragSrcRuleId||destRuleId===dragSrcRuleId)return;
    if(dragSrcCatId!==destCatId||dragSrcTab!==destTab)return;

    const s=getSettings();
    let arr;
    if(destTab==='world')arr=s.worldRules;else if(destTab==='personal')arr=s.personalRules;else arr=s.relationshipRules;
    const cat=arr.find(c=>c.id===destCatId);if(!cat)return;

    const srcIdx=cat.rules.findIndex(r=>r.id===dragSrcRuleId);
    const dstIdx=cat.rules.findIndex(r=>r.id===destRuleId);
    if(srcIdx===-1||dstIdx===-1)return;

    // Splice rule from src position, insert at dest position
    const[moved]=cat.rules.splice(srcIdx,1);
    cat.rules.splice(dstIdx,0,moved);
    saveSettings();updatePrompts();renderTab();
  });
}

// ══════════════════════════════════════════════════════════════════
// § 28 · ST EVENTS + BOOT
// ══════════════════════════════════════════════════════════════════

function bindSillyTavernEvents(){
  const{eventSource:es,event_types:et}=getCtx();
  es.on(et.APP_READY,async()=>{
    buildSettingsPanel();
    await updatePrompts();
    if(getSettings().useVectors)checkVectors();
  });
  es.on(et.CHAT_CHANGED,async()=>{
    collapsedCats={};searchQuery='';vectorActivated=new Set();
    collectNames();rebuildUI();await updatePrompts();if(isModalOpen())renderTab();
  });
  es.on(et.MESSAGE_RECEIVED,async()=>{
    promptDirty=true;await updatePrompts();
    if(getSettings().useVectors&&vectorsAvailable)scheduleVectors();
  });
  if(et.GENERATION_ENDED)es.on(et.GENERATION_ENDED,async()=>{promptDirty=true;await updatePrompts();});
  $(document).on('keydown.wrt',e=>{
    if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();if(isModalOpen())closeModal();else openModal();}
  });
}

jQuery(()=>{
  try{bindSillyTavernEvents();console.log('[World Rules Tracker v3.0] ✦ loaded');}
  catch(e){console.error('[WRT]',e);}
});

})();
