// src/core/sticker.ts

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import webpmux from 'node-webpmux'

export interface StickerOptions {
  packname?: string
  author?: string
  packId?: string
  emojis?: string[]
}

/**
 * Membuat EXIF buffer standar WhatsApp WebP
 * Catatan: WhatsApp Client mewajibkan tag emojis minimal 1 emoji agar tombol "Simpan / Tambah ke Favorit" aktif
 */
export function createExif(options: StickerOptions = {}): Buffer {
  const packname = options.packname || process.env.STICKER_PACKNAME || 'WhatsApp Bot'
  const author = options.author || process.env.STICKER_AUTHOR || 'Zapo'
  const packId = options.packId || 'com.zapo.sticker'
  const emojis = options.emojis && options.emojis.length > 0 ? options.emojis : ['🥀']

  const json = {
    'sticker-pack-id': packId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: emojis,
    'is-avatar-sticker': 0,
    'android-app-store-link': '',
    'ios-app-store-link': '',
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00,
  ])

  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)

  return exif
}

/**
 * Fallback binary injection jika webpmux gagal
 */
function addExifToWebpFallback(webpBuffer: Buffer, exif: Buffer): Buffer {
  const exifIndex = webpBuffer.indexOf(Buffer.from('EXIF'))

  if (exifIndex !== -1) {
    const oldExifSize = webpBuffer.readUInt32LE(exifIndex + 4)
    const padding = oldExifSize % 2 === 1 ? 1 : 0
    const beforeExif = webpBuffer.subarray(0, exifIndex)
    const afterExif = webpBuffer.subarray(exifIndex + 8 + oldExifSize + padding)

    const exifChunkId = Buffer.from('EXIF')
    const exifSize = Buffer.alloc(4)
    exifSize.writeUInt32LE(exif.length)

    const newPadding = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
    const newWebp = Buffer.concat([beforeExif, exifChunkId, exifSize, exif, newPadding, afterExif])

    const newFileSize = newWebp.length - 8
    newWebp.writeUInt32LE(newFileSize, 4)
    return newWebp
  }

  const riffHeader = webpBuffer.subarray(0, 4)
  const webpSignature = webpBuffer.subarray(8, 12)
  const webpData = webpBuffer.subarray(12)

  const exifChunkId = Buffer.from('EXIF')
  const exifSize = Buffer.alloc(4)
  exifSize.writeUInt32LE(exif.length)

  const exifChunk = Buffer.concat([exifChunkId, exifSize, exif])
  const padding = exif.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
  const newWebpData = Buffer.concat([webpData, exifChunk, padding])

  const newFileSize = Buffer.alloc(4)
  newFileSize.writeUInt32LE(4 + newWebpData.length)

  return Buffer.concat([riffHeader, newFileSize, webpSignature, newWebpData])
}

/**
 * Menambahkan atau menimpa EXIF metadata ke dalam WebP buffer menggunakan node-webpmux
 * Menghasilkan chunk VP8X + EXIF standar spesifikasi Google WebP & WhatsApp
 */
export async function addExifToWebp(webpBuffer: Buffer, options: StickerOptions = {}): Promise<Buffer> {
  const exif = createExif(options)

  try {
    const img = new webpmux.Image()
    await img.load(webpBuffer)
    img.exif = exif
    return await img.save(null)
  } catch (err) {
    console.error('[sticker] webpmux error, fallback to binary injection:', err)
    return addExifToWebpFallback(webpBuffer, exif)
  }
}

/**
 * Helper eksekusi ffmpeg menggunakan Promise
 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`))
      }
    })

    proc.on('error', (err) => reject(err))
  })
}

/**
 * Konversi gambar (JPG/PNG/WEBP) menjadi sticker WebP
 */
export async function imageToSticker(imageBuffer: Buffer, options: StickerOptions = {}): Promise<Buffer> {
  const isWebp = imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
                 imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP'

  // Jika input sudah berformat WebP (misal reply sticker), langsung sematkan EXIF baru
  if (isWebp) {
    return await addExifToWebp(imageBuffer, options)
  }

  const tmpDir = path.join(os.tmpdir(), 'zapo-sticker')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = crypto.randomBytes(4).toString('hex')
  const inputPath = path.join(tmpDir, `in_${id}.png`)
  const outputPath = path.join(tmpDir, `out_${id}.webp`)

  await fs.promises.writeFile(inputPath, imageBuffer)

  try {
    await runFfmpeg([
      '-i', inputPath,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
      '-vcodec', 'libwebp',
      '-quality', '80',
      '-y',
      outputPath,
    ])

    const rawWebp = await fs.promises.readFile(outputPath)
    return await addExifToWebp(rawWebp, options)
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {})
    await fs.promises.unlink(outputPath).catch(() => {})
  }
}

/**
 * Konversi video / GIF menjadi animated sticker WebP (maksimal 10 detik)
 */
export async function videoToSticker(videoBuffer: Buffer, options: StickerOptions = {}): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), 'zapo-sticker')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = crypto.randomBytes(4).toString('hex')
  const isGif = videoBuffer.subarray(0, 3).toString('ascii') === 'GIF'
  const ext = isGif ? 'gif' : 'mp4'
  const inputPath = path.join(tmpDir, `in_${id}.${ext}`)
  const outputPath = path.join(tmpDir, `out_${id}.webp`)

  await fs.promises.writeFile(inputPath, videoBuffer)

  try {
    await runFfmpeg([
      '-i', inputPath,
      '-ss', '0',
      '-t', '10',
      '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1',
      '-vcodec', 'libwebp',
      '-loop', '0',
      '-preset', 'default',
      '-an',
      '-vsync', '0',
      '-quality', '60',
      '-y',
      outputPath,
    ])

    const rawWebp = await fs.promises.readFile(outputPath)
    return await addExifToWebp(rawWebp, options)
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {})
    await fs.promises.unlink(outputPath).catch(() => {})
  }
}
