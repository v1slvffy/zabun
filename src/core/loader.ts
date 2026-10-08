// src/core/loader.ts

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { WaClient, WaIncomingMessageEvent } from 'zapo-js'
import type { SubCommand, CommandContext } from '../types/index.ts'
import { botConfig } from './config.ts'
import { checkGroupAdmin } from './group.ts'
import { botStats } from './stats.ts'

const DEFAULT_PREFIX = process.env.PREFIX ?? '!'

function getTimestamp(): string {
  const now = new Date()
  return now.toTimeString().split(' ')[0] ?? ''
}

/**
 * Ekstrak teks dari berbagai tipe pesan WhatsApp (termasuk tombol & quick reply)
 */
function extractMessageText(message: WaIncomingMessageEvent['message']): string {
  if (!message) return ''

  const rawMsg = message as any
  const nativeParams = rawMsg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
  if (nativeParams) {
    try {
      const parsed = JSON.parse(nativeParams)
      if (parsed.id) return String(parsed.id).trim()
    } catch {}
  }

  if (rawMsg.interactiveResponseMessage?.body?.text) {
    return String(rawMsg.interactiveResponseMessage.body.text).trim()
  }

  if (rawMsg.templateButtonReplyMessage?.selectedId) {
    return String(rawMsg.templateButtonReplyMessage.selectedId).trim()
  }

  if (rawMsg.buttonsResponseMessage?.selectedButtonId) {
    return String(rawMsg.buttonsResponseMessage.selectedButtonId).trim()
  }

  if (rawMsg.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return String(rawMsg.listResponseMessage.singleSelectReply.selectedRowId).trim()
  }

  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    ''
  ).trim()
}


const commandMap = new Map<string, SubCommand>()
const uniqueCommandList: SubCommand[] = []

/**
 * Dapatkan seluruh daftar command yang terdaftar (tanpa duplikasi alias)
 */
export function getAllCommands(): SubCommand[] {
  return uniqueCommandList
}

/**
 * Daftarkan sebuah SubCommand (dan seluruh aliasnya) ke registry
 */
export function registerCommand(cmd: SubCommand): void {
  if (!cmd || !cmd.name || typeof cmd.handler !== 'function') return

  const mainName = cmd.name.toLowerCase()
  commandMap.set(mainName, cmd)

  if (!uniqueCommandList.some((c) => c.name === cmd.name)) {
    uniqueCommandList.push(cmd)
  }

  if (Array.isArray(cmd.alias)) {
    for (const alias of cmd.alias) {
      if (alias) {
        commandMap.set(alias.toLowerCase(), cmd)
      }
    }
  }
}

/**
 * Scan direktori secara rekursif dan cari semua file .ts
 */
function scanPluginFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry.endsWith('.bak')) continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        files.push(...scanPluginFiles(fullPath))
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js'))) {
        if (entry === 'index.ts' || entry === 'index.js') continue
        files.push(fullPath)
      }
    }
  } catch (err) {
    console.error(`Gagal membaca folder plugin: ${dir}`, err)
  }

  return files
}

/**
 * Muat semua plugin secara otomatis dari direktori src/plugins
 */
