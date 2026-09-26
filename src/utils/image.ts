const MAX_INPUT_BYTES = 5 * 1024 * 1024
const MAX_OUTPUT_CHARS = 110_000 // ≈ 80 KB of JPEG once base64-decoded

export class ImageError extends Error {}

/**
 * Turns an uploaded photo into a small square JPEG data URL: centre-crop, resize to `size`²,
 * then lower the quality until it fits (keeps localStorage / future uploads small).
 */
export async function fileToSquareJpeg(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageError('Please choose an image file (JPG, PNG, WebP…).')
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('That image is larger than 5 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageError("Couldn't read that image. Try a JPG or PNG.")
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()

  for (const quality of [0.88, 0.8, 0.7, 0.6, 0.5]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_OUTPUT_CHARS) return url
  }
  return canvas.toDataURL('image/jpeg', 0.4)
}
