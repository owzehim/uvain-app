import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CaretLeft, SignOut, Trash, UserCircle } from '@phosphor-icons/react'
import Cropper from 'react-easy-crop'
import { supabase } from '../lib/supabase'

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
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          resolve(blob)
        }, 'image/jpeg', quality)
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.src = url
  })
}

async function getCroppedImgAsBlob(imageSrc, pixelCrop) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  canvas
    .getContext('2d')
    .drawImage(
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
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.95)
  })
}

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

  const closeCropper = () => {
    setCropModalOpen(false)
    setCropImageSrc(null)
    setCroppedAreaPixels(null)
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
        .from('profile-images')
        .upload(filePath, compressed, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)
      let url = publicData?.publicUrl || null
      if (url) url = `${url}?v=${Date.now()}`

      const { error: updateError } = await supabase
        .from('members')
        .update({ profile_image_url: url })
        .eq('user_id', member.user_id)
      if (updateError) throw updateError

      setMember((prev) => (prev ? { ...prev, profile_image_url: url } : prev))
      closeCropper()
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
      const { error: removeError } = await supabase.storage
        .from('profile-images')
        .remove([filePath])
      if (removeError) throw removeError

      const { error: updateError } = await supabase
        .from('members')
        .update({ profile_image_url: null })
        .eq('id', member.id)
      if (updateError) throw updateError

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    )
  }

  const hasProfileImage = !!member?.profile_image_url
  const avatarSeed = `${member?.first_name || ''}${member?.last_name || ''}`
  const pastelBg = getPastelColor(avatarSeed)

  return (
    <div className="no-highlight-zone flex min-h-[100dvh] flex-col bg-white">
      <style>{`
        .no-highlight-zone,
        .no-highlight-zone * {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

      <header
        className="flex flex-shrink-0 items-center justify-between px-5 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/member')}
            className="-ml-1 rounded-full p-1 text-gray-700 hover:bg-gray-100"
            aria-label="뒤로"
          >
            <CaretLeft size={30} weight="regular" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">설정</h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500"
          aria-label="로그아웃"
        >
          <SignOut size={22} weight="bold" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5">
        <section className="mx-auto flex w-full max-w-sm flex-col items-center pt-[10vh]">
          <div className="relative">
            <div
              style={{
                width: '112px',
                height: '112px',
                borderRadius: '50%',
                background: hasProfileImage ? 'transparent' : pastelBg,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(44,42,39,0.08)',
              }}
            >
              {hasProfileImage ? (
                <img
                  src={member.profile_image_url}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <UserCircle size="72%" weight="fill" color="rgba(44,42,39,0.55)" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-gray-900 bg-white text-gray-900 shadow-sm disabled:opacity-60"
              aria-label="프로필 사진 변경"
            >
              <Camera size={19} weight="fill" />
            </button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {member?.first_name} {member?.last_name}
            </p>
            <p className="mt-1 text-sm text-gray-400">{member?.email}</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-10 w-full space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 disabled:opacity-60"
            >
              <Camera size={18} weight="fill" />
              {uploading ? '업로드 중...' : '프로필 사진 변경'}
            </button>

            {hasProfileImage && (
              <button
                type="button"
                onClick={handleDeleteProfileImage}
                disabled={uploading}
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-500 disabled:opacity-60"
              >
                <Trash size={18} weight="bold" />
                프로필 사진 삭제
              </button>
            )}
          </div>

          {error && <p className="mt-4 text-center text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-12 w-full rounded-full bg-gray-100 py-3.5 text-center text-sm font-semibold text-red-500"
          >
            로그아웃
          </button>
        </section>
      </main>

      {cropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">프로필 사진 자르기</h2>
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-900">
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

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeCropper}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
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
