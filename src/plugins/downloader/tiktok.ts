// src/plugins/downloader/tiktok.ts

import type { SubCommand } from '../../types/index.ts'

interface TikWmResponse {
  code: number
  msg: string
  data?: {
    id: string
    title: string
    cover: string
    duration: number
    play: string
    hdplay?: string
    wmplay?: string
    size?: number
    hd_size?: number
    music?: string
    music_info?: {
      id: string
      title: string
      author: string
      album?: string
      play?: string
    }
    play_count?: number
    digg_count?: number
    comment_count?: number
    share_count?: number
    download_count?: number
    author?: {
      id: string
      unique_id: string
      nickname: string
      avatar: string
    }
    images?: string[]
  }
}

function formatNumber(num?: number): string {
  if (!num) return '0'
  return num.toLocaleString('id-ID')
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i)
  return match ? match[0] : null
}

async function fetchTikTok(url: string): Promise<TikWmResponse['data']> {
  const endpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      Accept: 'application/json, text/javascript, */*; q=0.01',
    },
  })

  if (!res.ok) {
    throw new Error(`Server TikWM merespon status ${res.status}`)
  }

  const json: TikWmResponse = await res.json()
  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg || 'Gagal mengekstrak data dari tautan TikTok')
  }

  return json.data
}

export const tiktokCommand: SubCommand = {
  name: 'tiktok',
  alias: ['tt', 'tiktokdl', 'ttdl', 'ttmp4', 'ttmp3', 'ttmusic'],
  category: 'downloader',
  description: 'Download video atau audio TikTok tanpa watermark. Contoh: !tiktok <url>',

  async handler({ client, remoteJid, args, text, event }) {
    const prefix = process.env.PREFIX ?? '!'

    const isMusicOnly = text.trim().startsWith(`${prefix}ttmp3`) || text.trim().startsWith(`${prefix}ttmusic`) || text.trim().startsWith(`.ttmp3`) || text.trim().startsWith(`.ttmusic`)

    const quotedText = (event.message?.extendedTextMessage?.contextInfo as any)?.quotedMessage?.conversation ||
                       (event.message?.extendedTextMessage?.contextInfo as any)?.quotedMessage?.extendedTextMessage?.text ||
                       ''
    const targetUrl = extractUrl(args.join(' ')) || extractUrl(quotedText)

    if (!targetUrl) {
      await client.message.send(
        remoteJid,
        [
          `*TIKTOK DOWNLOADER*`,
          ``,
          `Kirim link video atau slide TikTok:`,
          `• *${prefix}tiktok <url>* (download video/slide)`,
          `• *${prefix}ttmp3 <url>* (download audio saja)`,
          ``,
          `Contoh: *${prefix}tiktok https://vt.tiktok.com/xxxx*`,
        ].join('\n'),
        { quote: event }
      )
      return
    }

    await client.message.send(remoteJid, 'Sedang memproses tautan TikTok...', { quote: event })

    try {
      const data = await fetchTikTok(targetUrl)

      if (isMusicOnly) {
        const audioUrl = data.music || data.music_info?.play
        if (!audioUrl) {
          await client.message.send(remoteJid, 'Audio tidak tersedia untuk konten ini.', { quote: event })
          return
        }

        const audioRes = await fetch(audioUrl)
        const audioBuf = Buffer.from(await audioRes.arrayBuffer())

        await client.message.send(
          remoteJid,
          {
            type: 'audio',
            media: audioBuf,
            mimetype: 'audio/mpeg',
          },
          { quote: event }
        )
        return
      }

      const isSlide = Array.isArray(data.images) && data.images.length > 0

      if (isSlide && data.images) {
        const authorName = data.author?.nickname || data.author?.unique_id || 'TikTok'
        const caption = [
          `*TIKTOK SLIDE PHOTO*`,
          ``,
          `Author: @${data.author?.unique_id || '-'} (${authorName})`,
          `Judul: ${data.title || '-'}`,
          `Total Slide: ${data.images.length} gambar`,
          `Musik: ${data.music_info?.title || '-'} - ${data.music_info?.author || '-'}`,
        ].join('\n')

        const maxSlides = Math.min(data.images.length, 10)
        for (let i = 0; i < maxSlides; i++) {
          const imgUrl = data.images[i]
          if (!imgUrl) continue
          const imgRes = await fetch(imgUrl)
          const imgBuf = Buffer.from(await imgRes.arrayBuffer())

          await client.message.send(
            remoteJid,
            {
              type: 'image',
              media: imgBuf,
              caption: i === 0 ? caption : undefined,
            },
            { quote: i === 0 ? event : undefined }
          )
        }

        const buttonMessage = {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: {
                  text: `Slide berhasil dikirim (${maxSlides} gambar).\nKlik tombol di bawah jika ingin mengunduh audionya:\n\nAtau ketik: *${prefix}ttmp3 ${targetUrl}*`,
                },
                footer: {
                  text: 'TikTok Downloader',
                },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: 'quick_reply',
                      buttonParamsJson: JSON.stringify({
                        display_text: 'Ambil Audio',
                        id: `${prefix}ttmp3 ${targetUrl}`,
                      }),
                    },
                  ],
                },
              },
            },
          },
        }

        await client.message.send(remoteJid, buttonMessage, { quote: event })
        return
      }

      const videoDownloadUrl = data.hdplay || data.play
      if (!videoDownloadUrl) {
        await client.message.send(remoteJid, 'Gagal menemukan URL download video.', { quote: event })
        return
      }

      const videoRes = await fetch(videoDownloadUrl)
      const videoBuf = Buffer.from(await videoRes.arrayBuffer())

      const captionText = [
        `*TIKTOK DOWNLOADER*`,
        ``,
        `Author: @${data.author?.unique_id || '-'} (${data.author?.nickname || '-'})`,
        `Judul: ${data.title || '-'}`,
        `Durasi: ${data.duration} detik`,
        `Musik: ${data.music_info?.title || '-'} - ${data.music_info?.author || '-'}`,
        ``,
        `Statistik Video:`,
        `  - Views: ${formatNumber(data.play_count)}`,
        `  - Likes: ${formatNumber(data.digg_count)}`,
        `  - Comments: ${formatNumber(data.comment_count)}`,
        `  - Shares: ${formatNumber(data.share_count)}`,
        ``,
        `Ketik *${prefix}ttmp3 ${targetUrl}* untuk mengambil audio.`,
      ].join('\n')

      // Kirim video utama
      await client.message.send(
        remoteJid,
        {
          type: 'video',
          media: videoBuf,
          caption: captionText,
          mimetype: 'video/mp4',
        },
        { quote: event }
      )

      const interactiveButtons = {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: {
                text: 'Pilihan unduhan tambahan:',
              },
              footer: {
                text: 'TikTok Downloader',
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Ambil Audio',
                      id: `${prefix}ttmp3 ${targetUrl}`,
                    }),
                  },
                ],
              },
            },
          },
        },
      }

      await client.message.send(remoteJid, interactiveButtons, { quote: event })
    } catch (err: any) {
      console.error('[tiktok] Error:', err)
      await client.message.send(
        remoteJid,
        `Gagal mengunduh TikTok: ${err?.message || 'Terjadi kesalahan sistem.'}`,
        { quote: event }
      )
    }
  },
}

export default tiktokCommand
