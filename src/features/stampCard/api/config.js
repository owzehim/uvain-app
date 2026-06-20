import { supabase } from '../../../lib/supabase'
import { compressImage } from '../../../lib/imageCompression'

export const DEFAULT_STAMP_CARD_CONFIG = {
  total_stamps: 10,
  stamps_per_row: 5,
  title: '',
  subtitle: '',
  reward_text: '',
  accent_color: '#ef4444',
  text_color: '#ffffff',
  wallpaper_url: null,
}

export async function fetchConfigBySpot(restaurantId) {
  const { data, error } = await supabase
    .from('stamp_card_config')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function upsertConfig(restaurantId, data) {
  const { error } = await supabase
    .from('stamp_card_config')
    .upsert(
      {
        ...data,
        restaurant_id: restaurantId,
        updated_at: new Date().toISOString(),
      },
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

  const { error: uploadError } = await supabase.storage
    .from('stamp-card-wallpapers')
    .upload(fileName, compressed, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('stamp-card-wallpapers')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

export async function deleteWallpaper(wallpaperUrl) {
  const fileName = wallpaperUrl.split('/').pop()

  const { error } = await supabase.storage
    .from('stamp-card-wallpapers')
    .remove([fileName])

  if (error) throw error
  // Caller must call upsertConfig({ wallpaper_url: null }) after this
}
