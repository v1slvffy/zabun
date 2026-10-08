// src/plugins/group/promote.ts

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

export const promoteCommand: SubCommand = {
  name: 'promote',
  category: 'groupAdmin',
  description: 'Naikkan anggota menjadi Admin grup. Contoh: !promote @user atau reply pesannya',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async handler({ client, remoteJid, args, groupMetadata, event }) {
    const meta = groupMetadata ?? (await getGroupMetadata(client, remoteJid))
    const targetJid = resolveTargetJid(event, args, meta)

    if (!targetJid) {
      await client.message.send(
        remoteJid,
        '*Format Salah*\nReply pesan anggota yang ingin dinaikkan atau tag/sebut nomornya:\nContoh: `!promote 628xxxxxxxx`',
        { quote: event }
      )
      return
    }

    try {
      await client.group.promoteParticipants(remoteJid, [targetJid])
      invalidateGroupCache(remoteJid)
      const userNumber = targetJid.split('@')[0]
      await client.message.send(
        remoteJid,
        `*Pemberitahuan*\n@${userNumber} sekarang telah dinaikkan menjadi *Admin Grup*.`,
        {
          mentions: [targetJid],
          quote: event,
        }
      )
    } catch (err) {
      await client.message.send(remoteJid, 'Gagal menaikkan anggota menjadi Admin.', { quote: event })
    }
  },
}

export default promoteCommand
