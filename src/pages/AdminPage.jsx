import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member')} className="text-sm text-gray-500 hover:text-gray-700">← 내 QR</button>
          <h1 className="font-bold text-gray-900">관리자 패널</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-gray-500 hover:text-gray-700">로그아웃</button>
      </div>
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {[{ key: 'members', label: '멤버 관리' }, { key: 'events', label: '이벤트' }, { key: 'restaurants', label: '장소' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'restaurants' && <RestaurantsTab />}
      </div>
    </div>
  )
}

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
    if (ref.current && value === '') {
      ref.current.innerHTML = ''
    }
  }, [value])

  const exec = (cmd, val = null) => {
    ref.current.focus()
    document.execCommand(cmd, false, val)
    onChange(ref.current.innerHTML)
  }

  const handleInput = () => onChange(ref.current.innerHTML)

  const applyColor = (color) => {
    exec('foreColor', color)
    setShowColors(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-visible">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold') }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded font-bold hover:bg-gray-100">B</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic') }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded italic hover:bg-gray-100">I</button>
        <div className="relative">
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(v => !v) }}
            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">🎨</button>
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
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}
          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-500">✕</button>
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

function koreanSort(arr, key) {
  return [...arr].sort((a, b) => (a[key] || '').localeCompare(b[key] || '', ['ko', 'en']))
}

