// src/core/group.ts

import type { WaClient } from 'zapo-js'

export interface GroupAdminStatus {
  isAdmin: boolean
  isBotAdmin: boolean
  metadata: any | null
}

interface CacheEntry {
  metadata: any
  expiresAt: number
}

const metadataCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000 // Cache selama 1 menit

/**
 * Ambil metadata grup dengan in-memory cache
 */
export async function getGroupMetadata(client: WaClient, groupJid: string): Promise<any | null> {
  const cached = metadataCache.get(groupJid)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metadata
  }

  try {
    const metadata = await client.group.queryGroupMetadata(groupJid)
    metadataCache.set(groupJid, {
      metadata,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return metadata
  } catch (err) {
    return null
  }
}

/**
 * Hapus cache grup tertentu jika ada perubahan (misal promote/demote)
 */
export function invalidateGroupCache(groupJid: string): void {
  metadataCache.delete(groupJid)
}

/**
 * Normalisasi dan ekstraksi token identitas dari JID / LID / nomor telepon
 */
export function extractJidTokens(rawJid?: string | null): string[] {
  if (!rawJid) return []
  const clean = rawJid.trim().toLowerCase()
  const withoutDevice = clean.split(':')[0] ?? clean
  const numericOnly = withoutDevice.split('@')[0]?.replace(/\D/g, '') ?? ''

  const tokens = new Set<string>()
  if (clean) tokens.add(clean)
  if (withoutDevice) tokens.add(withoutDevice)
  if (numericOnly) tokens.add(numericOnly)

  return Array.from(tokens)
}

/**
 * Cek apakah seorang participant dari metadata grup cocok dengan target JID
 */
export function isParticipantMatch(p: any, targetJid: string): boolean {
  if (!p || !targetJid) return false

  const targetTokens = extractJidTokens(targetJid)
  if (targetTokens.length === 0) return false

  const pTokens = new Set<string>([
    ...extractJidTokens(p.jid),
    ...extractJidTokens(p.lid),
    ...extractJidTokens(p.phoneNumber),
  ])

  for (const token of targetTokens) {
    if (pTokens.has(token)) {
      return true
    }
  }

  return false
}

/**
 * Cari participant tertentu di metadata grup
 */
export function findParticipant(metadata: any, targetJid: string): any | null {
  if (!metadata || !Array.isArray(metadata.participants)) return null
  return metadata.participants.find((p: any) => isParticipantMatch(p, targetJid)) ?? null
}

/**
 * Cek status admin pengirim dan bot di suatu grup
 */
export async function checkGroupAdmin(
  client: WaClient,
  groupJid: string,
  participantJid: string
): Promise<GroupAdminStatus> {
  const metadata = await getGroupMetadata(client, groupJid)
  if (!metadata || !Array.isArray(metadata.participants)) {
    return { isAdmin: false, isBotAdmin: false, metadata: null }
  }

  const creds = client.getCredentials()
  const botJid = creds?.meJid ?? ''

  let isAdmin = false
  let isBotAdmin = false

  for (const p of metadata.participants) {
    const isParticipantAdmin = Boolean(p.isAdmin || p.isSuperAdmin)

    if (isParticipantMatch(p, participantJid) && isParticipantAdmin) {
      isAdmin = true
    }

    if (botJid && isParticipantMatch(p, botJid) && isParticipantAdmin) {
      isBotAdmin = true
    }
  }

  return { isAdmin, isBotAdmin, metadata }
}
