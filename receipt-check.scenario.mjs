export default async ({open,check})=>{
 const s=await open('receipt');const f=s.frame;
 await f.getByRole('button',{name:'Continuar al equipaje'}).click();
 await f.getByLabel('Kilogramos totales de equipaje / miscelánea').fill('135');
 await f.getByRole('button',{name:'Ver resumen'}).click();
 await f.getByRole('button',{name:'Ver comprobante / PDF'}).click();
 await check('comprobante visible y totales separados',async()=>{const dlg=f.getByRole('dialog');await dlg.waitFor({state:'visible'});const t=await dlg.innerText();if(!t.includes('35,000.00')||!t.includes('$17.00')||/total combinado/i.test(t)||!t.includes('Lachy RS'))throw Error('Totales o créditos incorrectos');if(!(await dlg.locator('img').count()))throw Error('No aparece QR');const box=await dlg.boundingBox();if(!box||box.width<100||box.height<100)throw Error('Comprobante sin tamaño visible')});
 await check('vista de impresión con contenido',async()=>{await s.page.emulateMedia({media:'print'});const receipt=f.locator('article.receipt');if(!(await receipt.isVisible()))throw Error('Ticket oculto al imprimir');const body=await receipt.innerText();if(!body.includes('TOTAL DESPACHO NO COMERCIAL')||!body.includes('TOTAL DESPACHO COMERCIAL')||/combinado/i.test(body))throw Error('Impresión incorrecta');await s.page.emulateMedia({media:'screen'})});
}
