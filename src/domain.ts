export const CONFIG = { spot: 11.9, forward: 12, conversionFee: 0.001, today: '2026-11-12', schema: 1 };
export type Invoice = { id: string; number: string; contract: string; supplier: string; amount: number; currency: string; settlement: string; indexed: boolean; fixing: string; created: string; due: string; status: 'Ожидает оплаты' | 'Оплачен' | 'Отменён'; stage: boolean };
export type Hedge = { id: string; allocations: { invoiceId: string; amount: number }[]; due: string; fixing: string; rate: number; status: 'Предложение' | 'Исполнен в демо' | 'Требует пересмотра' | 'Завершён'; policyVersion: number; executedAt?: string; reason: string };
export type Policy = { version: number; approved: boolean; mode: 'manual' | 'auto'; coverage: number; min: number; maxDays: number; dailyCap: number; limit: number; template: 'invoice' | 'stages' };
export type Ticket = { id: string; service: string; invoiceId: string; message: string; attachment: string; status: string };
export type Conversion = { id: string; from: string; to: string; amount: number; received: number; fee: number; invoiceId: string; allocated: number; at: string };
export type State = { schema: number; invoices: Invoice[]; hedges: Hedge[]; policy: Policy; tickets: Ticket[]; conversions: Conversion[]; events: { id: string; text: string; at: string }[]; erp: string; syncedAt: string };
export const uid = () => crypto.randomUUID();
export function event(state: State, text: string): State { return { ...state, events: [{ id: uid(), text, at: new Date().toISOString() }, ...state.events].slice(0, 150) }; }
export function seed(): State {
  const amounts = [25000, 18000, 14000, 800, 900, 12000, 9000, 400000, 7000, 100000];
  const suppliers = ['Shenzhen Nova Supply', 'Hangzhou Equipment', 'Ningbo Components', 'Shanghai Precision', 'Shanghai Precision', 'Qingdao Industrial', 'Suzhou Electric', 'Wuhan Machinery', 'Dalian Tools', 'ООО «Северный склад»'];
  const invoices: Invoice[] = amounts.map((amount, i) => ({ id: `inv-${i+1}`, number: `CN-${1024+i}`, contract: `VED-${200+i}`, supplier: suppliers[i], amount, currency: i === 9 ? 'RUB' : 'CNY', settlement: i === 5 ? 'CNY' : 'RUB', indexed: i !== 9, fixing: i === 6 ? '' : 'Курс ЦБ на дату оплаты', created: CONFIG.today, due: i === 3 || i === 4 ? '2026-12-10' : `2026-12-${15+i}`, status: 'Ожидает оплаты', stage: false }));
  return { schema: CONFIG.schema, invoices, hedges: [{ id: 'hedge-initial', allocations: [{ invoiceId: 'inv-2', amount: 6000 }], due: invoices[1].due, fixing: invoices[1].fixing, rate: 12, status: 'Исполнен в демо', policyVersion: 1, executedAt: new Date().toISOString(), reason: 'Ранее подтверждённая защита обязательства' }], policy: { version: 1, approved: false, mode: 'manual', coverage: 80, min: 2000, maxDays: 90, dailyCap: 100000, limit: 2000000, template: 'invoice' }, tickets: [], conversions: [], events: [{ id: 'welcome', text: 'Демонстрационный портфель загружен', at: new Date().toISOString() }], erp: '', syncedAt: '' };
}
export const active = (h: Hedge) => h.status === 'Исполнен в демо' || h.status === 'Требует пересмотра';
export function hedged(state: State, invoiceId: string, includeProposals = false, exclude = '') { return state.hedges.filter(h => h.id !== exclude && (active(h) || (includeProposals && h.status === 'Предложение'))).reduce((s, h) => s + h.allocations.filter(a => a.invoiceId === invoiceId).reduce((n, a) => n + a.amount, 0), 0); }
export function funded(state: State, invoiceId: string) { return state.conversions.filter(c => c.invoiceId === invoiceId).reduce((s,c) => s+c.allocated,0); }
export function exposed(i: Invoice) { return i.status === 'Ожидает оплаты' && (i.settlement === 'CNY' || (i.settlement === 'RUB' && i.indexed && i.currency === 'CNY')); }
export function remaining(state: State, i: Invoice, reserve = false, exclude = '') { return Math.max(0, i.amount - hedged(state, i.id, reserve, exclude) - funded(state,i.id)); }
export function usedLimit(state: State) { return state.hedges.filter(active).reduce((s,h) => s+h.allocations.reduce((n,a) => n+a.amount,0)*h.rate,0); }
export function scenario(amount: number, coverage: number, rate: number, spot: number) { const supplier = amount*spot; const payout = coverage*(spot-rate); return { supplier, payout, total: supplier-payout }; }
export function eligible(state: State, i: Invoice): string {
  if (i.status !== 'Ожидает оплаты') return 'Обязательство закрыто или отменено';
  if (i.currency !== 'CNY' || !i.indexed) return 'Прямой валютный риск не выявлен';
  if (i.settlement !== 'RUB') return 'Нужна поставка CNY: условия согласует менеджер';
  if (!i.fixing || !i.supplier || !i.contract || !Number.isFinite(i.amount) || i.amount <= 0) return 'Неполные данные обязательства';
  const days = (Date.parse(i.due)-Date.parse(CONFIG.today))/86400000;
  if (!Number.isFinite(days) || days < 1 || days > state.policy.maxDays) return 'Дата вне горизонта политики';
  if (state.hedges.some(h=>h.status==='Требует пересмотра' && h.allocations.some(a=>a.invoiceId===i.id))) return 'Изменены условия: требуется пересмотр';
  if (remaining(state,i,true) <= 0) return 'Обязательство полностью распределено';
  return '';
}
export function executionError(state: State, h: Hedge) {
  if (h.status !== 'Предложение') return 'Заявка уже обработана';
  if (!state.policy.approved || h.policyVersion !== state.policy.version) return 'Нужно подтвердить актуальную версию политики';
  const quantity = h.allocations.reduce((s,a)=>s+a.amount,0);
  if (quantity <= 0 || usedLimit(state)+quantity*h.rate > state.policy.limit) return 'Недостаточно доступного лимита';
  const today = new Date().toISOString().slice(0,10);
  const daily = state.hedges.filter(x=>x.executedAt?.slice(0,10)===today).reduce((s,x)=>s+x.allocations.reduce((n,a)=>n+a.amount,0),0);
  if (daily+quantity > state.policy.dailyCap) return 'Превышен дневной объём операций';
  for (const a of h.allocations) {
    const i = state.invoices.find(x=>x.id===a.invoiceId);
    if (!i || !exposed(i) || i.due !== h.due || i.fixing !== h.fixing || a.amount > remaining(state,i,true,h.id)+0.000001) return 'Обязательство изменилось или сумма уже покрыта';
  }
  return '';
}
export function execute(state: State, id: string) {
  const h=state.hedges.find(x=>x.id===id); if (!h) return state;
  const error=executionError(state,h); if(error) return event(state,error);
  return event({ ...state, hedges: state.hedges.map(x=>x.id===id ? {...x,status:'Исполнен в демо',executedAt:new Date().toISOString()} : x) },'Хедж исполнен в демо · '+h.allocations.reduce((s,a)=>s+a.amount,0)+' CNY');
}
export function processInvoices(state: State, ids?: string[]) {
  if (!state.policy.approved) return event(state,'Подтвердите политику перед обработкой');
  let next=state;
  const groups = new Map<string, {invoiceId:string;amount:number}[]>();
  for (const i of state.invoices) {
    if ((ids && !ids.includes(i.id)) || eligible(state,i)) continue;
    const target = state.policy.template==='stages' && !i.stage ? Math.min(state.policy.coverage,30) : state.policy.coverage;
    const amount=Math.round(Math.min(remaining(state,i,true), Math.max(0,i.amount*target/100-hedged(state,i.id,true)-funded(state,i.id)))*100)/100;
    if(amount<=0) continue;
    const key=JSON.stringify([i.due,i.fixing]); const group=groups.get(key) || []; group.push({invoiceId:i.id,amount}); groups.set(key,group);
  }
  for(const allocations of groups.values()) {
    const total=allocations.reduce((s,a)=>s+a.amount,0); if(total<state.policy.min) continue;
    const invoice=state.invoices.find(i=>i.id===allocations[0].invoiceId)!;
    const h: Hedge={ id:uid(), allocations, due:invoice.due, fixing:invoice.fixing, rate:CONFIG.forward, status:'Предложение',policyVersion:state.policy.version,reason:`Политика v${state.policy.version} · ${state.policy.template==='stages'?'покрытие по этапу':'новое обязательство'} · ${allocations.length} инвойс(а)` };
    next=event({...next,hedges:[h,...next.hedges]},'Подготовлено предложение · '+total+' CNY');
    if(state.policy.mode==='auto') next=execute(next,h.id);
  }
  return next===state ? event(state,'Новых предложений нет: проверьте остатки и минимальную сумму') : next;
}
export function invoiceReason(state: State, i: Invoice) {
  const error=eligible(state,i); if(error) return error;
  if (state.hedges.some(h=>h.status==='Предложение' && h.allocations.some(a=>a.invoiceId===i.id))) return 'Требует согласования';
  const target=state.policy.template==='stages'&&!i.stage?Math.min(30,state.policy.coverage):state.policy.coverage;
  if (i.amount*target/100-hedged(state,i.id)-funded(state,i.id)<=0.01) return 'Цель текущего этапа достигнута';
  if(remaining(state,i)*target/100<state.policy.min) return 'Ожидает набора суммы';
  return 'Готов к обработке';
}
export function addInvoices(state: State, invoices: Invoice[]) {
  const seen=new Set(state.invoices.map(i=>`${i.supplier.trim().toLowerCase()}|${i.number.trim().toLowerCase()}`));
  const unique:Invoice[]=[];
  for(const i of invoices){ const key=`${i.supplier.trim().toLowerCase()}|${i.number.trim().toLowerCase()}`; if(!seen.has(key)){unique.push(i);seen.add(key);} }
  let next=event({...state,invoices:[...unique,...state.invoices]},`Импортировано ${unique.length}, дубликатов ${invoices.length-unique.length}`);
  if(next.policy.approved) next=processInvoices(next,unique.map(i=>i.id)); return next;
}
export function editInvoice(state: State, invoice: Invoice) {
  const before=state.invoices.find(i=>i.id===invoice.id); if(!before) return state;
  const changed=['amount','due','fixing','status','indexed','currency','settlement'].some(k=>before[k as keyof Invoice]!==invoice[k as keyof Invoice]);
  const hasActive=state.hedges.some(h=>active(h)&&h.allocations.some(a=>a.invoiceId===invoice.id));
  let next={...state,invoices:state.invoices.map(i=>i.id===invoice.id?invoice:i),hedges:state.hedges.filter(h=>!(changed&&h.status==='Предложение'&&h.allocations.some(a=>a.invoiceId===invoice.id))).map(h=>changed&&active(h)&&h.allocations.some(a=>a.invoiceId===invoice.id)?{...h,status:'Требует пересмотра' as const}:h)};
  if(changed&&hasActive) next={...next,tickets:[{id:uid(),service:'Пересмотр условий хеджа',invoiceId:invoice.id,message:'Изменены условия обязательства. Требуется переоценка и согласование с клиентом.',attachment:'',status:'Передано менеджеру'},...next.tickets]};
  return event(next,`Обновлён инвойс ${invoice.number}${changed&&hasActive?' · создана задача на пересмотр':''}`);
}
export function parseCSV(input: string): string[][] {
  const delimiter=input.split(/\r?\n/)[0].includes(';')?';':',';
  const rows:string[][]=[]; let row:string[]=[],field='',quoted=false;
  const text=input.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
  if(quoted) throw new Error('Незакрытая кавычка в CSV'); row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function csvInvoice(row: string[], mapping: Record<string,number>): Invoice {
  const get=(key:string)=>String(row[mapping[key]]??'').trim();
  const amount=Number(get('amount').replace(/\s/g,'').replace(',','.'));
  const due=get('due'),parsedDue=Date.parse(due);
  if(!get('number')||!get('supplier')||!get('contract')||!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(parsedDue)||new Date(parsedDue).toISOString().slice(0,10)!==due)throw new Error('Нужны номер, поставщик, контракт, положительная сумма и существующая дата YYYY-MM-DD');
  if(!['CNY','RUB'].includes(get('currency'))||!['CNY','RUB'].includes(get('settlement')))throw new Error('Допустимые валюты: CNY, RUB');
  return {id:uid(),number:get('number'),supplier:get('supplier'),contract:get('contract'),amount,currency:get('currency'),settlement:get('settlement'),indexed:['да','true','1'].includes(get('indexed').toLowerCase()),fixing:get('fixing'),created:CONFIG.today,due:get('due'),status:'Ожидает оплаты',stage:false};
}
export function csvEncode(rows: (string|number)[][]) { return '\uFEFF'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\r\n'); }
