// src/core/stats.ts

import os from 'node:os'

let totalRegisteredCommands = 0
let commandExecutionCount = 0
const botStartTime = Date.now()

/**
 * Format detik menjadi teks yang mudah dibaca (Hari, Jam, Menit, Detik)
 */
export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)

  return parts.join(' ')
}

/**
 * Format bytes menjadi MB atau GB
 */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`
  }
  return `${mb.toFixed(1)} MB`
}

export const botStats = {
  setTotalCommands(count: number): void {
    totalRegisteredCommands = count
  },

  getTotalCommands(): number {
    return totalRegisteredCommands
  },

  incrementCommandHits(): void {
    commandExecutionCount++
  },

  getCommandHits(): number {
    return commandExecutionCount
  },

  getBotUptime(): string {
    const uptimeSec = Math.floor((Date.now() - botStartTime) / 1000)
    return formatDuration(uptimeSec)
  },

  getServerUptime(): string {
    return formatDuration(os.uptime())
  },

  getServerSpec() {
    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model?.trim() ?? 'Unknown CPU'
    const cpuCores = cpus.length

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    const mem = process.memoryUsage()

    return {
      osType: `${os.type()} ${os.release()} (${os.arch()})`,
      platform: os.platform(),
      cpuModel,
      cpuCores,
      totalMem: formatBytes(totalMem),
      usedMem: formatBytes(usedMem),
      freeMem: formatBytes(freeMem),
      botHeap: formatBytes(mem.heapUsed), // Memori JS aktual
      botRss: formatBytes(mem.rss),       // Memori fisik OS (termasuk C++ runtime & shared memory)
      bunVersion: typeof Bun !== 'undefined' ? `Bun v${Bun.version}` : `Node ${process.version}`,
    }
  },
}
