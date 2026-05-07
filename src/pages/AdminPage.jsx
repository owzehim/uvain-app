import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ImageCropper } from '../components/ImageCropper'
import { Plus, Eye, EyeSlash, MapPin, Ticket } from 'phosphor-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Supabase/ISO datetime string to a local "YYYY-MM-DD" date string.
 * Avoids the UTC-offset bug where .slice(0,10) on a UTC string gives the wrong date.
 */
function toLocalDateString(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Convert a Supabase/ISO datetime string to a local "HH:MM" time string.
 * Avoids the UTC-offset bug.
 */
function toLocalTimeString(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

/**
 * Combine a local date string "YYYY-MM-DD" and time string "HH:MM"
 * into a local ISO-like string "YYYY-MM-DDTHH:MM" suitable for storing.
 */
function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return ''
  return `${dateStr}T${timeStr || '00:00'}`
}

/**
 * Validate and normalise a typed time string.
 * Accepts "HH:MM", "H:MM", "HHMM" → returns "HH:MM" or '' if invalid.
 */
function normaliseTime(raw) {
  const s = raw.trim().replace(/[^0-9:]/g, '')
  // "HHMM" → "HH:MM"
  const noColon = s.replace(':', '')
  if (noColon.length === 4) {
    const h = parseInt(noColon.slice(0, 2), 10)
    const m = parseInt(noColon.slice(2, 4), 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  // "H:MM" or "HH:MM"
  const parts = s.split(':')
  if (parts.length === 2) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return ''
}

function koreanSort(arr, key) {
  return [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || '', ['ko', 'en']))
}

// ─── Time Input ───────────────────────────────────────────────────────────────
/**
 * A plain text input for time that works identically on desktop and mobile.
 * - Desktop: type freely, e.g. "14:30" or "1430"
 * - Mobile: numeric keyboard, no native scroll picker → no accidental close bug
 * Normalises on blur. Shows red border if the typed value is not valid HH:MM.
 */
function TimeInput({ value, onChange, className = '' }) {
  const [draft, setDraft] = useState(value || '')
  const [error, setError] = useState(false)

  // Keep draft in sync when parent resets the value
  useEffect(() => { setDraft(value || '') }, [value])

  const handleChange = (e) => {
    setDraft(e.target.value)
    setError(false)
  }

  const handleBlur = () => {
    if (draft === '') { onChange(''); setError(false); return }
    const normalised = normaliseTime(draft)
    if (normalised) {
      setDraft(normalised)
      setError(false)
      onChange(normalised)
    } else {
      setError(true)
      // Don't update parent with invalid value
    }
  }

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`${className} ${error ? 'border-red-400 bg-red-50' : ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">올바른 시간 형식을 입력하세요 (예: 14:30)</p>}
    </div>
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('members')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data } = await supabase.from('admin_roles').select('id').eq('user_id', user.id).single()
      if (!data) { navigate('/member'); return }
      setLoading(false)
    }
    checkAdmin()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member')} className="text-sm text-gray-500 hover:text-gray-700">← 내 QR</button>
          <h1 className="font-bold text-gray-900">관리자 패널</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-gray-700">로그아웃</button>
      </div>
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        {[{ key: 'members', label: '멤버 관리' }, { key: 'events', label: '이벤트' }, { key: 'restaurants', label: '장소' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="w-full px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'restaurants' && <RestaurantsTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
const COLORS = ['#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff']

function RichEditor({ value, onChange, placeholder, rows = 3 }) {
  const ref = useRef(null)
  const [showColors, setShowColors] = useState(false)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (ref.current && !isInitialized.current) {
      ref.current.innerHTML = value || ''
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    if (ref.current && value === '') ref.current.innerHTML = ''
  }, [value])

  const exec = (cmd, val = null) => {
    ref.current.focus()
    document.execCommand(cmd, false, val)
    onChange(ref.current.innerHTML)
  }
  const handleInput = () => onChange(ref.current.innerHTML)
  const applyColor = (color) => { exec('foreColor', color); setShowColors(false) }

  return (
    <div className="border border-gray-200 rounded-lg overflow-visible">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold') }} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded font-bold hover:bg-gray-100">B</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic') }} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded italic hover:bg-gray-100">I</button>
        <div className="relative">
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(v => !v) }} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">🎨</button>
          {showColors && (
            <div className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-lg flex gap-1 flex-wrap" style={{ width: '120px' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onMouseDown={e => { e.preventDefault(); applyColor(c) }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('removeFormat') }} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-500">✕</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm outline-none"
        style={{ minHeight: `${rows * 1.5}rem`, whiteSpace: 'pre-wrap', overflowY: 'auto', direction: 'ltr', unicodeBidi: 'plaintext' }}
      />
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#9ca3af}`}</style>
    </div>
  )
}
function ImageUploadPanel({
  imagePreviews,
  existingUrls,
  pendingReplacements,
  onAddFile,
  onAddCropped,
  onRemoveNew,
  onRemoveExisting,
  onPendingReplace,
  onReorder,
}) {
  const [cropperSource, setCropperSource] = useState(null)
  const dragIdx = useRef(null)

  const handleFileSelect = (e) => {
    Array.from(e.target.files).forEach(f => onAddFile(f))
    e.target.value = ''
  }

  const handleFileSelectForCrop = (e) => {
    if (e.target.files[0]) setCropperSource({ type: 'file', file: e.target.files[0] })
    e.target.value = ''
  }

  const handleTapExisting = (idx) => {
    setCropperSource({ type: 'url', url: existingUrls[idx], idx })
  }

  const handleCropDone = (croppedFile) => {
    if (cropperSource?.type === 'url') {
      const previewUrl = URL.createObjectURL(croppedFile)
      onPendingReplace(cropperSource.idx, croppedFile, previewUrl)
    } else {
      onAddCropped(croppedFile)
    }
    setCropperSource(null)
  }

  const handleDragStart = (idx) => { dragIdx.current = idx }
  const handleDrop = (idx) => {
    if (dragIdx.current === null || dragIdx.current === idx) return
    const reordered = [...(existingUrls || [])]
    const [moved] = reordered.splice(dragIdx.current, 1)
    reordered.splice(idx, 0, moved)
    onReorder && onReorder(reordered)
    dragIdx.current = null
  }

  const getDisplayUrl = (idx) => {
    const pending = pendingReplacements?.find(p => p.idx === idx)
    return pending ? pending.previewUrl : existingUrls[idx]
  }

  return (
    <div className="space-y-3">
      {(existingUrls?.length > 0 || imagePreviews.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {existingUrls?.map((_, idx) => (
            <div
              key={`ex-${idx}`}
              className="relative group cursor-grab"
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
            >
              <img
                src={getDisplayUrl(idx)}
                alt=""
                onClick={() => handleTapExisting(idx)}
                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors pointer-events-none flex items-center justify-center">
                <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 drop-shadow">✂️</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveExisting(existingUrls[idx])}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
              >✕</button>
            </div>
          ))}
          {imagePreviews.map((preview, idx) => (
            <div key={`new-${idx}`} className="relative">
              <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg border-2 border-blue-200" />
              <button
                type="button"
                onClick={() => onRemoveNew(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {existingUrls?.length > 0 && (
        <p className="text-xs text-gray-400">💡 기존 사진을 탭하면 자를 수 있어요 · 드래그로 순서 변경</p>
      )}

      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 text-center hover:border-gray-400 transition-colors">
            <p className="text-xs font-medium text-gray-600">📁 그냥 업로드</p>
            <p className="text-xs text-gray-400 mt-0.5">자르기 없이</p>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        </label>
        <label className="flex-1 cursor-pointer">
          <div className="border-2 border-dashed border-blue-300 rounded-lg px-3 py-3 text-center hover:border-blue-400 transition-colors">
            <p className="text-xs font-medium text-blue-600">✂️ 자르기 업로드</p>
            <p className="text-xs text-gray-400 mt-0.5">비율 선택 후 자르기</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileSelectForCrop} />
        </label>
      </div>

      {cropperSource && (
        <ImageCropper
          file={cropperSource.type === 'file' ? cropperSource.file : null}
          imageUrl={cropperSource.type === 'url' ? cropperSource.url : null}
          onCrop={handleCropDone}
          onCancel={() => setCropperSource(null)}
          aspectRatios={['1:1', '4:5']}
        />
      )}
    </div>
  )
}
function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', full_name: '',
    student_number: '', major: '', is_member: true, membership_valid_until: ''
  })
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchMembers() }, [])

  const checkPasswordStrength = (pwd) => {
    let s = 0
    if (pwd.length >= 8) s++
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) s++
    if (pwd.match(/[0-9]/)) s++
    if (pwd.match(/[^a-zA-Z0-9]/)) s++
    setPasswordStrength(s)
  }

  const generateRandomPassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) password += charset.charAt(Math.floor(Math.random() * charset.length))
    setForm(prev => ({ ...prev, password, confirmPassword: password }))
    checkPasswordStrength(password)
  }

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    return Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => chars[b % 32]).join('')
  }

  const validateForm = () => {
    if (!form.email || !form.password || !form.full_name || !form.student_number || !form.major) {
      alert('모든 필수 항목을 입력해주세요.'); return false
    }
    if (form.password !== form.confirmPassword) { alert('비밀번호가 일치하지 않습니다.'); return false }
    if (form.password.length < 8) { alert('비밀번호는 최소 8자 이상이어야 합니다.'); return false }
    if (!form.email.includes('@')) { alert('유효한 이메일을 입력해주세요.'); return false }
    return true
  }

  const handleAdd = async () => {
    if (!validateForm()) return
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (authError) { alert('계정 생성 실패: ' + authError.message); return }
      const userId = authData.user?.id
      if (!userId) { alert('유저 ID를 가져오지 못했습니다.'); return }
      const { error: memberError } = await supabase.from('members').insert({
        user_id: userId, full_name: form.full_name, student_number: form.student_number,
        major: form.major, is_member: form.is_member,
        membership_valid_until: form.membership_valid_until || null, totp_secret: generateSecret()
      })
      if (memberError) { alert('멤버 추가 실패: ' + memberError.message); return }
      setCreatedCredentials({ email: form.email, password: form.password, name: form.full_name })
      setShowForm(false)
      setForm({ email: '', password: '', confirmPassword: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
      setPasswordStrength(0)
      fetchMembers()
      setTimeout(() => setCreatedCredentials(null), 10000)
    } catch (error) { alert('오류 발생: ' + error.message) }
  }

  const handleEdit = async () => {
    const { error } = await supabase.from('members').update({
      full_name: form.full_name, student_number: form.student_number,
      major: form.major, is_member: form.is_member,
      membership_valid_until: form.membership_valid_until || null
    }).eq('id', editTarget.id)
    if (error) { alert('수정 실패: ' + error.message); return }
    alert('수정 완료')
    setEditTarget(null); setShowForm(false); fetchMembers()
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제할까요?')) return
    await supabase.from('members').delete().eq('id', id)
    fetchMembers()
  }

  const openEdit = (member) => {
    setEditTarget(member)
    setForm({
      email: '', password: '', confirmPassword: '',
      full_name: member.full_name, student_number: member.student_number,
      major: member.major, is_member: member.is_member,
      membership_valid_until: member.membership_valid_until || ''
    })
    setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ email: '', password: '', confirmPassword: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
    setPasswordStrength(0); setShowForm(true)
  }

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert('복사되었습니다!') }
  const strengthColor = () => ['bg-red-200','bg-orange-200','bg-yellow-200','bg-lime-200','bg-green-200'][passwordStrength] || 'bg-gray-200'
  const strengthText = () => ['매우 약함','약함','보통','강함','매우 강함'][passwordStrength] || ''
  const sorted = koreanSort(members, 'full_name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">멤버 목록 ({members.length}명)</h2>
        {!showForm && (
          <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap">
            <Plus size={16} weight="bold" />멤버 추가
          </button>
        )}
      </div>

      {createdCredentials && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div><h3 className="font-semibold text-green-900">✓ 계정 생성 완료!</h3><p className="text-sm text-green-700 mt-1">아래 정보를 멤버에게 전달해주세요.</p></div>
            <button onClick={() => setCreatedCredentials(null)} className="text-green-600 text-xl">✕</button>
          </div>
          <div className="bg-white rounded-lg p-4 space-y-3 border border-green-100">
            <div><p className="text-xs text-gray-500 mb-1">이메일</p><div className="flex items-center gap-2"><code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm font-mono">{createdCredentials.email}</code><button onClick={() => copyToClipboard(createdCredentials.email)} className="text-blue-600 text-sm px-3 py-2 bg-blue-50 rounded whitespace-nowrap">복사</button></div></div>
            <div><p className="text-xs text-gray-500 mb-1">비밀번호</p><div className="flex items-center gap-2"><code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm font-mono">{createdCredentials.password}</code><button onClick={() => copyToClipboard(createdCredentials.password)} className="text-blue-600 text-sm px-3 py-2 bg-blue-50 rounded whitespace-nowrap">복사</button></div></div>
            <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">ℹ️ 이 정보는 10초 후 자동으로 사라집니다.</p>
          </div>
        </div>
      )}

      {showForm && !editTarget && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-medium text-gray-900">새 멤버 추가</h3>
          <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
            <p className="font-medium text-blue-900 text-sm">🔐 로그인 정보</p>
            <div><label className="text-sm text-gray-700 block mb-1">이메일</label><input placeholder="member@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            <div>
              <div className="flex items-center justify-between mb-1"><label className="text-sm text-gray-700">비밀번호</label><button type="button" onClick={generateRandomPassword} className="text-xs text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">🎲 자동 생성</button></div>
              <div className="relative">
                <input placeholder="최소 8자 이상" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); checkPasswordStrength(e.target.value) }} type={showPassword ? 'text' : 'password'} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-500">{showPassword ? <Eye size={16} /> : <EyeSlash size={16} />}</button>
              </div>
              {form.password && <div className="mt-2 flex items-center gap-2"><div className={`h-2 flex-1 rounded-full ${strengthColor()}`} /><span className="text-xs text-gray-600 whitespace-nowrap">{strengthText()}</span></div>}
            </div>
            <div><label className="text-sm text-gray-700 block mb-1">비밀번호 확인</label><input placeholder="비밀번호 재입력" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} type={showPassword ? 'text' : 'password'} className={`w-full border rounded-lg px-3 py-2 text-sm ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />{form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-red-600 mt-1">비밀번호가 일치하지 않습니다</p>}</div>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-gray-900 text-sm">👤 멤버 정보</p>
            <div><label className="text-sm text-gray-700 block mb-1">이름 *</label><input placeholder="홍길동" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-sm text-gray-700 block mb-1">학번 *</label><input placeholder="2024001" value={form.student_number} onChange={e => setForm({ ...form, student_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm text-gray-700 block mb-1">전공 *</label><input placeholder="컴퓨터과학" value={form.major} onChange={e => setForm({ ...form, major: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="is_member" checked={form.is_member} onChange={e => setForm({ ...form, is_member: e.target.checked })} /><label htmlFor="is_member" className="text-sm text-gray-700">멤버십 활성화</label></div>
            <div><label className="text-sm text-gray-500 block mb-1">유효기간</label><input type="date" value={form.membership_valid_until} onChange={e => setForm({ ...form, membership_valid_until: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2 pt-2"><button onClick={handleAdd} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 font-medium">멤버 추가</button><button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button></div>
        </div>
      )}

      {loading ? <p className="text-gray-500 text-sm">로딩 중...</p> : members.length === 0 ? <p className="text-gray-500 text-sm">멤버가 없어요.</p> : (
        <div className="space-y-2">
          {sorted.map(member => (
            <div key={member.id}>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                    <p className="text-xs text-gray-500">{member.student_number} · {member.major}</p>
                    <p className="text-xs text-gray-400">유효기간: {member.membership_valid_until || '없음'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${member.is_member ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{member.is_member ? '활성' : '비활성'}</span>
                    <button onClick={() => openEdit(member)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">수정</button>
                    <button onClick={() => handleDelete(member.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">삭제</button>
                  </div>
                </div>
              </div>
              {showForm && editTarget && editTarget.id === member.id && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 mt-2">
                  <h3 className="font-medium text-gray-900">멤버 수정</h3>
                  <div><label className="text-sm text-gray-700 block mb-1">이름 *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-sm text-gray-700 block mb-1">학번 *</label><input value={form.student_number} onChange={e => setForm({ ...form, student_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="text-sm text-gray-700 block mb-1">전공 *</label><input value={form.major} onChange={e => setForm({ ...form, major: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  </div>
                  <div className="flex items-center gap-2"><input type="checkbox" id={`ism_${member.id}`} checked={form.is_member} onChange={e => setForm({ ...form, is_member: e.target.checked })} /><label htmlFor={`ism_${member.id}`} className="text-sm text-gray-700">멤버십 활성화</label></div>
                  <div><label className="text-sm text-gray-500 block mb-1">유효기간</label><input type="date" value={form.membership_valid_until} onChange={e => setForm({ ...form, membership_valid_until: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  <div className="flex gap-2"><button onClick={handleEdit} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 font-medium">수정 완료</button><button onClick={() => { setShowForm(false); setEditTarget(null) }} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function EventsTab() {
  const [events, setEvents] = useState([])
  const [archivedEvents, setArchivedEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showArchivedList, setShowArchivedList] = useState(false)

  // Keep date and time as separate fields so neither clobbers the other on change
  const [form, setForm] = useState({
    title: '', description: '', eventDate: '', eventTime: '',
    location: '', instagram_url: ''
  })

  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [pendingReplacements, setPendingReplacements] = useState([])
  const [uploading, setUploading] = useState(false)
  const [richEditorKey, setRichEditorKey] = useState(0)

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('is_archived', false).order('event_date', { ascending: true })
    setEvents(data || [])
  }
  const fetchArchivedEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('is_archived', true).order('event_date', { ascending: false })
    setArchivedEvents(data || [])
  }
  useEffect(() => { fetchEvents(); fetchArchivedEvents() }, [])

  const handleAddFile = (file) => {
    setImageFiles(prev => [...prev, file])
    setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
  }
  const handleAddCropped = (croppedFile) => {
    setImageFiles(prev => [...prev, croppedFile])
    setImagePreviews(prev => [...prev, URL.createObjectURL(croppedFile)])
  }
  const handleRemoveNew = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }
  const handleRemoveExisting = async (url) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    const fileName = url.split('/').pop()
    await supabase.storage.from('event-images').remove([fileName])
    const idx = (editTarget?.image_urls || []).indexOf(url)
    setPendingReplacements(prev => prev.filter(p => p.idx !== idx))
    setEditTarget(prev => ({ ...prev, image_urls: (prev.image_urls || []).filter(u => u !== url) }))
  }
  const handlePendingReplace = (idx, file, previewUrl) => {
    setPendingReplacements(prev => {
      const next = prev.filter(p => p.idx !== idx)
      return [...next, { idx, file, previewUrl }]
    })
  }
  const handleReorderImages = (reorderedUrls) => {
    if (editTarget) setEditTarget({ ...editTarget, image_urls: reorderedUrls })
  }

  const resetForm = () => {
    setShowForm(false); setEditTarget(null)
    setForm({ title: '', description: '', eventDate: '', eventTime: '', location: '', instagram_url: '' })
    setImageFiles([]); setImagePreviews([]); setPendingReplacements([]); setRichEditorKey(k => k + 1)
  }

  const handleSave = async () => {
    if (!form.title) { alert('제목을 입력해주세요.'); return }
    setUploading(true)

    // Combine local date + time back into a single string for storage
    const event_date = combineDateTime(form.eventDate, form.eventTime)

    let image_urls = [...(editTarget?.image_urls || [])]

    for (const { idx, file } of pendingReplacements) {
      const oldFileName = image_urls[idx]?.split('/').pop()
      if (oldFileName) await supabase.storage.from('event-images').remove([oldFileName])
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error } = await supabase.storage.from('event-images').upload(fileName, file)
      if (error) { alert('업로드 실패: ' + error.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(fileName)
      image_urls[idx] = urlData.publicUrl
    }

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file)
      if (uploadError) { alert('업로드 실패: ' + uploadError.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(fileName)
      image_urls = [...image_urls, urlData.publicUrl]
    }

    const payload = {
      title: form.title, description: form.description,
      event_date: event_date || null,
      location: form.location, instagram_url: form.instagram_url,
      image_urls
    }
    if (editTarget) {
      await supabase.from('events').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    setUploading(false); resetForm(); fetchEvents()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents(); fetchArchivedEvents()
  }
  const handleArchive = async (id) => {
    await supabase.from('events').update({ is_archived: true }).eq('id', id)
    fetchEvents(); fetchArchivedEvents()
  }
  const handleRestore = async (id) => {
    await supabase.from('events').update({ is_archived: false }).eq('id', id)
    fetchEvents(); fetchArchivedEvents()
  }

  const openEdit = (event) => {
    setEditTarget(event)
    setForm({
      title: event.title,
      description: event.description || '',
      // ✅ FIX: use local date/time helpers instead of raw .slice() on UTC string
      eventDate: toLocalDateString(event.event_date),
      eventTime: toLocalTimeString(event.event_date),
      location: event.location || '',
      instagram_url: event.instagram_url || ''
    })
    setImageFiles([]); setImagePreviews([]); setPendingReplacements([])
    setRichEditorKey(k => k + 1); setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ title: '', description: '', eventDate: '', eventTime: '', location: '', instagram_url: '' })
    setImageFiles([]); setImagePreviews([]); setPendingReplacements([])
    setRichEditorKey(k => k + 1); setShowForm(true)
  }

  const groupByMonth = (arr) => {
    const grouped = {}
    arr.forEach(ev => {
      const label = ev.event_date ? `${new Date(ev.event_date).getMonth() + 1}월` : '날짜 미정'
      if (!grouped[label]) grouped[label] = []
      grouped[label].push(ev)
    })
    return grouped
  }

  const EventForm = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 mt-2">
      <h3 className="font-medium text-gray-900">{editTarget ? '이벤트 수정' : '새 이벤트'}</h3>
      <input
        placeholder="이벤트 제목"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      <div>
        <label className="text-sm text-gray-500 block mb-1">내용</label>
        <RichEditor key={richEditorKey} value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="내용을 입력하세요" rows={3} />
      </div>
      <div>
        <label className="text-sm text-gray-500 block mb-1">장소</label>
        <RichEditor key={richEditorKey + 50} value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="장소를 입력하세요" rows={2} />
      </div>

      {/* ✅ FIX: separate date and time fields; time uses <TimeInput> (no scroll picker) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-500 block mb-1">날짜</label>
          <input
            type="date"
            value={form.eventDate}
            onChange={e => setForm({ ...form, eventDate: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">시간 (HH:MM)</label>
          <TimeInput
            value={form.eventTime}
            onChange={v => setForm({ ...form, eventTime: v })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <input
        placeholder="인스타그램 URL (선택)"
        value={form.instagram_url}
        onChange={e => setForm({ ...form, instagram_url: e.target.value })}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      <div>
        <label className="text-sm text-gray-500 block mb-1">사진</label>
        <ImageUploadPanel
          imagePreviews={imagePreviews}
          existingUrls={editTarget?.image_urls || []}
          pendingReplacements={pendingReplacements}
          onAddFile={handleAddFile}
          onAddCropped={handleAddCropped}
          onRemoveNew={handleRemoveNew}
          onRemoveExisting={handleRemoveExisting}
          onPendingReplace={handlePendingReplace}
          onReorder={handleReorderImages}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={uploading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
          {uploading ? '업로드 중...' : editTarget ? '수정 완료' : '추가'}
        </button>
        <button onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button>
      </div>
    </div>
  )

  const renderCard = (event, isArchived = false) => (
    <div key={event.id}>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm">{event.title}</p>
            {event.location && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <MapPin size={12} weight="fill" />{event.location.replace(/<[^>]+>/g, '')}
              </p>
            )}
            {event.event_date && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(event.event_date).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isArchived
              ? <>
                  <button onClick={() => handleRestore(event.id)} className="text-xs text-green-600 hover:underline whitespace-nowrap">복원</button>
                  <button onClick={() => openEdit(event)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">수정</button>
                  <button onClick={() => handleDelete(event.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">삭제</button>
                </>
              : <>
                  <button onClick={() => handleArchive(event.id)} className="text-xs text-green-600 hover:underline whitespace-nowrap">보관</button>
                  <button onClick={() => openEdit(event)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">수정</button>
                  <button onClick={() => handleDelete(event.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">삭제</button>
                </>
            }
          </div>
        </div>
      </div>
      {showForm && editTarget && editTarget.id === event.id && <EventForm />}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold text-gray-900">이벤트 관리</h2>
        <div className="flex gap-2">
          {showArchivedList
            ? <button onClick={() => setShowArchivedList(false)} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 whitespace-nowrap">← 이벤트 목록</button>
            : <button onClick={() => setShowArchivedList(true)} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 whitespace-nowrap">보관된 이벤트</button>
          }
          {!showForm && !showArchivedList && (
            <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap">
              <Plus size={16} weight="bold" />이벤트 추가
            </button>
          )}
        </div>
      </div>
      {showArchivedList ? (
        <div className="space-y-3">
          {archivedEvents.length === 0
            ? <p className="text-gray-500 text-sm">보관된 이벤트가 없어요.</p>
            : Object.entries(groupByMonth(archivedEvents)).map(([month, evs]) => (
              <div key={month} className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{month}</p>
                {evs.map(e => renderCard(e, true))}
              </div>
            ))
          }
        </div>
      ) : (
        <>
          {showForm && !editTarget && <EventForm />}
          {events.length === 0
            ? <p className="text-gray-500 text-sm">이벤트가 없어요.</p>
            : (
              <div className="space-y-3">
                {Object.entries(groupByMonth(events)).map(([month, evs]) => (
                  <div key={month} className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{month}</p>
                    {evs.map(e => renderCard(e, false))}
                  </div>
                ))}
              </div>
            )
          }
        </>
      )}
    </div>
  )
}
const SPOT_CATEGORIES = ['맛집', '카페', '마트', '스터디', '학교', '의료', '운동', '미용/뷰티', '여가', '쇼핑', '기타']

function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    name: '', map_label: '', description: '', address: '',
    latitude: '', longitude: '', discount_info: '', discount_terms: '',
    rating: '', review: '', reviewer_name: '', category: '맛집',
    price_range: '', is_sponsored: false
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [pendingReplacements, setPendingReplacements] = useState([])
  const [uploading, setUploading] = useState(false)
  const [richEditorKey, setRichEditorKey] = useState(0)

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    setRestaurants(data || [])
  }
  useEffect(() => { fetchRestaurants() }, [])

  const handleAddFile = (file) => {
    setImageFiles(prev => [...prev, file])
    setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
  }
  const handleAddCropped = (croppedFile) => {
    setImageFiles(prev => [...prev, croppedFile])
    setImagePreviews(prev => [...prev, URL.createObjectURL(croppedFile)])
  }
  const handleRemoveNew = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }
  const handleRemoveExisting = async (url) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    const fileName = url.split('/').pop()
    await supabase.storage.from('place-images').remove([fileName])
    const idx = (editTarget?.image_urls || []).indexOf(url)
    setPendingReplacements(prev => prev.filter(p => p.idx !== idx))
    setEditTarget(prev => ({ ...prev, image_urls: (prev.image_urls || []).filter(u => u !== url) }))
  }
  const handlePendingReplace = (idx, file, previewUrl) => {
    setPendingReplacements(prev => {
      const next = prev.filter(p => p.idx !== idx)
      return [...next, { idx, file, previewUrl }]
    })
  }
  const handleReorderImages = (reorderedUrls) => {
    if (editTarget) setEditTarget({ ...editTarget, image_urls: reorderedUrls })
  }

  const resetForm = () => {
    setShowForm(false); setEditTarget(null)
    setForm({
      name: '', map_label: '', description: '', address: '',
      latitude: '', longitude: '', discount_info: '', discount_terms: '',
      rating: '', review: '', reviewer_name: '', category: '맛집',
      price_range: '', is_sponsored: false
    })
    setImageFiles([]); setImagePreviews([]); setPendingReplacements([]); setRichEditorKey(k => k + 1)
  }

  const handleSave = async () => {
    if (!form.name) { alert('장소 이름을 입력해주세요.'); return }
    setUploading(true)
    let image_urls = [...(editTarget?.image_urls || [])]

    for (const { idx, file } of pendingReplacements) {
      const oldFileName = image_urls[idx]?.split('/').pop()
      if (oldFileName) await supabase.storage.from('place-images').remove([oldFileName])
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error } = await supabase.storage.from('place-images').upload(fileName, file)
      if (error) { alert('업로드 실패: ' + error.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('place-images').getPublicUrl(fileName)
      image_urls[idx] = urlData.publicUrl
    }

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('place-images').upload(fileName, file)
      if (uploadError) { alert('업로드 실패: ' + uploadError.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('place-images').getPublicUrl(fileName)
      image_urls = [...image_urls, urlData.publicUrl]
    }

    const payload = {
      name: form.name, map_label: form.map_label, description: form.description,
      address: form.address,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      discount_info: form.discount_info, discount_terms: form.discount_terms,
      rating: form.rating ? parseFloat(form.rating) : 0,
      review: form.review, reviewer_name: form.reviewer_name,
      category: form.category, price_range: form.price_range,
      is_sponsored: form.is_sponsored, image_urls
    }
    let saveError = null
    if (editTarget) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editTarget.id); saveError = error
    } else {
      const { error } = await supabase.from('restaurants').insert(payload); saveError = error
    }
    if (saveError) { alert('저장 실패: ' + saveError.message); setUploading(false); return }
    setUploading(false); resetForm(); fetchRestaurants()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('restaurants').delete().eq('id', id)
    fetchRestaurants()
  }

  const openEdit = (r) => {
    setEditTarget(r)
    setForm({
      name: r.name, map_label: r.map_label || '', description: r.description || '',
      address: r.address || '', latitude: r.latitude || '', longitude: r.longitude || '',
      discount_info: r.discount_info || '', discount_terms: r.discount_terms || '',
      rating: r.rating || '', review: r.review || '', reviewer_name: r.reviewer_name || '',
      category: r.category || '맛집', price_range: r.price_range || '',
      is_sponsored: r.is_sponsored || false
    })
    setRichEditorKey(k => k + 1); setImageFiles([]); setImagePreviews([]); setPendingReplacements([]); setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({
      name: '', map_label: '', description: '', address: '',
      latitude: '', longitude: '', discount_info: '', discount_terms: '',
      rating: '', review: '', reviewer_name: '', category: '맛집',
      price_range: '', is_sponsored: false
    })
    setRichEditorKey(k => k + 1); setImageFiles([]); setImagePreviews([]); setPendingReplacements([]); setShowForm(true)
  }

  const RestaurantForm = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 mt-2">
      <h3 className="font-medium text-gray-900">{editTarget ? '장소 수정' : '새 장소 추가'}</h3>
      <input placeholder="장소 이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <input placeholder="지도 표시 이름" value={form.map_label} onChange={e => setForm({ ...form, map_label: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
        {SPOT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <textarea placeholder="설명" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      <input placeholder="주소" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-sm text-gray-500 block mb-1">위도</label><input placeholder="위도" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-sm text-gray-500 block mb-1">경도</label><input placeholder="경도" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div><label className="text-sm text-gray-500 block mb-1">할인 정보</label><RichEditor key={richEditorKey} value={form.discount_info} onChange={v => setForm({ ...form, discount_info: v })} placeholder="할인 정보 (예: 10% 할인)" rows={2} /></div>
      <div><label className="text-sm text-gray-500 block mb-1">할인 조건</label><RichEditor key={richEditorKey + 100} value={form.discount_terms} onChange={v => setForm({ ...form, discount_terms: v })} placeholder="할인 조건 (예: 주말 제외)" rows={2} /></div>
      <input placeholder="평점 (0~5)" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <select value={form.price_range} onChange={e => setForm({ ...form, price_range: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">가격대 선택</option>
        <option value="€">€ (저렴)</option>
        <option value="€€">€€ (보통)</option>
        <option value="€€€">€€€ (비쌈)</option>
        <option value="€€€€">€€€€ (고급)</option>
      </select>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`sp_${editTarget ? 'edit' : 'add'}`} checked={form.is_sponsored} onChange={e => setForm({ ...form, is_sponsored: e.target.checked })} />
        <label htmlFor={`sp_${editTarget ? 'edit' : 'add'}`} className="text-sm text-gray-700 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />제휴/스폰서
        </label>
      </div>
      <input placeholder="리뷰어 이름" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <textarea placeholder="리뷰" value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      <div>
        <label className="text-sm text-gray-500 block mb-1">사진</label>
        <ImageUploadPanel
          imagePreviews={imagePreviews}
          existingUrls={editTarget?.image_urls || []}
          pendingReplacements={pendingReplacements}
          onAddFile={handleAddFile}
          onAddCropped={handleAddCropped}
          onRemoveNew={handleRemoveNew}
          onRemoveExisting={handleRemoveExisting}
          onPendingReplace={handlePendingReplace}
          onReorder={handleReorderImages}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={uploading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
          {uploading ? '업로드 중...' : editTarget ? '수정 완료' : '추가'}
        </button>
        <button onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button>
      </div>
    </div>
  )

  const sorted = koreanSort(restaurants, 'name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">장소 관리</h2>
        {!showForm && (
          <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap">
            <Plus size={16} weight="bold" />장소 추가
          </button>
        )}
      </div>

      {showForm && !editTarget && <RestaurantForm />}

      {restaurants.length === 0
        ? <p className="text-gray-500 text-sm">등록된 장소가 없어요.</p>
        : (() => {
          const grouped = {}
          sorted.forEach(r => {
            const key = r.category || '기타'
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(r)
          })
          return Object.entries(grouped).map(([cat, places]) => (
            <div key={cat} className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{cat} ({places.length})</p>
              {places.map(r => (
                <div key={r.id}>
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                          {r.is_sponsored && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">제휴</span>}
                        </div>
                        {r.address && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={12} weight="fill" /> {r.address}</p>}
                        {r.discount_info && <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1"><Ticket size={12} weight="fill" color="#FF5252" /> {r.discount_info.replace(/<[^>]+>/g, '')}</p>}
                        {r.rating > 0 && <p className="text-xs text-amber-500 mt-0.5">★ {r.rating}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">수정</button>
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline whitespace-nowrap">삭제</button>
                      </div>
                    </div>
                  </div>
                  {showForm && editTarget && editTarget.id === r.id && <RestaurantForm />}
                </div>
              ))}
            </div>
          ))
        })()
      }
    </div>
  )
}