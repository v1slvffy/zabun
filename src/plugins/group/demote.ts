// src/plugins/group/demote.ts

import type { SubCommand } from '../../types/index.ts'
import { getGroupMetadata, invalidateGroupCache, findParticipant } from '../../core/group.ts'

function resolveTargetJid(event: any, args: string[], metadata?: any): string | null {
  const contextInfo = event.message?.extendedTextMessage?.contextInfo as any
  const quoted = contextInfo?.participant
  const mentioned = Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid[0] : null
  const numOnly = args[0]?.replace(/\D/g, '')
  const rawTarget = quoted || mentioned || (numOnly ? `${numOnly}@s.whatsapp.net` : null)

  if (!rawTarget) return null

  if (metadata && Array.isArray(metadata.participants)) {
    const matched = findParticipant(metadata, rawTarget)
    if (matched?.jid) {
      return matched.jid
    }
  }

  return rawTarget
}

export const demoteCommand: SubCommand = {
  name: 'demote',
  category: 'groupAdmin',
  description: 'Turunkan Admin menjadi Anggota biasa. Contoh: !demote @user atau reply pesannya',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async handler({ client, remoteJid, args, groupMetadata, event }) {
    const meta = groupMetadata ?? (await getGroupMetadata(client, remoteJid))
    const targetJid = resolveTargetJid(event, args, meta)

    if (!targetJid) {
      await client.message.send(
        remoteJid,
        '*Format Salah*\nReply pesan Admin yang ingin diturunkan atau tag/sebut nomornya:\nContoh: `!demote 628xxxxxxxx`',
        { quote: event }
      )
      return
    }

    try {
      await client.group.demoteParticipants(remoteJid, [targetJid])
      invalidateGroupCache(remoteJid)
      const userNumber = targetJid.split('@')[0]
      await client.message.send(
        remoteJid,
        `*Pemberitahuan*\n@${userNumber} sekarang telah diturunkan menjadi *Anggota Biasa*.`,
        {
          mentions: [targetJid],
          quote: event,
        }
      )
    } catch (err) {
      await client.message.send(remoteJid, 'Gagal menurunkan Admin menjadi anggota.', { quote: event })
    }
  },
}

export default demoteCommand
