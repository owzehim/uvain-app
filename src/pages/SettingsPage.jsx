// src/pages/SettingsPage.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserCircle, ArrowLeft } from '@phosphor-icons/react'
import Cropper from 'react-easy-crop'

// ─── Pastel avatar (must match MemberPage) ───────────────────────────────────
const PASTEL_COLORS = [
  '#FFB3B3',
  '#FFD9A0',
  '#FFF3A0',
  '#B3F0C2',
  '#A8D8FF',
  '#C5B3FF',
  '#FFB3E6',
  '#B3F0EE',
]

function getPastelColor(seed) {
  const str = seed || 'default'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

// ─── Image helpers ────────────────────────────────────────────────────────────

async function compressImage(file, maxWidth = 600, maxHeight = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) { reject(new Error('Failed to compress image')); return }
          resolve(blob)
        }, 'image/jpeg', quality)
      } catch (e) { URL.revokeObjectURL(url); reject(e) }
    }
    img.src = url
  })
}

async function getCroppedImgAsBlob(imageSrc, pixelCrop) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  canvas.getContext('2d').drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas is empty')); return }
      resolve(blob)
    }, 'image/jpeg', 0.95)
  })
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { navigate('/login'); return }
      const { data: memberData, error: memberError } = await supabase
        .from('members').select('*').eq('user_id', user.id).maybeSingle()
      if (memberError) console.error('load member error:', memberError)
      setMember(memberData || null)
      setLoading(false)
    }
    load()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
    e.target.value = ''
  }

  const handleCropConfirm = async () => {
    if (!member || !cropImageSrc || !croppedAreaPixels) return
    setUploading(true)
    setError('')
    try {
      const croppedBlob = await getCroppedImgAsBlob(cropImageSrc, croppedAreaPixels)
      const compressed = await compressImage(croppedBlob, 600, 600, 0.7)
      const filePath = `avatars/${member.user_id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('profile-images').upload(filePath, compressed, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError
      const { data: publicData } = supabase.storage.from('profile-images').getPublicUrl(filePath)
      let url = publicData?.publicUrl || null
      if (url) url = `${url}?v=${Date.now()}`
      const { error: updateError } = await supabase
        .from('members').update({ profile_image_url: url }).eq('user_id', member.user_id)
      if (updateError) throw updateError
      setMember((prev) => prev ? { ...prev, profile_image_url: url } : prev)
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

  const handleDeleteProfileImage = async () => {
    if (!member) return
    setError('')
    setUploading(true)
    try {
      const filePath = `avatars/${member.user_id}.jpg`
      const { error: removeError } = await supabase.storage.from('profile-images').remove([filePath])
      if (removeError) throw removeError
      const { error: updateError } = await supabase
        .from('members').update({ profile_image_url: null }).eq('id', member.id)
      if (updateError) throw updateError
      setMember((prev) => prev ? { ...prev, profile_image_url: null } : prev)
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

  const hasProfileImage = !!member?.profile_image_url
  const avatarSeed = `${member?.first_name || ''}${member?.last_name || ''}`
  const pastelBg = getPastelColor(avatarSeed)

  return (
    <div
      className="flex flex-col bg-gray-50 no-highlight-zone"
      style={{
        minHeight: '100dvh',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`
        .no-highlight-zone,
        .no-highlight-zone * {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      {/* Header */}
      <div
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button onClick={() => navigate('/member')} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} weight="bold" />
        </button>
        <h1 className="font-semibold text-gray-900 text-sm">설정</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-md mx-auto space-y-6">

          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-4">

            {/* Avatar — matches MembershipCard exactly */}
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: hasProfileImage ? 'transparent' : pastelBg,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {hasProfileImage ? (
                <img
                  src={member.profile_image_url}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <UserCircle size="72%" weight="fill" color="rgba(44,42,39,0.55)" />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {member?.first_name} {member?.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-1">{member?.email}</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

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

            {error && <p className="text-xs text-red-500 text-center mt-1">{error}</p>}
          </div>

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
            <h2 className="text-sm font-semibold text-gray-900 mb-1">프로필 사진 자르기</h2>
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
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setCropImageSrc(null); setCroppedAreaPixels(null) }}
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
