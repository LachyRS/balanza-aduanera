import { ArrowLeft, BadgeCheck, Calculator, CircleAlert, ClipboardList, Info, Printer } from 'lucide-react'

type Line = { label:string; amount:number; reason?:string }
type Props = {
 bagCount:number; misc:number; goods:number; total:number; limit:number; commercialValue:number; hasCommercial:boolean; nonCommercialValue:number;
 nonCommercialLines:Line[]; excessLines:Line[]; exemption:number; boundary:number; tier1:number; tier2:number;
 rate1:number; rate2:number; tax1:number; tax2:number; tax:number; rate:number; serviceCUP:number; standardPayCUP:number;
 commercialTax:number; commercialServiceUSD:number; commercialPayUSD:number;
 serviceMode:string; isFirst:boolean; printError:string; onBack:()=>void; onPrint:()=>void
}
const money=(value:number)=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)

export default function DispatchSummary(p:Props) {
 const hasCommercial=p.hasCommercial
 const valueExcess=Math.max(0,p.total-p.limit)
 return <>
  <section className="card" aria-label="Valoración del equipaje">
   <div className="card-title"><div className="title-icon"><ClipboardList size={19}/></div><div><h2>Valoración del equipaje</h2><p>Valor total declarado antes de separar los despachos.</p></div><span className="section-number">01</span></div>
   <div className="divider"/><div className="summary-row"><span>Bultos registrados</span><b>{p.bagCount}</b></div><div className="summary-row"><span>Misceláneas declaradas</span><b>${money(p.misc)} USD</b></div><div className="summary-row"><span>Artículos declarados</span><b>${money(p.goods)} USD</b></div><div className="summary-total"><span>Valor total de aduana</span><strong>${money(p.total)} <small>USD</small></strong></div>
   <div className={'status-banner '+(hasCommercial?'danger':'success')}><span>{hasCommercial?<CircleAlert size={20}/>:<BadgeCheck size={20}/>}</span><div><b>{valueExcess>0?`LÍMITE EXCEDIDO DE ${money(p.limit)} USD`:hasCommercial?'EXCESO POR CANTIDAD / CANAL ROJO':'DENTRO DEL LÍMITE'}</b>{valueExcess>0&&<p className="status-value">Valor excedido: ${money(valueExcess)} USD</p>}<p>{hasCommercial?'La asignación y el tratamiento definitivo corresponden a la autoridad aduanera.':`El valor está dentro del límite simulado de $${money(p.limit)} USD.`}</p></div></div>
  </section>
  <section className="card allocation-card" aria-label="Detalle no comercial"><div className="card-title"><div className="title-icon"><ClipboardList size={19}/></div><div><h2>Detalle no comercial</h2><p>Solo la parte asignada dentro de los límites de esta simulación.</p></div></div><div className="divider"/>
   {p.nonCommercialLines.length?p.nonCommercialLines.map((line,i)=><div className="allocation-line" key={i}><span>{line.label}{line.reason&&<small>{line.reason}</small>}</span><b>${money(line.amount)} USD</b></div>):<p className="allocation-empty">No hay mercancías asignadas a este despacho.</p>}
   <div className="allocation-total"><span>Valor no comercial estimado</span><b>${money(p.nonCommercialValue)} USD</b></div>
  </section>
  {hasCommercial&&<section className="card commercial-detail" aria-label="Detalle comercial"><div className="card-title"><div className="title-icon amber-icon"><CircleAlert size={19}/></div><div><h2>Detalle comercial / exceso</h2><p>Mercancías o valor separados para revisión.</p></div></div><div className="divider"/>{p.excessLines.map((line,i)=><div className="allocation-line" key={i}><span>{line.label}<small>{line.reason}</small></span><b>${money(line.amount)} USD</b></div>)}<div className="allocation-total"><span>Valor comercial estimado</span><b>${money(p.commercialValue)} USD</b></div><p className="allocation-note">La simulación asigna primero las misceláneas y después los artículos en el orden del catálogo. Una fracción de valor no implica dividir físicamente un equipo; la Aduana decide la asignación final. No es un comiso ni una liquidación oficial.</p></section>}
  <div className="finance-heading"><div><span>DESGLOSE FINANCIERO</span><h2>Aranceles y servicios</h2><p>Los importes de cada despacho se muestran por separado.</p></div></div>
  <section className="card financial-block" aria-label="Despacho no comercial"><div className="card-title"><div className="title-icon"><Calculator size={19}/></div><div><h2>Despacho no comercial</h2><p>{p.isFirst?'Residente cubano · Primera importación':'No residente / Importación posterior'}</p></div><span className="currency-badge">CUP</span></div><div className="divider"/>
   <div className="tax-row"><span>Primeros ${money(p.exemption)} USD de valor <small>Exento · 0%</small></span><b>0.00 CUP</b></div>
   <div className="tax-row"><span>De ${money(p.exemption)} a ${money(p.boundary)} USD <small>Base ${money(p.tier1)} USD · {p.rate1}%</small></span><b>{money(p.tax1*p.rate)} CUP</b></div>
   <div className="tax-row"><span>De ${money(p.boundary)} a ${money(p.limit)} USD <small>Base ${money(p.tier2)} USD · {p.rate2}%</small></span><b>{money(p.tax2*p.rate)} CUP</b></div>
   <div className="tax-row"><span>Arancel no comercial <small>Tasa de referencia: 1 USD = {money(p.rate)} CUP</small></span><b>{money(p.tax*p.rate)} CUP</b></div>
   <div className="tax-row"><span>Servicios de Aduana <small>{p.serviceMode==='automatic'?'Tarifa máxima estimada':'Valor configurado manualmente'}</small></span><b>{money(p.serviceCUP)} CUP</b></div>
   <div className="financial-subtotal"><span>Total despacho no comercial</span><strong>{money(p.standardPayCUP)} <small>CUP</small></strong></div>
  </section>
  {hasCommercial&&<section className="card financial-block commercial-finance" aria-label="Despacho comercial"><div className="card-title"><div className="title-icon amber-icon"><Calculator size={19}/></div><div><h2>Despacho comercial</h2><p>Independiente y sujeto a aceptación del titular.</p></div><span className="currency-badge usd">SOLO USD</span></div><div className="divider"/>
   <div className="tax-row"><span>Valor comercial estimado</span><b>${money(p.commercialValue)} USD</b></div><div className="tax-row"><span>Arancel comercial <small>Tarifas progresivas del 15%, 20%, 25% y 30%</small></span><b>${money(p.commercialTax)} USD</b></div><div className="tax-row"><span>Servicios comerciales <small>Tarifa máxima estimada</small></span><b>${money(p.commercialServiceUSD)} USD</b></div><div className="financial-subtotal amber-subtotal"><span>Total despacho comercial <small>Redondeado al entero superior</small></span><strong>${money(p.commercialPayUSD)} <small>USD</small></strong></div><p className="allocation-note">Este despacho se paga en USD; no está incluido en el subtotal en CUP.</p>
  </section>}
  <section className="card total-card" aria-label="Totales estimados a pagar"><h2>Totales estimados a pagar</h2><p>Importes independientes, incluidos aranceles y servicios.</p><div className="total-components"><div><span>TOTAL DESPACHO NO COMERCIAL</span><b>{money(p.standardPayCUP)} CUP</b></div>{hasCommercial&&<div><span>TOTAL DESPACHO COMERCIAL</span><b>${money(p.commercialPayUSD)} USD</b><small>Pago independiente en USD</small></div>}</div><p className="hint"><Info size={14}/> Cada despacho se liquida por separado en su moneda. No incluye servicios particulares ni custodia. <a href="https://www.mfp.gob.cu/noticia/955" target="_blank" rel="noreferrer">Consultar al MFP</a>.</p></section>
  <div className="bottom-actions"><button className="back" onClick={p.onBack}><ArrowLeft size={16}/> Volver al equipaje</button><button className="primary" onClick={p.onPrint}><Printer size={17}/> Ver comprobante / PDF</button></div>{p.printError&&<p className="error-text">{p.printError}</p>}
 </>
}
