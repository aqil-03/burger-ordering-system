import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

const UPLOAD_ROOT = env.uploadsDir
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const IMAGE_TYPES = [
  {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    extension: 'png',
    mimeType: 'image/png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    extension: 'webp',
    mimeType: 'image/webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
]

function detectImageType(buffer) {
  return IMAGE_TYPES.find((type) => type.matches(buffer)) ?? null
}

function uploadDirectory(kind) {
  if (kind !== 'menu' && kind !== 'payment') {
    throw new AppError('Unsupported image upload type.', {
      status: 400,
      code: 'INVALID_UPLOAD_TYPE',
    })
  }

  return path.join(UPLOAD_ROOT, kind)
}

export async function saveUploadedImage({ kind, buffer }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Choose an image file to upload.', {
      status: 400,
      code: 'IMAGE_REQUIRED',
    })
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError('The image must be 5 MB or smaller.', {
      status: 413,
      code: 'IMAGE_TOO_LARGE',
    })
  }

  const imageType = detectImageType(buffer)

  if (!imageType) {
    throw new AppError(
      'Upload a JPEG, PNG, or WebP image. SVG files are not accepted.',
      {
        status: 415,
        code: 'UNSUPPORTED_IMAGE_TYPE',
      },
    )
  }

  const directory = uploadDirectory(kind)
  const filename = `${kind}-${randomUUID()}.${imageType.extension}`

  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), buffer)

  return `/uploads/${kind}/${filename}`
}

export async function removeUploadedImage(imageUrl) {
  if (typeof imageUrl !== 'string') return

  const match = /^\/uploads\/(menu|payment)\/([A-Za-z0-9._-]+)$/.exec(
    imageUrl,
  )

  if (!match) return

  const [, kind, filename] = match
  const safeFilename = path.basename(filename)

  if (safeFilename !== filename) return

  await unlink(path.join(UPLOAD_ROOT, kind, safeFilename)).catch(() => {})
}
