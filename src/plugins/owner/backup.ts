// src/plugins/owner/backup.ts

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import type { SubCommand } from '../../types/index.ts'

function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command ${cmd} exited with code ${code}: ${stderr}`))
    })
    proc.on('error', (err) => reject(err))
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const backupCommand: SubCommand = {
  name: 'backup',
  alias: ['bckp'],
  category: 'owner',
  description: 'Backup seluruh data bot, source code, dan sesi WhatsApp',
  ownerOnly: true,

  async handler({ client, remoteJid, event }) {
    const projectRoot = process.cwd()
    const now = new Date()
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `backup-bot-${dateStr}.zip`

    const tmpStageId = `zapo_stage_${crypto.randomBytes(4).toString('hex')}`
    const stageDir = path.join(os.tmpdir(), tmpStageId, 'bot-backup')
    const zipPath = path.join(os.tmpdir(), `${tmpStageId}.zip`)

    await client.message.send(remoteJid, 'Menyiapkan arsip backup lengkap...', { quote: event })

    try {
      fs.mkdirSync(stageDir, { recursive: true })

      // 1. Copy source code (src)
      await runCommand('cp', ['-r', 'src', stageDir], projectRoot)

      // 2. Copy file konfigurasi project
      for (const file of ['package.json', 'tsconfig.json', 'README.md']) {
        const p = path.join(projectRoot, file)
        if (fs.existsSync(p)) {
          fs.copyFileSync(p, path.join(stageDir, file))
        }
      }

      // 3. Copy .env jika ada (disimpan sebagai .env dan env.backup agar tidak hidden di HP)
      const envPath = path.join(projectRoot, '.env')
      if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, path.join(stageDir, '.env'))
        fs.copyFileSync(envPath, path.join(stageDir, 'env.backup'))
      }

      // 4. Copy sesi WhatsApp (.auth)
      // Disimpan dalam folder .auth (untuk restore) dan session/ (agar tidak tersembunyi di file manager HP)
      const authDir = path.join(projectRoot, '.auth')
      if (fs.existsSync(authDir)) {
        const targetAuth = path.join(stageDir, '.auth')
        const targetSession = path.join(stageDir, 'session')

        fs.mkdirSync(targetAuth, { recursive: true })
        fs.mkdirSync(targetSession, { recursive: true })

        await runCommand('cp', ['-r', '.auth/.', targetAuth], projectRoot)
        await runCommand('cp', ['-r', '.auth/.', targetSession], projectRoot)
      }

      // 5. Buat zip dari isi stageDir
      await runCommand('zip', ['-r', zipPath, '.'], stageDir)

      const zipBuffer = await fs.promises.readFile(zipPath)
      const fileSizeStr = formatBytes(zipBuffer.length)

      const caption = [
        `*BACKUP BOT SELESAI*`,
        ``,
        `Waktu: *${now.toLocaleString('id-ID')}*`,
        `Ukuran File: *${fileSizeStr}*`,
        ``,
        `Isi Arsip:`,
        `  - Source Code (folder *src/*)`,
        `  - Sesi WhatsApp (folder *session/* & *.auth/*)`,
        `  - Konfigurasi (*package.json*, *tsconfig.json*, *.env*)`,
        ``,
        `_Catatan: Di HP, file berawalan tanda titik seperti .auth & .env mungkin tersembunyi secara default. Gunakan folder session/ atau aktifkan "Tampilkan file tersembunyi" di File Manager._`,
      ].join('\n')

      await client.message.send(
        remoteJid,
        {
          type: 'document',
          media: zipBuffer,
          fileName: backupName,
          mimetype: 'application/zip',
          caption,
        },
        { quote: event }
      )
    } catch (err: any) {
      console.error('[backup] Gagal membuat file backup:', err)
      await client.message.send(
        remoteJid,
        `Gagal membuat backup: ${err?.message || 'Terjadi kesalahan sistem.'}`,
        { quote: event }
      )
    } finally {
      // Bersihkan folder sementara
      const parentTmp = path.join(os.tmpdir(), tmpStageId)
      if (fs.existsSync(parentTmp)) {
        await runCommand('rm', ['-rf', parentTmp], os.tmpdir()).catch(() => {})
      }
      if (fs.existsSync(zipPath)) {
        await fs.promises.unlink(zipPath).catch(() => {})
      }
    }
  },
}

export default backupCommand
