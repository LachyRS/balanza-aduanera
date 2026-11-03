export default async ({open,check})=>{
 const s=await open('quantities');const f=s.frame
 await f.getByRole('button',{name:'Continuar al equipaje'}).click()
 await f.getByLabel('Kilogramos totales de equipaje / miscelánea').fill('35')
 await f.getByLabel('Buscar artículos').fill('celular')
 await f.getByRole('button',{name:/Teléfono celular \/ Smartphone/}).click()
 for(let i=0;i<5;i++)await f.getByRole('button',{name:'Sumar Teléfono celular / Smartphone'}).click()
 await f.getByRole('button',{name:'Ver resumen'}).click()
 await check('cantidades separadas',async()=>{const n=await f.getByRole('region',{name:'Detalle no comercial'}).innerText();const c=await f.getByRole('region',{name:'Detalle comercial'}).innerText();if(!n.includes('Smartphone × 5')||n.includes('unidad(es)')||!c.includes('1 unidad(es)'))throw Error('Cantidades mal separadas')})
 await check('despachos en moneda separada',async()=>{const n=await f.getByRole('region',{name:'Despacho no comercial'}).innerText();const c=await f.getByRole('region',{name:'Despacho comercial'}).innerText();const t=await f.getByRole('region',{name:'Total estimado a pagar'}).innerText();if(!n.includes('10,900.00 CUP')||!c.includes('$14.00 USD')||/\d[\d,.]*\s+CUP/.test(c)||!t.includes('11,236.00 CUP'))throw Error('Montos incorrectos')})
 const v=await open('value');const g=v.frame
 await g.getByRole('button',{name:'Continuar al equipaje'}).click()
 await g.getByLabel('Kilogramos totales de equipaje / miscelánea').fill('135')
 await g.getByRole('button',{name:'Ver resumen'}).click()
 await check('exceso exacto por valor y peso',async()=>{const t=await g.getByRole('region',{name:'Valoración del equipaje'}).innerText();const n=await g.getByRole('region',{name:'Detalle no comercial'}).innerText();const c=await g.getByRole('region',{name:'Detalle comercial'}).innerText();if(!t.includes('Valor excedido: $100.00 USD')||!n.includes('100.00 kg valorados')||!c.includes('10.00 kg equivalentes'))throw Error('Desglose de peso incorrecto')})
}
