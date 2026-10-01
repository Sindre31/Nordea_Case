import { createApp } from './app.js'

const PORT = Number(process.env.PORT ?? 3000)
const app = createApp()

app.listen(PORT, () => {
  console.log(`Wealth Copilot API listening on http://localhost:${PORT}`)
  console.log('All data served by this API is 100% synthetic / fictional.')
})
