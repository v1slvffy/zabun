// src/plugins/group/kick.ts

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

export const kickCommand: SubCommand = {
  name: 'kick',
  category: 'groupAdmin',
  description: 'Keluarkan anggota dari grup. Contoh: !kick @user atau reply pesan target',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async handler({ client, remoteJid, args, groupMetadata, event }) {
    const meta = groupMetadata ?? (await getGroupMetadata(client, remoteJid))
    const targetJid = resolveTargetJid(event, args, meta)

    if (!targetJid) {
      await client.message.send(
        remoteJid,
        '*Format Salah*\nReply pesan anggota yang ingin di-kick atau sebut nomornya:\nContoh: `!kick 628xxxxxxxx`',
        { quote: event }
      )
      return
    }

    try {
      await client.group.removeParticipants(remoteJid, [targetJid])
      invalidateGroupCache(remoteJid)
      await client.message.send(
        remoteJid,
        `Berhasil mengeluarkan @${targetJid.split('@')[0]} dari grup.`,
        {
          mentions: [targetJid],
          quote: event,
        }
      )
    } catch (err) {
      await client.message.send(remoteJid, 'Gagal mengeluarkan anggota tersebut.', { quote: event })
    }
  },
}

export default kickCommand
