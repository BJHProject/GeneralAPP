import { put, del } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"

export interface MediaRecord {
  id: string
  user_id: string
  status: "temp" | "saved"
  storage_key: string
  mime_type: string
  size_bytes: number
  width?: number
  height?: number
  prompt?: string
  created_at: string
  expires_at?: string
  metadata?: any
}

/**
 * Fetch an image from a URL and upload it to Vercel Blob
 * @param imageUrl - The upstream generator URL (never exposed to client)
 * @param userId - The authenticated user ID
 * @param prefix - Storage prefix ('temp' or 'permanent')
 * @param metadata - Additional metadata to store
 * @returns The Blob storage key and URL
 */
export async function ingestImageToBlob(
  imageUrl: string,
  userId: string,
  prefix: "temp" | "permanent",
  metadata: { prompt?: string; width?: number; height?: number } = {},
): Promise<{ storageKey: string; blobUrl: string; size: number; mimeType: string }> {
  console.log(`[v0] Ingesting image to Blob with prefix: ${prefix}`)

  // Fetch the image server-side
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const imageBlob = await response.blob()
  const mimeType = imageBlob.type || "image/png"
  const size = imageBlob.size

  // Generate unique storage key
  const uuid = crypto.randomUUID()
  const extension = mimeType.split("/")[1] || "png"
  const storageKey = `${prefix}/${userId}/${uuid}.${extension}`

  console.log(`[v0] Uploading to Blob with key: ${storageKey}`)

  // Upload to Vercel Blob
  const blob = await put(storageKey, imageBlob, {
    access: "public",
    contentType: mimeType,
  })

  return {
    storageKey,
    blobUrl: blob.url,
    size,
    mimeType,
  }
}

/**
 * Prune oldest temporary media items to enforce the 10-item limit per user
 */
export async function pruneTempMedia(userId: string): Promise<void> {
  const supabase = await createServerClient()

  // Get all temp items for this user, ordered by creation date
  const { data: tempItems, error: fetchError } = await supabase
    .from("media")
    .select("id, storage_key")
    .eq("user_id", userId)
    .eq("status", "temp")
    .order("created_at", { ascending: false })

  if (fetchError) {
    console.error("[v0] Error fetching temp media:", fetchError)
    return
  }

  if (!tempItems || tempItems.length <= 10) {
    console.log(`[v0] User has ${tempItems?.length || 0} temp items, no pruning needed`)
    return
  }

  // Items to delete (everything after the first 10)
  const itemsToDelete = tempItems.slice(10)
  console.log(`[v0] Pruning ${itemsToDelete.length} old temp items`)

  // Delete from database
  const idsToDelete = itemsToDelete.map((item) => item.id)
  const { error: deleteError } = await supabase.from("media").delete().in("id", idsToDelete)

  if (deleteError) {
    console.error("[v0] Error deleting temp media from DB:", deleteError)
  }

  // Delete from Blob storage
  for (const item of itemsToDelete) {
    try {
      await del(item.storage_key)
      console.log(`[v0] Deleted Blob object: ${item.storage_key}`)
    } catch (error) {
      console.error(`[v0] Error deleting Blob object ${item.storage_key}:`, error)
    }
  }
}

/**
 * Move media from temp to permanent storage
 */
export async function moveToPermanen(mediaId: string, userId: string): Promise<void> {
  const supabase = await createServerClient()

  // Get the media record
  const { data: media, error: fetchError } = await supabase
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .eq("user_id", userId)
    .eq("status", "temp")
    .single()

  if (fetchError || !media) {
    throw new Error("Media not found or already saved")
  }

  // Fetch the blob content
  const response = await fetch(
    `https://${process.env.BLOB_READ_WRITE_TOKEN?.split("_")[1]}.public.blob.vercel-storage.com/${media.storage_key}`,
  )
  if (!response.ok) {
    throw new Error("Failed to fetch blob content")
  }

  const blobContent = await response.blob()

  // Generate new permanent storage key
  const uuid = crypto.randomUUID()
  const extension = media.mime_type.split("/")[1] || "png"
  const newStorageKey = `permanent/${userId}/${uuid}.${extension}`

  console.log(`[v0] Moving from ${media.storage_key} to ${newStorageKey}`)

  // Upload to permanent location
  await put(newStorageKey, blobContent, {
    access: "public",
    contentType: media.mime_type,
  })

  // Update database record
  const { error: updateError } = await supabase
    .from("media")
    .update({
      status: "saved",
      storage_key: newStorageKey,
      expires_at: null,
    })
    .eq("id", mediaId)
    .eq("user_id", userId)

  if (updateError) {
    // Rollback: delete the new blob
    await del(newStorageKey)
    throw updateError
  }

  // Delete old temp blob
  try {
    await del(media.storage_key)
    console.log(`[v0] Deleted old temp blob: ${media.storage_key}`)
  } catch (error) {
    console.error(`[v0] Error deleting old temp blob:`, error)
  }
}
