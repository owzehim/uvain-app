import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('members')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!data) { navigate('/member'); return }
      setIsAdmin(true)
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
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/member')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 내 QR
          </button>
          <h1 className="font-bold text-gray-900">관리자 패널</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {[
          { key: 'members', label: '멤버 관리' },
          { key: 'events', label: '이벤트' },
          { key: 'restaurants', label: '맛집' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'restaurants' && <RestaurantsTab />}
      </div>
    </div>
  )
}

/* ───────────────────────────────
   멤버 관리 탭
─────────────────────────────── */
function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', student_number: '',
    major: '', is_member: true, membership_valid_until: ''
  })

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    return Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => chars[b % 32]).join('')
  }

  const handleAdd = async () => {
    if (!form.email || !form.password || !form.full_name || !form.student_number || !form.major) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.admin
      ? await supabase.auth.signUp({ email: form.email, password: form.password })
      : await supabase.auth.signUp({ email: form.email, password: form.password })

    if (authError) { alert('계정 생성 실패: ' + authError.message); return }

    const userId = authData.user?.id
    if (!userId) { alert('유저 ID를 가져오지 못했습니다.'); return }

    const { error: memberError } = await supabase.from('members').insert({
      user_id: userId,
      full_name: form.full_name,
      student_number: form.student_number,
      major: form.major,
      is_member: form.is_member,
      membership_valid_until: form.membership_valid_until || null,
      totp_secret: generateSecret()
    })

    if (memberError) { alert('멤버 추가 실패: ' + memberError.message); return }

    alert('멤버가 추가됐어요!')
    setShowForm(false)
    setForm({ email: '', password: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
    fetchMembers()
  }

  const handleEdit = async () => {
    const { error } = await supabase
      .from('members')
      .update({
        full_name: form.full_name,
        student_number: form.student_number,
        major: form.major,
        is_member: form.is_member,
        membership_valid_until: form.membership_valid_until || null,
      })
      .eq('id', editTarget.id)

    if (error) { alert('수정 실패: ' + error.message); return }
    alert('수정 완료')
    setEditTarget(null)
    setShowForm(false)
    fetchMembers()
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제할까요?')) return
    await supabase.from('members').delete().eq('id', id)
    fetchMembers()
  }

  const openEdit = (member) => {
    setEditTarget(member)
    setForm({
      full_name: member.full_name,
      student_number: member.student_number,
      major: member.major,
      is_member: member.is_member,
      membership_valid_until: member.membership_valid_until || '',
    })
    setShowForm(true)
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ email: '', password: '', full_name: '', student_number: '', major: '', is_member: true, membership_valid_until: '' })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">멤버 목록 ({members.length}명)</h2>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 멤버 추가
        </button>
      </div>

      {/* 멤버 추가/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '멤버 수정' : '새 멤버 추가'}</h3>

          {!editTarget && (
            <>
              <input
                placeholder="이메일"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="비밀번호"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </>
          )}

          <input
            placeholder="이름"
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="학번"
            value={form.student_number}
            onChange={e => setForm({ ...form, student_number: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="전공"
            value={form.major}
            onChange={e => setForm({ ...form, major: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_member"
              checked={form.is_member}
              onChange={e => setForm({ ...form, is_member: e.target.checked })}
            />
            <label htmlFor="is_member" className="text-sm text-gray-700">멤버십 활성화</label>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">유효기간</label>
            <input
              type="date"
              value={form.membership_valid_until}
              onChange={e => setForm({ ...form, membership_valid_until: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={editTarget ? handleEdit : handleAdd}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700"
            >
              {editTarget ? '수정 완료' : '추가'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 멤버 목록 */}
      {loading ? (
        <p className="text-gray-500 text-sm">로딩 중...</p>
      ) : members.length === 0 ? (
        <p className="text-gray-500 text-sm">멤버가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                <p className="text-xs text-gray-500">{member.student_number} · {member.major}</p>
                <p className="text-xs text-gray-400">유효기간: {member.membership_valid_until || '없음'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  member.is_member ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {member.is_member ? '활성' : '비활성'}
                </span>
                <button
                  onClick={() => openEdit(member)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────────
   이벤트 탭
─────────────────────────────── */
function EventsTab() {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '' })

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true })
    setEvents(data || [])
  }

  useEffect(() => { fetchEvents() }, [])

  const handleSave = async () => {
    if (!form.title) { alert('제목을 입력해주세요.'); return }

    if (editTarget) {
      await supabase.from('events').update(form).eq('id', editTarget.id)
    } else {
      await supabase.from('events').insert(form)
    }

    setShowForm(false)
    setEditTarget(null)
    setForm({ title: '', description: '', event_date: '', location: '' })
    fetchEvents()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const openEdit = (event) => {
    setEditTarget(event)
    setForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date ? event.event_date.slice(0, 16) : '',
      location: event.location || ''
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">이벤트 관리</h2>
        <button
          onClick={() => { setEditTarget(null); setForm({ title: '', description: '', event_date: '', location: '' }); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 이벤트 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '이벤트 수정' : '새 이벤트'}</h3>
          <input
            placeholder="이벤트 제목"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="내용"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <input
            placeholder="장소"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div>
            <label className="text-sm text-gray-500 block mb-1">날짜/시간</label>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={e => setForm({ ...form, event_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">
              {editTarget ? '수정 완료' : '추가'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">
              취소
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">이벤트가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                  {event.location && <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>}
                  {event.event_date && <p className="text-xs text-gray-400 mt-0.5">{new Date(event.event_date).toLocaleString('ko-KR')}</p>}
                  {event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openEdit(event)} className="text-xs text-blue-600 hover:underline">수정</button>
                  <button onClick={() => handleDelete(event.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────────
   맛집 탭
─────────────────────────────── */
function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', address: '',
    latitude: '', longitude: '', discount_info: '',
    rating: '', review: '', reviewer_name: ''
  })

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    setRestaurants(data || [])
  }

  useEffect(() => { fetchRestaurants() }, [])

  const handleSave = async () => {
    if (!form.name) { alert('맛집 이름을 입력해주세요.'); return }

    const payload = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      rating: form.rating ? parseFloat(form.rating) : 0,
    }

    if (editTarget) {
      await supabase.from('restaurants').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('restaurants').insert(payload)
    }

    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', rating: '', review: '', reviewer_name: '' })
    fetchRestaurants()
  }

  const handleDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    await supabase.from('restaurants').delete().eq('id', id)
    fetchRestaurants()
  }

  const openEdit = (r) => {
    setEditTarget(r)
    setForm({
      name: r.name, description: r.description || '',
      address: r.address || '', latitude: r.latitude || '',
      longitude: r.longitude || '', discount_info: r.discount_info || '',
      rating: r.rating || '', review: r.review || '', reviewer_name: r.reviewer_name || ''
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">맛집 관리</h2>
        <button
          onClick={() => { setEditTarget(null); setForm({ name: '', description: '', address: '', latitude: '', longitude: '', discount_info: '', rating: '', review: '', reviewer_name: '' }); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 맛집 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-medium text-gray-900">{editTarget ? '맛집 수정' : '새 맛집 추가'}</h3>
          <input placeholder="맛집 이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="설명" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="주소" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input placeholder="위도 (예: 52.3676)" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="경도 (예: 4.9041)" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input placeholder="할인 정보 (예: 10% 할인)" value={form.discount_info} onChange={e => setForm({ ...form, discount_info: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="평점 (0~5)" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="리뷰어 이름" value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="리뷰" value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">{editTarget ? '수정 완료' : '추가'}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">취소</button>
          </div>
        </div>
      )}

      {restaurants.length === 0 ? (
        <p className="text-gray-500 text-sm">등록된 맛집이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {restaurants.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                  {r.address && <p className="text-xs text-gray-500 mt-0.5">📍 {r.address}</p>}
                  {r.discount_info && <p className="text-xs text-blue-600 mt-0.5">🎟 {r.discount_info}</p>}
                  {r.rating > 0 && <p className="text-xs text-amber-500 mt-0.5">★ {r.rating}</p>}
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">수정</button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}