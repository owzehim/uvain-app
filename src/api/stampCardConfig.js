import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { compressImage } from '../lib/imageCompression'

export async function fetchConfigBySpot(restaurantId) {
  const { data, error } = await supabase
    .from('stamp_card_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single()

  if (error) {
    // No row found is not a real error here
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function upsertConfig(restaurantId, data) {
  const { error } = await supabaseAdmin
    .from('stamp_card_config')
    .upsert(
      { ...data, restaurant_id: restaurantId, updated_at: new Date().toISOString() },
      { onConflict: 'restaurant_id' }
    )

  if (error) throw error
}

export async function uploadWallpaper(restaurantId, file) {
  // Use existing compressImage helper (browser-image-compression)
  const compressed = await compressImage(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
  })

  const fileName = `${restaurantId}_${Date.now()}.jpg`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('stamp-card-wallpapers')
    .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabaseAdmin.storage
    .from('stamp-card-wallpapers')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

export async function deleteWallpaper(wallpaperUrl) {
  const fileName = wallpaperUrl.split('/').pop()

  const { error } = await supabaseAdmin.storage
    .from('stamp-card-wallpapers')
    .remove([fileName])

  if (error) throw error
  // Caller must call upsertConfig({ wallpaper_url: null }) after this
}