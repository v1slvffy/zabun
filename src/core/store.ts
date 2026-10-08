// src/core/store.ts

import { mkdirSync } from 'node:fs'
import { createStore } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'

export function buildStore() {
  // Pastikan direktori .auth/ ada sebelum SQLite mencoba buka file
  mkdirSync('.auth', { recursive: true })

  const backend = createSqliteStore({
    path: '.auth/state.sqlite',
    driver: 'auto', // pakai bun:sqlite kalau tersedia
  })

  return createStore({
    backends: { sqlite: backend },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'sqlite',
      threads: 'sqlite',
      contacts: 'sqlite',
    },
  })
}
