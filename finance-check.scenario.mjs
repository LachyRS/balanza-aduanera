export default async ({open,check})=>{
 const s=await open('traveler');const f=s.frame
 await f.getByRole('button',{name:'Continuar al equipaje'}).click()
 await f.getByLabel('Cantidad total de bultos').fill('2')
 await f.getByLabel('Kilogramos totales de equipaje / miscelánea').fill('135')
 await f.getByRole('button',{name:'Ver resumen'}).click()
 await check('exceso por peso y servicios automáticos',async()=>{const t=await f.locator('body').innerText();for(const v of ['Misceláneas: 10.00 kg equivalentes','$100.00 USD','200.00 CUP','$2.00 USD'])if(!t.includes(v))throw Error('Falta '+v)})
 await f.getByRole('button',{name:'Configuración'}).click()
 await f.getByLabel('Clave de desarrollador').fill('123456')
 await f.getByLabel('Confirmar clave').fill('123456')
 await f.getByRole('button',{name:'Crear clave y entrar'}).click()
 await f.getByLabel('Modalidad del servicio').selectOption('fixed')
 await f.getByLabel('Servicio fijo (CUP)').fill('75')
 await f.getByRole('button',{name:'Volver al despacho'}).click()
 await check('tarifa fija aplicada',async()=>{const t=await f.locator('body').innerText();if(!t.includes('75.00 CUP'))throw Error('Servicio fijo no aplicado')})
 await s.page.reload()
 await check('bultos, peso y servicio guardados',async()=>{await f.getByRole('button',{name:'Continuar al equipaje'}).click();if(await f.getByLabel('Cantidad total de bultos').inputValue()!=='2')throw Error('Bultos no guardados');if(await f.getByLabel('Kilogramos totales de equipaje / miscelánea').inputValue()!=='135')throw Error('Peso no guardado');await f.getByRole('button',{name:'Ver resumen'}).click();if(!(await f.locator('body').innerText()).includes('75.00 CUP'))throw Error('Servicio no guardado')})
}
