// src/index.ts
// Entry point utama bot

import { ConsoleLogger, WaClient } from 'zapo-js'
import { buildStore } from './core/store.ts'
import { setupAuth } from './core/auth.ts'
import { connectWithRetry } from './core/reconnect.ts'
import { autoLoadPlugins } from './core/loader.ts'

async function main() {
  console.log('Menyiapkan Bot WhatsApp...\n')

  const zapoLogLevel = (process.env.DEBUG ? 'info' : 'warn') as 'info' | 'warn'
  const logger = new ConsoleLogger(zapoLogLevel)

  // 2. Store bun:sqlite
  const store = buildStore()

  // 3. Client
  const client = new WaClient(
    {
      store,
      sessionId: 'default',
      connectTimeoutMs: 20_000,
      nodeQueryTimeoutMs: 30_000,
      recoverFromClientTooOld: true,
      history: { enabled: false },
    },
    logger
  )

  // 4. Auth
  setupAuth(client)

  // 5. Muat seluruh plugin
  await autoLoadPlugins(client)

  const shutdown = async () => {
    console.log('\nMematikan bot...')
    await client.disconnect()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // 7. Connect (dengan auto reconnect)
  await connectWithRetry(client)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
