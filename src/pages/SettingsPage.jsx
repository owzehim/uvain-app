// src/pages/SettingsPage.jsx
// Full-screen settings page for logged-in members.
// Handles profile image upload + crop + delete + logout.

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserCircle, ArrowLeft } from '@phosphor-icons/react'
import Cropper from 'react-easy-crop'

// --- Helpers ---------------------------------------------------------------

// Same idea as on MemberPage: deterministic "random" color per user.
const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

function getAvatarColor(seed) {
  const str = seed || 'default'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// Compress an image blob/file using a canvas.
async function compressImage(file, maxWidth = 600, maxHeight = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          quality,
        )
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }

    img.src = url
  })
}

// Crop the selected area (square) from a data URL and return it as a Blob.
async function getCroppedImgAsBlob(imageSrc, pixelCrop) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.95,
    )
  })
}

// --- Page component --------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate()

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  // Cropper state
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)

  // Load current member
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        navigate('/login')
        return
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) {
        console.error('load member error:', memberError)
      }

      setMember(memberData || null)
      setLoading(false)
    }

    load()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // When user picks a file, open crop modal instead of immediate upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)

    // allow re-selecting the same file later
    e.target.value = ''
  }

  // Confirm crop → compress → upload → save URL
  const handleCropConfirm = async () => {
    if (!member || !cropImageSrc || !croppedAreaPixels) return

    setUploading(true)
    setError('')

    try {
      // 1) crop square image
      const croppedBlob = await getCroppedImgAsBlob(cropImageSrc, croppedAreaPixels)

      // 2) compress
      const compressed = await compressImage(croppedBlob, 600, 600, 0.7)

      // 3) single path per user
      const filePath = `avatars/${member.user_id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: true, // overwrite any previous file for this user
        })

      if (uploadError) {
        console.error('Profile image upload failed:', uploadError)
        throw uploadError
      }

      // 4) get public URL
      const { data: publicData } = supabase.storage
  .from('profile-images')
  .getPublicUrl(filePath)

// Base public URL from Supabase
let url = publicData?.publicUrl || null

// Add a version query param so browsers treat each upload as a new resource
if (url) {
  url = `${url}?v=${Date.now()}`
}

const { error: updateError } = await supabase
  .from('members')
  .update({ profile_image_url: url })
  .eq('user_id', member.user_id)

if (updateError) {
  console.error('Profile image DB update failed:', updateError)
  throw updateError
}

setMember((prev) => (prev ? { ...prev, profile_image_url: url } : prev))

      if (updateError) {
        console.error('Profile image DB update failed:', updateError)
        throw updateError
      }

      setMember((prev) => (prev ? { ...prev, profile_image_url: url } : prev))
      setCropModalOpen(false)
      setCropImageSrc(null)
      setCroppedAreaPixels(null)
    } catch (err) {
      console.error(err)
      setError('프로필 사진 변경 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // Delete profile image from storage and DB
  const handleDeleteProfileImage = async () => {
    if (!member) return

    setError('')
    setUploading(true)

    try {
      const filePath = `avatars/${member.user_id}.jpg`

      const { error: removeError } = await supabase.storage
        .from('profile-images')
        .remove([filePath])

      if (removeError) {
        console.error('Failed to delete profile image from storage:', removeError)
        // Even if storage delete fails, we still try to clear URL; but we treat it as error.
        throw removeError
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({ profile_image_url: null })
        .eq('id', member.id)

      if (updateError) {
        console.error('Failed to clear profile_image_url:', updateError)
        throw updateError
      }

      setMember((prev) => (prev ? { ...prev, profile_image_url: null } : prev))
    } catch (err) {
      console.error(err)
      setError('프로필 사진 삭제 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    )
  }

  const initials = [member?.first_name, member?.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('')

  const hasProfileImage = !!member?.profile_image_url
  const avatarColor = getAvatarColor(member?.user_id || member?.email || '')

  return (
    <div className="flex flex-col bg-gray-50" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button
          onClick={() => navigate('/member')}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={18} weight="bold" />
        </button>
        <h1 className="font-semibold text-gray-900 text-sm">설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-md mx-auto space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-4">
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border border-white/60 shadow-sm"
              style={{
                backgroundColor: hasProfileImage ? '#ffffff' : avatarColor,
              }}
            >
              {hasProfileImage ? (
                <img
                  src={member.profile_image_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : initials ? (
                <span className="text-white font-bold text-2xl">{initials}</span>
              ) : (
                <UserCircle size={42} weight="fill" color="#ffffff" />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {member?.first_name} {member?.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-1">{member?.email}</p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Buttons */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {uploading ? '업로드 중...' : '프로필 사진 변경'}
            </button>

            {hasProfileImage && (
              <button
                type="button"
                onClick={handleDeleteProfileImage}
                disabled={uploading}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-xs font-medium disabled:opacity-60"
              >
                프로필 사진 삭제
              </button>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center mt-1">{error}</p>
            )}
          </div>

          {/* More settings sections can go here later */}

          {/* Logout */}
          <div className="pt-4 pb-6">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-sm font-semibold text-red-500 text-center"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Crop modal */}
      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              프로필 사진 자르기
            </h2>
            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCropModalOpen(false)
                  setCropImageSrc(null)
                  setCroppedAreaPixels(null)
                }}
                className="px-3 py-1.5 rounded-full text-xs text-gray-500 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium disabled:opacity-60"
              >
                {uploading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}