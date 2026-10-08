// src/plugins/sticker/sticker.ts

import type { SubCommand } from '../../types/index.ts'
import { imageToSticker, videoToSticker } from '../../core/sticker.ts'

function parsePackAuthor(args: string[]): { packname?: string; author?: string } {
  const fullText = args.join(' ').trim()
  if (!fullText) return {}

  if (fullText.includes('|')) {
    const [packname, ...rest] = fullText.split('|')
    return {
      packname: packname?.trim(),
      author: rest.join('|').trim(),
    }
  }

  return { packname: fullText }
}

export const stickerCommand: SubCommand = {
  name: 's',
  alias: ['sticker', 'stiker'],
  category: 'sticker',
  description: 'Ubah gambar / video / gif jadi stiker. Contoh: !s [Packname | Author]',

  async handler({ client, remoteJid, args, event }) {
    const rawMsg = event.message
    const quotedMsg = (rawMsg?.extendedTextMessage?.contextInfo as any)?.quotedMessage

    const isDirectImage = Boolean(rawMsg?.imageMessage)
    const isDirectVideo = Boolean(rawMsg?.videoMessage)
    const isQuotedImage = Boolean(quotedMsg?.imageMessage)
    const isQuotedVideo = Boolean(quotedMsg?.videoMessage)
    const isQuotedSticker = Boolean(quotedMsg?.stickerMessage)

    const hasMedia = isDirectImage || isDirectVideo || isQuotedImage || isQuotedVideo || isQuotedSticker

    if (!hasMedia) {
      const prefix = process.env.PREFIX ?? '!'
      await client.message.send(
        remoteJid,
        [
          `*CARA MEMBUAT STIKER*`,
          ``,
          `Kirim gambar / video dengan caption atau reply media:`,
          `• *${prefix}s*`,
          `• *${prefix}s NamaPack | NamaAuthor*`,
          ``,
          `_Video / GIF maksimal berdurasi 10 detik._`,
        ].join('\n'),
        { quote: event }
      )
      return
    }

    const { packname, author } = parsePackAuthor(args)

    try {
      let mediaBytes: Uint8Array
      let isVideo = false

      if (isDirectImage) {
        mediaBytes = await client.message.downloadBytes(event)
      } else if (isDirectVideo) {
        mediaBytes = await client.message.downloadBytes(event)
        isVideo = true
      } else if (isQuotedImage) {
        mediaBytes = await client.message.downloadBytes(quotedMsg)
      } else if (isQuotedVideo) {
        mediaBytes = await client.message.downloadBytes(quotedMsg)
        isVideo = true
      } else if (isQuotedSticker) {
        mediaBytes = await client.message.downloadBytes(quotedMsg)
      } else {
        await client.message.send(remoteJid, 'Format media tidak didukung.', { quote: event })
        return
      }

      if (!mediaBytes || mediaBytes.length === 0) {
        await client.message.send(remoteJid, 'Gagal mengunduh media dari pesan.', { quote: event })
        return
      }

      const inputBuffer = Buffer.from(mediaBytes)
      let stickerBuffer: Buffer

      if (isVideo) {
        stickerBuffer = await videoToSticker(inputBuffer, { packname, author })
      } else {
        stickerBuffer = await imageToSticker(inputBuffer, { packname, author })
      }

      await client.message.send(
        remoteJid,
        {
          type: 'sticker',
          media: stickerBuffer,
          isAnimated: isVideo,
        },
        { quote: event }
      )
    } catch (err: any) {
      console.error('[sticker] Error membuat sticker:', err)
      await client.message.send(
        remoteJid,
        `Gagal membuat stiker: ${err?.message || 'Terjadi kesalahan internal'}`,
        { quote: event }
      )
    }
  },
}

export default stickerCommand