function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    return Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => chars[b % 32]).join('')
  }

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.full_name || !form.student_number || !form.major) { alert('모든 항목을 입력해주세요.'); return }
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authError) { alert('계정 생성 실패: ' + authError.message); return }
    const userId = authData.user?.id
    if (!userId) { alert('유저 ID를 가져오지 못했습니다.'); return }
    const { error: memberError } = await supabase.from('members').insert({ user_id: userId, full_name: form.full_name, student_number: form.student_number, major: form.major, is_member: form.is_member, membership_valid_until: form.membership_valid_until || null, totp_secret: generateSecret() })
    if (memberError) { alert('멤버 추가 실패: ' + memberError.message); return }
    alert('멤버 추가 완료')
    setShowForm(false)
    setForm({ email: '', password: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
    fetchMembers()
  }

  const handleEdit = async () => {
    const { error } = await supabase.from('members').update({ full_name: form.full_name, student_number: form.student_number, major: form.major, is_member: form.is_member, membership_valid_until: form.membership_valid_until || null }).eq('id', editTarget.id)
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
    setForm({ full_name: member.full_name, student_number: member.student_number, major: member.major, is_member: member.is_member, membership_valid_until: member.membership_valid_until || '' })
    setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ email: '', password: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
    setShowForm(true)
  }

  const sorted = koreanSort(members, 'full_name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">멤버 목록 ({members.length}명)</h2>
        {!showForm && <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 멤버 추가</button>}
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '멤버 수정' : '새 멤버 추가'}</h3>
          {!editTarget && (
            <>
              <input placeholder="이메일" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="비밀번호" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </>
          )}
          <input placeholder="이름" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="학번" value={form.student_number} onChange={e => setForm({ ...form, student_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="전공" value={form.major} onChange={e => setForm({ ...form, major: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_member" checked={form.is_member} onChange={e => setForm({ ...form, is_member: e.target.checked })} />
            <label htmlFor="is_member" className="text-sm text-gray-700">멤버십 활성화</label>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">유효기간</label>
            <input type="date" value={form.membership_valid_until} onChange={e => setForm({ ...form, membership_valid_until: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={editTarget ? handleEdit : handleAdd} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">{editTarget ? '수정 완료' : '추가'}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-200">취소</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-gray-500 text-sm">로딩 중...</p> : members.length === 0 ? <p className="text-gray-500 text-sm">멤버가 없어요.</p> : (
        <div className="space-y-2">
          {sorted.map(member => (
            <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                <p className="text-xs text-gray-500">{member.student_number} · {member.major}</p>
                <p className="text-xs text-gray-400">유효기간: {member.membership_valid_until || '없음'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.is_member ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{member.is_member ? '활성' : '비활성'}</span>
                <button onClick={() => openEdit(member)} className="text-xs text-blue-600 hover:underline">수정</button>
                <button onClick={() => handleDelete(member.id)} className="text-xs text-red-500 hover:underline">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EventsTab() {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '', instagram_url: '' })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [uploading, setUploading] = useState(false)

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true })
    setEvents(data || [])
  }

  const handleDeleteEventImage = async (url) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    const fileName = url.split('/').pop()
    await supabase.storage.from('event-images').remove([fileName])
    const newUrls = (editTarget['image_urls'] || []).filter(u => u !== url)
    await supabase.from('events').update({ image_urls: newUrls }).eq('id', editTarget.id)
    setEditTarget({ ...editTarget, image_urls: newUrls })
  }

  useEffect(() => { fetchEvents() }, [])

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleSave = async () => {
    if (!form.title) { alert('제목을 입력해주세요.'); return }
    setUploading(true)
    let image_urls = editTarget?.image_urls || []
    if (imageFiles.length > 0) {
      const uploaded = []
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + fileExt
        const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file)
        if (uploadError) { alert('업로드 실패: ' + uploadError.message); setUploading(false); return }
        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(fileName)
        uploaded.push(urlData.publicUrl)
      }
      image_urls = [...image_urls, ...uploaded]
    }
    const payload = { ...form, image_urls }
    if (editTarget) { await supabase.from('events').update(payload).eq('id', editTarget.id) }
    else { await supabase.from('events').insert(payload) }
    setUploading(false); setShowForm(false); setEditTarget(null)
    setForm({ title: '', description: '', event_date: '', location: '', instagram_url: '' })
    setImageFiles([]); setImagePreviews([]); fetchEvents()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const openEdit = (event) => {
    setEditTarget(event)
    setForm({ title: event.title, description: event.description || '', event_date: event.event_date ? event.event_date.slice(0, 16) : '', location: event.location || '', instagram_url: event.instagram_url || '' })
    setImageFiles([]); setImagePreviews([]); setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ title: '', description: '', event_date: '', location: '', instagram_url: '' })
    setImageFiles([]); setImagePreviews([]); setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">이벤트 관리</h2>
        {!showForm && <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 이벤트 추가</button>}
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '이벤트 수정' : '새 이벤트'}</h3>
          <input placeholder="이벤트 제목" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-xs text-gray-400 block mb-1">내용</label>
            <textarea placeholder="내용" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <input placeholder="장소" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">날짜</label>
              <input type="date" value={form.event_date ? form.event_date.slice(0, 10) : ''} onChange={e => setForm({ ...form, event_date: e.target.value + 'T' + (form.event_date ? form.event_date.slice(11, 16) : '00:00') })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">시간 (예: 18:30)</label>
              <input type="text" placeholder="18:30" value={form.event_date ? form.event_date.slice(11, 16) : ''} onChange={e => setForm({ ...form, event_date: (form.event_date ? form.event_date.slice(0, 10) : new Date().toISOString().slice(0, 10)) + 'T' + e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <input placeholder="인스타그램 URL (선택)" value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-sm text-gray-500 block mb-1">이미지 (여러장 선택 가능)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            {imagePreviews.length > 0 && <div className="flex gap-2 mt-2 overflow-x-auto">{imagePreviews.map((src, i) => <img key={i} src={src} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />)}</div>}
            {editTarget && editTarget['image_urls'] && editTarget['image_urls'].length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">기존 이미지 ({editTarget['image_urls'].length}장)</p>
                <div className="flex gap-2 overflow-x-auto">
                  {editTarget['image_urls'].map((url, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img src={url} className="h-20 w-20 object-cover rounded-lg" />
                      <button onClick={() => handleDeleteEventImage(url)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={uploading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">{uploading ? '업로드 중...' : (editTarget ? '수정 완료' : '추가')}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button>
          </div>
        </div>
      )}
      {events.length === 0 ? <p className="text-gray-500 text-sm">이벤트가 없어요.</p> : (() => {
        const grouped = {}
        events.forEach(ev => {
          const key = ev.event_date ? new Date(ev.event_date).toLocaleString('ko-KR', { year: 'numeric', month: 'long' }) : '날짜 미정'
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(ev)
        })
        return Object.entries(grouped).map(([month, evs]) => (
          <div key={month} className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">{month}</p>
            {evs.map(event => (
              <div key={event.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                    {event.location && <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>}
                    {event.event_date && <p className="text-xs text-gray-400 mt-0.5">{new Date(event.event_date).toLocaleString('ko-KR')}</p>}
                    {event['image_urls'] && event['image_urls'].length > 0 && <p className="text-xs text-gray-400 mt-0.5">{'사진 ' + event['image_urls'].length + '장'}</p>}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => openEdit(event)} className="text-xs text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(event.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      })()}
    </div>
  )
}

const SPOT_CATEGORIES = ['맛집', '카페', '마트', '스터디', '학교', '의료', '운동', '미용/뷰티', '여가', '쇼핑', '기타']

function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', map_label: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', rating: '', review: '', reviewer_name: '', category: '맛집', subcategory: '', price_range: '', is_sponsored: false, discount_terms: '' })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [richEditorKey, setRichEditorKey] = useState(0)

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    setRestaurants(data || [])
  }

  useEffect(() => { fetchRestaurants() }, [])

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleDeleteExistingImage = async (url) => {
    if (!confirm('이 사진을 삭제할까요?')) return
    const fileName = url.split('/').pop()
    await supabase.storage.from('place-images').remove([fileName])
    const newUrls = (editTarget.image_urls || []).filter(u => u !== url)
    await supabase.from('restaurants').update({ image_urls: newUrls }).eq('id', editTarget.id)
    setEditTarget({ ...editTarget, image_urls: newUrls })
  }

  const handleSave = async () => {
    if (!form.name) { alert('장소 이름을 입력해주세요.'); return }
    setUploading(true)
    let image_urls = editTarget?.image_urls || []
    if (imageFiles.length > 0) {
      const uploaded = []
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + fileExt
        const { error: uploadError } = await supabase.storage.from('place-images').upload(fileName, file)
        if (uploadError) { alert('업로드 실패: ' + uploadError.message); setUploading(false); return }
        const { data: urlData } = supabase.storage.from('place-images').getPublicUrl(fileName)
        uploaded.push(urlData.publicUrl)
      }
      image_urls = [...image_urls, ...uploaded]
    }
    const payload = {
      name: form.name,
      map_label: form.map_label,
      description: form.description,
      address: form.address,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      discount_info: form.discount_info,
      discount_terms: form.discount_terms,
      rating: form.rating ? parseFloat(form.rating) : 0,
      review: form.review,
      reviewer_name: form.reviewer_name,
      category: form.category,
      subcategory: form.subcategory,
      price_range: form.price_range,
      is_sponsored: form.is_sponsored,
      image_urls,
    }
    let saveError = null
    if (editTarget) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editTarget.id)
      saveError = error
    } else {
      const { error } = await supabase.from('restaurants').insert(payload)
      saveError = error
    }
    if (saveError) { alert('저장 실패: ' + saveError.message); setUploading(false); return }
    setUploading(false)
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', map_label: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', rating: '', review: '', reviewer_name: '', category: '맛집', subcategory: '', price_range: '', is_sponsored: false, discount_terms: '' })
    setImageFiles([])
    setImagePreviews([])
    setRichEditorKey(k => k + 1)
    fetchRestaurants()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('restaurants').delete().eq('id', id)
    fetchRestaurants()
  }

  const openEdit = (r) => {
    setEditTarget(r)
    setForm({ name: r.name, map_label: r.map_label || '', description: r.description || '', address: r.address || '', latitude: r.latitude || '', longitude: r.longitude || '', discount_info: r.discount_info || '', rating: r.rating || '', review: r.review || '', reviewer_name: r.reviewer_name || '', category: r.category || '맛집', subcategory: r.subcategory || '', price_range: r.price_range || '', is_sponsored: r.is_sponsored || false, discount_terms: r.discount_terms || '' })
    setRichEditorKey(k => k + 1)
    setImageFiles([]); setImagePreviews([]); setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ name: '', map_label: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', rating: '', review: '', reviewer_name: '', category: '맛집', subcategory: '', price_range: '', is_sponsored: false, discount_terms: '' })
    setRichEditorKey(k => k + 1)
    setImageFiles([]); setImagePreviews([]); setShowForm(true)
  }

  const sorted = koreanSort(restaurants, 'name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">장소 관리</h2>
        {!showForm && <button onClick={openAdd} className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600">+ 장소 추가</button>}
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '장소 수정' : '새 장소 추가'}</h3>
          <input placeholder="장소 이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="지도 표시 이름 (짧게, 예: 교자상)" value={form.map_label} onChange={e => setForm({ ...form, map_label: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: '' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            {SPOT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div>
            <label className="text-xs text-gray-400 block mb-1">설명</label>
            <textarea placeholder="설명" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <input placeholder="주소" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input placeholder="위도 (예: 52.3676)" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="경도 (예: 4.9041)" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">할인 정보</label>
            <RichEditor key={richEditorKey} value={form.discount_info} onChange={v => setForm(f => ({ ...f, discount_info: v }))} placeholder="할인 정보 (예: 10% 할인)" rows={2} />
          </div>
          <input placeholder="할인 조건 (예: 주말 제외, 1인 1회 한정)" value={form.discount_terms} onChange={e => setForm({ ...form, discount_terms: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="평점 (0~5)" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.price_range} onChange={e => setForm({ ...form, price_range: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">가격대 선택</option>
            <option value="€">€ (저렴)</option>
            <option value="€€">€€ (보통)</option>
            <option value="€€€">€€€ (비쌈)</option>
            <option value="€€€€">€€€€ (고급)</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_sponsored" checked={form.is_sponsored} onChange={e => setForm({ ...form, is_sponsored: e.target.checked })} />
            <label htmlFor="is_sponsored" className="text-sm text-gray-700">🟠 제휴/스폰서 장소</label>
          </div>
          <input placeholder="리뷰어 이름" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-xs text-gray-400 block mb-1">리뷰</label>
            <textarea placeholder="리뷰" value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">사진 추가 (여러장 가능)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            {imagePreviews.length > 0 && <div className="flex gap-2 mt-2 overflow-x-auto">{imagePreviews.map((src, i) => <img key={i} src={src} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />)}</div>}
          </div>
          {editTarget && editTarget.image_urls && editTarget.image_urls.length > 0 && (
            <div>
              <label className="text-sm text-gray-500 block mb-1">기존 사진 ({editTarget.image_urls.length}장)</label>
              <div className="flex gap-2 overflow-x-auto">
                {editTarget.image_urls.map((url, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={url} className="h-20 w-20 object-cover rounded-lg" />
                    <button onClick={() => handleDeleteExistingImage(url)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={uploading} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm hover:bg-orange-600 disabled:opacity-50">{uploading ? '업로드 중...' : (editTarget ? '수정 완료' : '추가')}</button>
            <button onClick={() => { setShowForm(false); setEditTarget(null) }} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button>
          </div>
        </div>
      )}
      {restaurants.length === 0 ? <p className="text-gray-500 text-sm">등록된 장소가 없어요.</p> : (() => {
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
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                      {r.is_sponsored && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">제휴</span>}
                    </div>
                    {r.address && <p className="text-xs text-gray-500 mt-0.5">📍 {r.address}</p>}
                    {r.discount_info && <p className="text-xs text-orange-500 mt-0.5">🎟 {r.discount_info.replace(/<[^>]+>/g, '')}</p>}
                    {r.rating > 0 && <p className="text-xs text-amber-500 mt-0.5">★ {r.rating}</p>}
                    {r['image_urls'] && r['image_urls'].length > 0 && <p className="text-xs text-gray-400 mt-0.5">{'사진 ' + r['image_urls'].length + '장'}</p>}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      })()}
    </div>
  )
}