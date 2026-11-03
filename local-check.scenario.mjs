export default async ({ open, check }) => {
  const s = await open('traveler')
  await s.frame.getByPlaceholder('Ej. María Rodríguez').fill('Ana Pérez')
  await s.frame.getByRole('button', { name: 'Continuar al equipaje' }).click()
  await s.frame.getByLabel('Peso total de misceláneas').fill('35')
  await s.frame.getByRole('button', { name: 'Ver resumen' }).click()
  await check('cálculo inicial', async () => {
    const text = await s.frame.locator('body').innerText()
    if (!text.includes('$100.00 USD') || !text.includes('$50.00 USD')) throw new Error('Valor o arancel incorrecto')
  })
  await s.page.reload()
  await check('datos guardados en el dispositivo', async () => {
    const name = await s.frame.getByPlaceholder('Ej. María Rodríguez').inputValue()
    if (name !== 'Ana Pérez') throw new Error('El nombre no se conservó')
    await s.frame.getByRole('button', { name: 'Continuar al equipaje' }).click()
    const weight = await s.frame.getByLabel('Peso total de misceláneas').inputValue()
    if (weight !== '35') throw new Error('El peso no se conservó')
  })
}
