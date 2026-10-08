// src/plugins/general/ping.ts

import type { SubCommand } from '../../types/index.ts'
import { botStats } from '../../core/stats.ts'

export const pingCommand: SubCommand = {
  name: 'ping',
  alias: ['p'],
  category: 'general',
  description: 'Cek kecepatan respon, uptime, spesifikasi server, dan statistik bot',

  async handler({ client, remoteJid, event }) {
    const start = Date.now()

    const serverDelay = event.timestampSeconds
      ? Math.max(0, Math.round(Date.now() - event.timestampSeconds * 1000))
      : 0

    const spec = botStats.getServerSpec()
    const botUptime = botStats.getBotUptime()
    const serverUptime = botStats.getServerUptime()
    const totalCommands = botStats.getTotalCommands()
    const totalHits = botStats.getCommandHits()

    const processTime = Date.now() - start

    const body = [
      `*STATUS BOT*`,
      ``,
      `Kecepatan Respon:`,
      `  - Respon: *${processTime} ms*`,
      `  - Latensi: *${serverDelay} ms*`,
      ``,
      `Uptime:`,
      `  - Bot: *${botUptime}*`,
      `  - Server: *${serverUptime}*`,
      ``,
      `Spesifikasi Server:`,
      `  - Runtime: *${spec.bunVersion}*`,
      `  - Sistem OS: *${spec.osType}*`,
      `  - CPU: *${spec.cpuModel} (${spec.cpuCores} Core)*`,
      `  - RAM Bot: *${spec.botHeap}* (Heap) / *${spec.botRss}* (RSS)`,
      `  - RAM Server: *${spec.usedMem}* / *${spec.totalMem}*`,
    ].join('\n')

    await client.message.send(remoteJid, body, { quote: event })
  },
}

export default pingCommand
