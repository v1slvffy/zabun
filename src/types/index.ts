// src/types/index.ts
// Tipe global yang dipakai seluruh bot

import type { WaClient, WaIncomingMessageEvent } from 'zapo-js'


export interface SubCommand {
  /** Nama sub-command, misal: "ping", "menu", "kick", "hidetag" */
  name: string
  /** Alias alternatif nama perintah, misal: ["s", "stiker"] */
  alias?: string[]
  /** Kategori fitur untuk pengelompokan menu/help */
  category?: 'general' | 'sticker' | 'downloader' | 'group' | 'groupAdmin' | 'owner'
  /** Deskripsi singkat untuk ditampilkan di menu/help */
  description: string
  /** Jika true, command hanya bisa dipanggil oleh owner */
  ownerOnly?: boolean
  /** Jika true, command hanya bisa dipanggil di dalam grup */
  groupOnly?: boolean
  /** Jika true, command hanya bisa dipanggil oleh Admin grup */
  adminOnly?: boolean
  /** Jika true, command memerlukan bot sebagai Admin grup */
  botAdminRequired?: boolean
  /** Handler ketika sub-command ini dipanggil */
  handler: CommandHandler
}

export interface Plugin {
  /** Nama plugin, misal: "general", "owner", "group" */
  name: string
  /** Daftar sub-command yang ada di plugin ini */
  commands: SubCommand[]
  /** Dipanggil saat plugin didaftarkan ke bot */
  load: (client: WaClient) => void | Promise<void>
}


export interface CommandContext {
  client: WaClient
  /** JID tujuan balasan (bisa private atau group) */
  remoteJid: string
  /** JID pengirim pesan */
  senderJid: string
  /** Apakah chat berasal dari grup */
  isGroup: boolean
  /** Apakah pengirim adalah owner (termasuk nomor bot sendiri) */
  isOwner: boolean
  /** Apakah pengirim adalah admin grup (otomatis true jika owner) */
  isAdmin: boolean
  /** Apakah bot adalah admin di grup tersebut */
  isBotAdmin: boolean
  /** Metadata grup jika pesan berada di dalam grup */
  groupMetadata?: any
  /** Teks lengkap pesan yang masuk */
  text: string
  /** Argumen setelah nama command */
  args: string[]
  /** Nama display pengirim */
  senderName: string
  /** Raw message event dari zapo */
  event: WaIncomingMessageEvent
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>
