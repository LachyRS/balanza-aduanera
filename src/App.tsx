import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Calculator, ChevronDown, ClipboardList, FileText, Info, Minus, PackageCheck, Plus, RotateCcw, Scale, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import Admin, { readSettings, type Settings } from './Admin'
import DispatchSummary from './DispatchSummary'
import Receipt from './Receipt'
import './App.css'
import './advanced.css'
import './finances.css'
import './summary.css'
import './receipt.css'

type Draft = { name:string; document:string; flight:string; passenger:'first'|'other'; weight:number; specialWeight:number; specialExempt:boolean; quantities:Record<number,number>; bagCount:number }
const initial: Draft = {name:'',document:'',flight:'',passenger:'other',weight:0,specialWeight:0,specialExempt:true,quantities:{},bagCount:0}
function readDraft():Draft { try {const saved=JSON.parse(localStorage.getItem('pesa-draft-v1')||'{}'); const oldBags=Array.isArray(saved.bags)?saved.bags:[]; const {bags:_bags,useBagWeights:_useBagWeights,...rest}=saved; return {...initial,...rest,bagCount:saved.bagCount??oldBags.length,weight:saved.bagCount===undefined&&saved.useBagWeights?oldBags.reduce((s:number,b:{weight:number})=>s+(Number(b.weight)||0),0):saved.weight??0}} catch {return initial} }
const money = (n:number) => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)
const num = (n:number) => Number.isFinite(n) && n > 0 ? n : 0
const steps = [{title:'Datos del pasajero',desc:'Información del viaje',icon:UserRound},{title:'Equipaje y artículos',desc:'Pesaje y valoración',icon:Scale},{title:'Resumen del despacho',desc:'Cálculo y comprobante',icon:ClipboardList}]

