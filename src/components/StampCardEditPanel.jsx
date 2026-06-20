
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, UploadSimple, Trash } from '@phosphor-icons/react'
import { fetchConfigBySpot, upsertConfig, uploadWallpaper, deleteWallpaper } from '../api/stampCardConfig'
import StampCard from './StampCard'

const DEFAULT_CONFIG = {
  total_stamps: 10,
  stamps_per_row: 5,
  title: '',
  subtitle: '',
  reward_text: '',
  accent_color: '#ef4444',
  text_color: '#ffffff',
  wallpaper_url: null,
}

const PREVIEW_VISITS = [
  { visited_at: '2026-05-10T12:00:00Z' },
  { visited_at: '2026-05-24T09:30:00Z' },
  { visited_at: '2026-06-03T18:45:00Z' },
]

export default function StampCardEditPanel({ restaurantId, spotName, onClose }) {
  const [savedConfig, setSavedConfig] = useState(null)
  const [draft, setDraft] = useState(DEFAULT_CONFIG)
  const [slideIn, setSlideIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Slide-up on mount
  useEffect(() => {
    const t = setTimeout(() => setSlideIn(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Load existing config
  useEffect(() => {
    if (!restaurantId) return
    fetchConfigBySpot(restaurantId).then((config) => {
      const base = config ?? DEFAULT_CONFIG
      setSavedConfig(base)
      setDraft({ ...DEFAULT_CONFIG, ...base })
    })
  }, [restaurantId])

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedConfig ?? DEFAULT_CONFIG)

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const handleBack = () => {
    if (isDirty && !window.confirm('저장하지 않고 나가시겠어요?')) return
    onClose()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await upsertConfig(restaurantId, draft)
      onClose()
    } catch (e) {
      console.error('upsertConfig error:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleWallpaperChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const publicUrl = await uploadWallpaper(restaurantId, file)
      set('wallpaper_url', publicUrl)
    } catch (e) {
      console.error('uploadWallpaper error:', e)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteWallpaper = async () => {
    if (!draft.wallpaper_url) return
    try {
      await deleteWallpaper(draft.wallpaper_url)
      set('wallpaper_url', null)
    } catch (e) {
      console.error('deleteWallpaper error:', e)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        transform: slideIn ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-gray-600 text-sm font-medium"
        >
          <ArrowLeft size={18} weight="bold" />
          스탬프 카드 편집
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: saving ? '#9ca3af' : '#f97316' }}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 max-w-3xl mx-auto">

          {/* ── Left: form fields ── */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {spotName}
            </p>

            <Field label="총 스탬프 수">
              <input
                type="number"
                min="1"
                value={draft.total_stamps}
                onChange={(e) => set('total_stamps', Math.max(1, parseInt(e.target.value) || 1))}
                className="input-base"
              />
            </Field>

            <Field label="행당 스탬프 수">
              <input
                type="number"
                min="1"
                value={draft.stamps_per_row}
                onChange={(e) => set('stamps_per_row', Math.max(1, parseInt(e.target.value) || 1))}
                onBlur={() => {
                  if (draft.stamps_per_row > draft.total_stamps) {
                    set('stamps_per_row', draft.total_stamps)
                  }
                }}
                className="input-base"
              />
            </Field>

            <Field label="카드 제목 (선택)">
              <input
                type="text"
                placeholder="카드 제목 (선택)"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="부제목 (선택)">
              <input
                type="text"
                placeholder="부제목 (선택)"
                value={draft.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="리워드 문구 (선택)">
              <input
                type="text"
                placeholder="예: 음료 1잔 무료"
                value={draft.reward_text}
                onChange={(e) => set('reward_text', e.target.value)}
                className="input-base"
              />
            </Field>

            <div className="flex gap-4">
              <Field label="강조 색상">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.accent_color}
                    onChange={(e) => set('accent_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                  />
                  <span className="text-xs text-gray-500 font-mono">{draft.accent_color}</span>
                </div>
              </Field>

              <Field label="텍스트 색상">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.text_color}
                    onChange={(e) => set('text_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                  />
                  <span className="text-xs text-gray-500 font-mono">{draft.text_color}</span>
                </div>
              </Field>
            </div>

            {/* Wallpaper */}
            <Field label="배경 이미지 (선택)">
              {draft.wallpaper_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={draft.wallpaper_url}
                    alt="wallpaper"
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    onClick={handleDeleteWallpaper}
                    className="flex items-center gap-1.5 text-xs text-red-500 font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50"
                  >
                    <Trash size={14} weight="bold" />
                    삭제
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                >
                  <UploadSimple size={16} weight="bold" />
                  {uploading ? '업로드 중...' : '이미지 업로드'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleWallpaperChange}
              />
            </Field>
          </div>

          {/* ── Right: live preview ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              미리보기
            </p>
            <StampCard
              size="full"
              config={draft}
              visits={PREVIEW_VISITS}
              isCardFull={false}
            />
            <p className="text-xs text-gray-400 text-center">
              실제 카드는 멤버의 방문 기록에 따라 표시됩니다
            </p>
          </div>

        </div>
      </div>

      {/* Tailwind inline styles for inputs */}
      <style>{`
        .input-base {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: #111827;
          outline: none;
          background: #fff;
        }
        .input-base:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 2px rgba(249,115,22,0.15);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