export async function autoLoadPlugins(client: WaClient, pluginsDir = join(import.meta.dir, '../plugins')): Promise<void> {
  const filePaths = scanPluginFiles(pluginsDir)

  for (const filePath of filePaths) {
    try {
      const module = await import(filePath)

      if (module.default) {
        if (Array.isArray(module.default)) {
          for (const cmd of module.default) {
            registerCommand(cmd)
          }
        } else if (typeof module.default === 'object') {
          registerCommand(module.default)
        }
      }

      for (const [key, value] of Object.entries(module)) {
        if (key === 'default') continue
        if (value && typeof value === 'object' && 'handler' in value && 'name' in value) {
          registerCommand(value as SubCommand)
        }
      }
    } catch (err) {
      console.error(`Gagal memuat plugin file ${filePath}:`, err)
    }
  }

  const totalCommands = uniqueCommandList.length
  botStats.setTotalCommands(totalCommands)
  console.log(`[Plugin Auto-Load: ${filePaths.length} File | ${totalCommands} Command aktif | Prefix: "${DEFAULT_PREFIX}" atau "."]`)

  client.on('message', async (event: WaIncomingMessageEvent) => {
    const remoteJid = event.key.remoteJid
    if (!remoteJid) return

    const rawText = extractMessageText(event.message)
    if (!rawText) return

    const isPrefixMatched = rawText.startsWith(DEFAULT_PREFIX) || rawText.startsWith('.')
    if (!isPrefixMatched) return

    const usedPrefix = rawText.startsWith(DEFAULT_PREFIX) ? DEFAULT_PREFIX : '.'
    const cleanText = rawText.slice(usedPrefix.length).trim()
    const [rawCommand, ...args] = cleanText.split(/\s+/)
    const commandName = rawCommand?.toLowerCase() ?? ''

    if (!commandName) return

    const sub = commandMap.get(commandName)
    if (!sub) {
      await client.message.send(
        remoteJid,
        `Command *${usedPrefix}${commandName}* tidak ditemukan.\nKetik *${DEFAULT_PREFIX}menu* untuk daftar command.`,
        { quote: event }
      )
      return
    }

    const isGroup = remoteJid.endsWith('@g.us') || Boolean(event.key.isGroup)
    const senderJid = event.key.participant ?? (event.key.fromMe ? (client.getCredentials()?.meJid ?? remoteJid) : remoteJid)
    const isOwner = botConfig.isOwner(senderJid, event.key.fromMe, client)
    const currentMode = botConfig.getMode()

    if (currentMode === 'self' && !isOwner) {
      return
    }

    let isAdmin = false
    let isBotAdmin = false
    let groupMetadata: any = null

    if (isGroup) {
      const adminStatus = await checkGroupAdmin(client, remoteJid, senderJid)
      isAdmin = adminStatus.isAdmin
      isBotAdmin = adminStatus.isBotAdmin
      groupMetadata = adminStatus.metadata
    }

    const senderDisplay = event.pushName
      ? `${event.pushName} (${senderJid.split('@')[0]})`
      : senderJid.split('@')[0]

    const groupTag = isGroup
      ? ` [Grup | Admin: ${isAdmin ? 'Ya' : 'Bukan'} | BotAdmin: ${isBotAdmin ? 'Ya' : 'Bukan'}]`
      : ''
    console.log(
      `[${getTimestamp()}] ${usedPrefix}${commandName} dari ${senderDisplay}${groupTag} [Owner: ${isOwner ? 'Ya' : 'Bukan'} | Mode: ${currentMode.toUpperCase()}]`
    )

    if (sub.ownerOnly && !isOwner) {
      await client.message.send(
        remoteJid,
        `*Akses Ditolak*\nFitur *${usedPrefix}${commandName}* hanya dapat digunakan oleh Owner bot.`,
        { quote: event }
      )
      return
    }

    if (sub.groupOnly && !isGroup) {
      await client.message.send(
        remoteJid,
        `*Perhatian*\nFitur *${usedPrefix}${commandName}* hanya dapat digunakan di dalam Grup.`,
        { quote: event }
      )
      return
    }

    if (sub.adminOnly && !isAdmin) {
      await client.message.send(
        remoteJid,
        `*Akses Ditolak*\nFitur *${usedPrefix}${commandName}* hanya dapat digunakan oleh Admin Grup.`,
        { quote: event }
      )
      return
    }

    if (sub.botAdminRequired && !isBotAdmin) {
      await client.message.send(
        remoteJid,
        `*Akses Terbatas*\nBot harus menjadi *Admin Grup* untuk menjalankan fitur *${usedPrefix}${commandName}*.`,
        { quote: event }
      )
      return
    }

    const ctx: CommandContext = {
      client,
      remoteJid,
      senderJid,
      isGroup,
      isOwner,
      isAdmin,
      isBotAdmin,
      groupMetadata,
      text: rawText,
      args,
      senderName: event.pushName ?? '',
      event,
    }

    try {
      botStats.incrementCommandHits()
      const start = Date.now()
      await sub.handler(ctx)
      const ms = Date.now() - start
      console.log(`[${getTimestamp()}] Selesai ${usedPrefix}${commandName} (${ms}ms)`)
    } catch (err) {
      console.error(`[${getTimestamp()}] Error ${usedPrefix}${commandName}:`, err)
      await client.message.send(remoteJid, `Terjadi error saat menjalankan command ini.`, {
        quote: event,
      })
    }
  })
}