function App() {
  const [draft,setDraft] = useState<Draft>(readDraft)
  const [settings,setSettings] = useState<Settings>(readSettings)
  const [admin,setAdmin] = useState(false)
  const [step,setStep] = useState(0)
  const [query,setQuery] = useState('')
  const [showCatalog,setShowCatalog] = useState(false)
  const [qr,setQr] = useState('')
  const [printError,setPrintError] = useState('')
  const [receiptTime,setReceiptTime] = useState<Date|null>(null)
  useEffect(()=>{if(!receiptTime)return; const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setReceiptTime(null)};window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close)},[receiptTime])
  useEffect(()=>{try {localStorage.setItem('pesa-draft-v1',JSON.stringify(draft))} catch {/* storage may be unavailable */}},[draft])
  useEffect(()=>{try {localStorage.setItem('pesa-settings-v2',JSON.stringify(settings))} catch {/* storage may be unavailable */}},[settings])
  const update = <K extends keyof Draft>(key:K,value:Draft[K]) => setDraft(d=>({...d,[key]:value}))
  const products = settings.products
  const totalWeight = num(draft.weight)
  const selected = products.filter(p=>(draft.quantities[p.id]||0)>0)
  const groupUsed:Record<string,number> = {}
  const excessCounts:Record<number,number> = {}
  let quantityExcessValue=0
  let eligibleGoods=0
  selected.forEach(p=>{const key=p.grupo||String(p.id);const used=groupUsed[key]||0;const allowed=Math.min(draft.quantities[p.id],Math.max(0,p.limite_cantidad-used));groupUsed[key]=used+allowed;excessCounts[p.id]=draft.quantities[p.id]-allowed;quantityExcessValue+=excessCounts[p.id]*p.valor_usd;eligibleGoods+=allowed*p.valor_usd})
  const taxableKg = Math.max(0,totalWeight-num(settings.allowance)) + (draft.specialExempt?0:num(draft.specialWeight))
  const misc = taxableKg*num(settings.kgValue)
  const goods = selected.reduce((sum,p)=>sum+p.valor_usd*draft.quantities[p.id],0)
  const total = misc+goods
  const allowedValue = misc+eligibleGoods
  const limit = num(settings.limit)
  const commercialValue = quantityExcessValue+Math.max(0,allowedValue-limit)
  const nonCommercialValue = Math.min(allowedValue,limit)
  const exemption = Math.min(num(settings.exemption),limit)
  const boundary = Math.max(exemption,Math.min(num(settings.firstBand),limit))
  const tier1 = Math.min(Math.max(nonCommercialValue-exemption,0),boundary-exemption)
  const tier2 = Math.min(Math.max(nonCommercialValue-boundary,0),limit-boundary)
  const isFirst = draft.passenger==='first'
  const tax1 = tier1*(isFirst?settings.firstRate1:settings.otherRate1)/100
  const tax2 = tier2*(isFirst?settings.firstRate2:settings.otherRate2)/100
  const tax = tax1+tax2
  const cup = tax*num(settings.rate)
  const commercialTax = Math.min(commercialValue,2000)*.15+Math.min(Math.max(commercialValue-2000,0),2000)*.20+Math.min(Math.max(commercialValue-4000,0),2000)*.25+Math.max(commercialValue-6000,0)*.30
  const autoServiceCUP = nonCommercialValue<=0?0:nonCommercialValue<=200?50:nonCommercialValue<=500?100:nonCommercialValue<=1000?200:nonCommercialValue<=3000?300:nonCommercialValue<=5000?400:nonCommercialValue<=10000?500:800
  const serviceCUP = settings.serviceMode==='fixed'?num(settings.serviceValue):settings.serviceMode==='percent'?nonCommercialValue*num(settings.serviceValue)/100*num(settings.rate):autoServiceCUP
  const commercialServiceUSD = commercialValue<=0?0:commercialValue<=200?2:commercialValue<=500?4:commercialValue<=1000?8:commercialValue<=2000?13:commercialValue<=4000?20:commercialValue<=6000?25:50
  const commercialPayUSD = commercialValue>0?Math.ceil(Math.round((commercialTax+commercialServiceUSD)*100)/100):0
  const standardPayCUP = cup+serviceCUP
  let valueRoom=limit
  const excessLines:{label:string;amount:number;reason:string}[]=[]
  const nonCommercialLines:{label:string;amount:number;reason?:string}[]=[]
  const admittedMisc=Math.min(valueRoom,misc); valueRoom-=admittedMisc
  if(admittedMisc>0) nonCommercialLines.push({label:`Misceláneas: ${settings.kgValue>0?money(admittedMisc/settings.kgValue):'0.00'} kg valorados`,amount:admittedMisc})
  if(misc>admittedMisc) excessLines.push({label:`Misceláneas: ${settings.kgValue>0?money((misc-admittedMisc)/settings.kgValue):'0.00'} kg equivalentes`,amount:misc-admittedMisc,reason:'Exceso por valor'})
  selected.forEach(p=>{const count=draft.quantities[p.id];const extra=excessCounts[p.id];const acceptedCount=count-extra;const acceptedValue=acceptedCount*p.valor_usd;const within=Math.min(valueRoom,acceptedValue);valueRoom-=within;if(within>0||acceptedCount>0&&p.valor_usd===0){const fullyAdmitted=p.valor_usd>0?Math.floor((within+1e-9)/p.valor_usd):acceptedCount;const remainder=within-fullyAdmitted*p.valor_usd;if(fullyAdmitted>0)nonCommercialLines.push({label:`${p.nombre} × ${fullyAdmitted}`,amount:fullyAdmitted*p.valor_usd});if(remainder>1e-8)nonCommercialLines.push({label:`${p.nombre}: valor parcial`,amount:remainder,reason:'Asignación de valor estimada; no implica dividir el artículo'})}if(extra>0)excessLines.push({label:`${p.nombre}: ${extra} unidad(es)`,amount:extra*p.valor_usd,reason:'Exceso por cantidad'});if(acceptedValue-within>1e-8)excessLines.push({label:`${p.nombre}: parte del valor`,amount:acceptedValue-within,reason:'Exceso por valor'})})
  const hasCommercial = total>limit || Object.values(excessCounts).some(count=>count>0)
  const over = hasCommercial
  const searchResults = useMemo(()=>products.filter(p=>(p.nombre+' '+p.categoria).toLowerCase().includes(query.toLowerCase())),[query,products])
  const setQty = (id:number,qty:number)=>update('quantities',{...draft.quantities,[id]:Math.max(0,Math.floor(qty))})
  const go = (n:number)=>{setStep(n); window.scrollTo({top:0,behavior:'instant'})}
  const reset = ()=>{if(window.confirm('¿Deseas comenzar un nuevo despacho? Se borrarán los datos guardados en este dispositivo.')) {setDraft(initial);setStep(0);setQuery('');setShowCatalog(false)}}
  const print = async()=>{try {const now=new Date();const payload=JSON.stringify({tipo:'Simulación de despacho',fecha:now.toISOString(),pasajero:draft.name,documento:draft.document,vuelo:draft.flight,bultos:draft.bagCount,valorUSD:Number(total.toFixed(2)),totalNoComercialCUP:Number(standardPayCUP.toFixed(2)),totalComercialUSD:hasCommercial?commercialPayUSD:null,estado:hasCommercial?'Exceso / revisión':'Dentro del límite'}); const url=await QRCode.toDataURL(payload,{margin:1,width:180});setQr(url);setPrintError('');setReceiptTime(now)} catch {setPrintError('No se pudo preparar el comprobante. Inténtalo nuevamente.')}}
  const saveSettings = (next:Settings) => {const ids=new Set(next.products.map(p=>p.id));setDraft(d=>({...d,quantities:Object.fromEntries(Object.entries(d.quantities).filter(([id])=>ids.has(Number(id))))}));setSettings(next)}
  if(admin) return <main className="admin-container"><Admin settings={settings} onChange={saveSettings} onClose={()=>setAdmin(false)}/></main>
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Scale size={22}/></div><div><strong>Balanza Aduanera</strong><span>SIMULADOR DE DESPACHO</span></div></div>
      <div className="side-label">DESPACHO DE PASAJEROS</div>
      <nav className="steps" aria-label="Pasos del despacho">{steps.map((s,i)=><button key={s.title} className={'step '+(step===i?'active':'')} onClick={()=>go(i)}><span className="step-icon"><s.icon size={18}/></span><span><b>{s.title}</b><small>{s.desc}</small></span><span className="step-number">0{i+1}</span></button>)}</nav>
      <div className="side-bottom"><div className="side-note"><ShieldCheck size={20}/><div><b>Una guía para tu viaje</b><p>Consulta siempre las disposiciones oficiales vigentes.</p></div></div><div className="side-foot">SIMULACIÓN INFORMATIVA <span>•</span> CUBA</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb"><b>BALANZA ADUANERA</b> <span>/</span> {steps[step].title.toUpperCase()}</div><div className="top-actions"><button className="reset" onClick={()=>setAdmin(true)}>Configuración</button><button className="reset" aria-label="Nuevo despacho" onClick={reset}><RotateCcw size={15}/> <span>Nuevo despacho</span></button></div></header>
      <div className="mobile-steps">{steps.map((s,i)=><button key={s.title} onClick={()=>go(i)} className={i===step?'on':''}><span>{i+1}</span>{s.title}</button>)}</div>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span></span> SIMULADOR DE ADUANA</div><h1>{step===0?'Balanza Aduanera':step===1?'Equipaje y artículos':'Resumen del despacho'}</h1><p>{step===0?'Completa los datos del pasajero para calcular su importación.':step===1?'Registra el peso y añade los artículos de valor que viajan contigo.':'Revisa la valoración y el cálculo estimado de tu importación.'}</p></div><div className="page-count">PASO <b>0{step+1}</b> <span>/ 03</span></div></div>
        <div className="workspace"><div className="left-column">
        {step===0 && <>
          <section className="card"><div className="card-title"><div className="title-icon"><UserRound size={19}/></div><div><h2>Datos del pasajero</h2><p>Información básica para identificar el despacho.</p></div><span className="section-number">01</span></div><div className="divider"/><div className="form-grid"><label className="full">Nombre y apellidos <span>Opcional</span><input value={draft.name} onChange={e=>update('name',e.target.value)} placeholder="Ej. María Rodríguez"/></label><label>Pasaporte / Carné de identidad <span>Opcional</span><input value={draft.document} onChange={e=>update('document',e.target.value)} placeholder="Número de identificación"/></label><label>Vuelo / Nave <span>Opcional</span><input value={draft.flight} onChange={e=>update('flight',e.target.value)} placeholder="Ej. CU 123"/></label></div></section>
          <section className="card"><div className="card-title"><div className="title-icon"><BriefcaseBusiness size={19}/></div><div><h2>Tipo de pasajero</h2><p>Selecciona la categoría que corresponda a tu viaje.</p></div><span className="section-number">02</span></div><div className="divider"/><div className="radio-list"><button onClick={()=>update('passenger','first')} className={'radio-card '+(isFirst?'selected':'')}><span className="radio-dot"/><span><b>Residente cubano</b><small>Primera importación del año natural</small></span><span className="radio-tag">{settings.firstRate1}% / {settings.firstRate2}%</span></button><button onClick={()=>update('passenger','other')} className={'radio-card '+(!isFirst?'selected':'')}><span className="radio-dot"/><span><b>No residente o importación posterior</b><small>Segunda importación del año en adelante</small></span><span className="radio-tag">{settings.otherRate1}% / {settings.otherRate2}%</span></button></div><div className="rate-display">Tasa de cambio de referencia <b>1 USD = {money(settings.rate)} CUP</b></div><p className="hint"><Info size={14}/> La tasa es referencial y solo se modifica desde configuración.</p></section>
          <div className="bottom-actions"><span><ShieldCheck size={16}/> Datos guardados solo en este dispositivo</span><button className="primary" onClick={()=>go(1)}>Continuar al equipaje <ArrowRight size={17}/></button></div>
        </>}
        {step===1 && <>
          <section className="card"><div className="card-title"><div className="title-icon"><BriefcaseBusiness size={19}/></div><div><h2>Control de bultos</h2><p>Registra maletas, cajas o paquetes del pasajero.</p></div><span className="section-number">01</span></div><div className="divider"/><label>Cantidad total de bultos<input aria-label="Cantidad total de bultos" type="number" min="0" step="1" value={draft.bagCount} onChange={e=>update('bagCount',Math.max(0,Math.floor(Number(e.target.value))||0))}/></label><p className="hint"><Info size={14}/> Indica la cantidad de maletas, cajas o paquetes. El peso se registra de forma global.</p></section>
          <section className="card"><div className="card-title"><div className="title-icon"><Scale size={19}/></div><div><h2>Balanza de misceláneas</h2><p>Ropa, calzado, alimentos y artículos de uso personal.</p></div><span className="section-number">01</span></div><div className="divider"/><div className="form-grid"><label>Kilogramos totales de equipaje / miscelánea<div className="unit-input"><input aria-label="Kilogramos totales de equipaje / miscelánea" type="number" min="0" step="0.01" value={totalWeight || ''} placeholder="0.00" onChange={e=>update('weight',num(Number(e.target.value)))}/><b>kg</b></div></label><div className="configured-value">Descuento por equipaje personal <strong>{money(settings.allowance)} kg</strong><small>Definido en configuración</small></div></div><p className="hint"><Info size={14}/> El descuento es un parámetro de ejemplo. Verifica el aplicable y no incluyas los artículos separados de abajo.</p><div className="calc-strip"><span>Peso valorado <b>{money(taxableKg)} kg</b></span><span>× ${money(settings.kgValue)} / kg</span><strong>${money(misc)} <small>USD</small></strong></div><div className="special"><div><b>Medicamentos, alimentos y aseo separados</b><p>Indica su peso por separado; no lo incluyas en el peso total.</p></div><div className="special-controls"><div className="unit-input"><input aria-label="Peso de artículos separados" type="number" min="0" step="0.01" placeholder="0.00" value={draft.specialWeight||''} onChange={e=>update('specialWeight',num(Number(e.target.value)))}/><b>kg</b></div><label className="check-label"><input type="checkbox" checked={draft.specialExempt} onChange={e=>update('specialExempt',e.target.checked)}/> Exentos de arancel</label></div><p className="small-note">Marca la exención solo si cumple las disposiciones especiales vigentes.</p></div></section>
          <section className="card"><div className="card-title"><div className="title-icon"><PackageCheck size={19}/></div><div><h2>Artículos de valor</h2><p>Añade los artículos y sus cantidades.</p></div><span className="section-number">02</span></div><div className="divider"/><div className="search-wrap"><Search size={18}/><input aria-label="Buscar artículos" value={query} onFocus={()=>setShowCatalog(true)} onChange={e=>{setQuery(e.target.value);setShowCatalog(true)}} placeholder="Buscar artículo, por ejemplo: teléfono"/><button aria-label="Mostrar catálogo" onClick={()=>setShowCatalog(!showCatalog)}><ChevronDown size={18}/></button></div>{showCatalog && <div className="catalog">{searchResults.length ? searchResults.map(p=><button key={p.id} onClick={()=>{setQty(p.id,(draft.quantities[p.id]||0)+1);setShowCatalog(false);setQuery('')}}><span><b>{p.nombre}</b><small>{p.categoria} · Máx. {p.limite_cantidad} unidades</small></span><strong>${p.valor_usd} <Plus size={15}/></strong></button>):<div className="empty-search">No encontramos artículos con ese nombre.</div>}</div>}
          {selected.length===0?<div className="empty-items"><div><PackageCheck size={20}/></div><b>Aún no has añadido artículos</b><p>Busca en el catálogo para agregarlos al despacho.</p></div>:<div className="item-list">{selected.map(p=><div className="item" key={p.id}><div><b>{p.nombre}</b><small>${money(p.valor_usd)} USD / unidad · Límite: {p.limite_cantidad}</small>{excessCounts[p.id]>0&&<span className="item-warning">Carácter comercial / exceso: {excessCounts[p.id]} unidad(es) para revisión</span>}</div><div className="item-right"><div className="counter"><button aria-label={'Restar '+p.nombre} onClick={()=>setQty(p.id,draft.quantities[p.id]-1)}><Minus size={14}/></button><span>{draft.quantities[p.id]}</span><button aria-label={'Sumar '+p.nombre} onClick={()=>setQty(p.id,draft.quantities[p.id]+1)}><Plus size={14}/></button></div><b>${money(p.valor_usd*draft.quantities[p.id])}</b><button className="remove" aria-label={'Eliminar '+p.nombre} onClick={()=>setQty(p.id,0)}><X size={15}/></button></div></div>)}</div>}
          </section><div className="bottom-actions"><button className="back" onClick={()=>go(0)}><ArrowLeft size={16}/> Volver</button><button className="primary" onClick={()=>go(2)}>Ver resumen <ArrowRight size={17}/></button></div>
        </>}
        {step===2 && <DispatchSummary bagCount={draft.bagCount} misc={misc} goods={goods} total={total} limit={limit} commercialValue={commercialValue} hasCommercial={hasCommercial} nonCommercialValue={nonCommercialValue} nonCommercialLines={nonCommercialLines} excessLines={excessLines} exemption={exemption} boundary={boundary} tier1={tier1} tier2={tier2} rate1={isFirst?settings.firstRate1:settings.otherRate1} rate2={isFirst?settings.firstRate2:settings.otherRate2} tax1={tax1} tax2={tax2} tax={tax} rate={settings.rate} serviceCUP={serviceCUP} standardPayCUP={standardPayCUP} commercialTax={commercialTax} commercialServiceUSD={commercialServiceUSD} commercialPayUSD={commercialPayUSD} serviceMode={settings.serviceMode} isFirst={isFirst} printError={printError} onBack={()=>go(1)} onPrint={print}/>}
        </div>
        <aside className="right-column"><section className="overview"><div className="overview-head"><div><span>RESUMEN EN VIVO</span><h2>Tu despacho</h2></div><div className="overview-icon"><Calculator size={19}/></div></div><p>Una vista rápida de tu valoración.</p><div className="overview-rule"/><div className="overview-line"><span>Misceláneas</span><b>${money(misc)}</b></div><div className="overview-line"><span>Artículos de valor</span><b>${money(goods)}</b></div><div className="overview-line"><span>Exención para arancel</span><b className="green">− ${money(Math.min(nonCommercialValue,exemption))}</b></div><div className="overview-rule"/><div className="overview-total"><span>VALOR DE ADUANA</span><strong>${money(total)} <small>USD</small></strong></div><div className="progress"><div style={{width:`${limit>0?Math.min(total/limit*100,100):100}%`,background:over?'#c94a4a':undefined}}/></div><div className="limit"><span>{total>limit?`Límite excedido de ${money(limit)} USD`:hasCommercial?'Exceso por cantidad':'Límite de importación'}</span>{total<=limit&&<b>${money(limit)} USD</b>}</div>{total>limit&&<div className="overview-excess">Valor excedido: ${money(total-limit)} USD</div>}<div className="estimate overview-estimate"><div><span>DESPACHO NO COMERCIAL</span><strong>{money(standardPayCUP)} <small>CUP</small></strong></div>{hasCommercial&&<div><span>DESPACHO COMERCIAL</span><strong>${money(commercialPayUSD)} <small>USD</small></strong></div>}</div><div className="overview-foot"><Info size={15}/><span>Estimación sujeta a revisión por la autoridad aduanera.</span></div></section><div className="help-card"><div className="help-icon"><FileText size={18}/></div><div><b>Antes de continuar</b><p>Los valores y reglas son parámetros de simulación proporcionados para esta herramienta. No constituyen una disposición oficial.</p></div></div><div className="reference"><span>REFERENCIA DE SIMULACIÓN</span><b>Catálogo parcial Res. 340/2026</b><small>Faltan artículos y reglas específicas. <a href="https://www.gacetaoficial.gob.cu/es/resolucion-340-de-2026-de-aduana-general-de-la-republica" target="_blank" rel="noreferrer">Consulta la disposición oficial</a>.</small></div></aside>
        </div><footer>SIMULADOR INDEPENDIENTE <span>•</span> No es un comprobante oficial de la AGR<br/><strong>Creado por: Lachy RS</strong> <span>•</span> Versión: v1.0.0</footer>
      </div>
    </main>
    {receiptTime&&<Receipt createdAt={receiptTime} qr={qr} name={draft.name} document={draft.document} flight={draft.flight} bagCount={draft.bagCount} passenger={isFirst?'Residente cubano · Primera importación':'No residente / Importación posterior'} weight={totalWeight} allowance={settings.allowance} taxableKg={taxableKg} kgValue={settings.kgValue} misc={misc} specialWeight={draft.specialWeight} specialExempt={draft.specialExempt} goods={goods} total={total} nonCommercialValue={nonCommercialValue} commercialValue={commercialValue} hasCommercial={hasCommercial} nonCommercialLines={nonCommercialLines} excessLines={excessLines} limit={limit} exemption={exemption} boundary={boundary} tier1={tier1} tier2={tier2} rate1={isFirst?settings.firstRate1:settings.otherRate1} rate2={isFirst?settings.firstRate2:settings.otherRate2} tax1={tax1} tax2={tax2} rate={settings.rate} taxCUP={cup} serviceCUP={serviceCUP} standardPayCUP={standardPayCUP} commercialTax={commercialTax} commercialServiceUSD={commercialServiceUSD} commercialPayUSD={commercialPayUSD} onClose={()=>setReceiptTime(null)} onPrint={()=>window.print()}/>} 
  </div>
}
export default App
