import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import sharp from 'sharp'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the dimensions of an image from a URL
 * @param imageUrl - The URL of the image
 * @returns Width and height of the image
 */
export async function getImageUrlDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get metadata using sharp
    const metadata = await sharp(buffer).metadata()

    return {
      width: metadata.width || 1024,
      height: metadata.height || 1024,
    }
  } catch (error) {
    console.error('[Utils] Error getting image dimensions:', error)
    // Return default dimensions on error
    return { width: 1024, height: 1024 }
  }
}
