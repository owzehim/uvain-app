import { ChartLine, Money, Star, FireSimple, MapPin } from '@phosphor-icons/react'
import { useActivityStats } from '../hooks/useActivityStats'
import { useRecentVisits } from '../hooks/useRecentVisits'

const W = 'calc(100vw - 56px)'

export default function ActivityStatsCard({ userId }) {
  const { stats, loading } = useActivityStats(userId)
  const { visits, loading: visitsLoading } = useRecentVisits(userId)

  return (
    <>
      {/* 기존 "이번 달 활동" 카드 */}
      <div
        style={{
          width: W,
          margin: '0 auto',
          background: '#111827',
          borderRadius: '16px',
          padding: '20px 24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <ChartLine size={16} color="#F6F4F1" />
          <h3
            style={{
              fontFamily: '"Handjet", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '15px',
              color: '#F6F4F1',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            이번 달 활동
          </h3>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[70, 80, 60].map((w, i) => (
              <div
                key={i}
                style={{
                  height: '14px',
                  width: `${w}%`,
                  background: 'rgba(246,244,241,0.1)',
                  borderRadius: '6px',
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <StatRow icon={Money}      label="받은 할인" value={stats.discountCount} unit="회" />
            <StatRow icon={Star}       label="남긴 리뷰" value={stats.reviewCount}   unit="개" />
            <StatRow icon={FireSimple} label="연속 방문" value={stats.streakDays}    unit="일" highlight={stats.streakDays >= 3} />
          </div>
        )}
      </div>

      {/* 새로운 "최근 방문" 카드 */}
      <RecentVisitsCard visits={visits} loading={visitsLoading} />
    </>
  )
}

function StatRow({ icon: Icon, label, value, unit, highlight = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={15} color="rgba(246,244,241,0.6)" />
        <span
          style={{
            color: 'rgba(246,244,241,0.7)',
            fontFamily: '"Handjet", system-ui, sans-serif',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontWeight: 700,
          fontFamily: '"Handjet", system-ui, sans-serif',
          letterSpacing: '0.04em',
          color: highlight ? '#f97316' : '#F6F4F1',
        }}
      >
        {value}{' '}
        <span
          style={{
            fontWeight: 400,
            fontFamily: '"Handjet", system-ui, sans-serif',
            color: 'rgba(246,244,241,0.4)',
          }}
        >
          {unit}
        </span>
      </span>
    </div>
  )
}

function RecentVisitsCard({ visits, loading }) {
  return (
    <div
      style={{
        width: W,
        margin: '12px auto 0',
        background: '#111827',
        borderRadius: '16px',
        padding: '16px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <MapPin size={16} color="#F6F4F1" />
        <h3
          style={{
            fontFamily: '"Handjet", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '15px',
            color: '#F6F4F1',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          최근 방문
        </h3>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[100, 90, 80].map((w, i) => (
            <div
              key={i}
              style={{
                height: '12px',
                width: `${w}%`,
                background: 'rgba(246,244,241,0.1)',
                borderRadius: '6px',
              }}
            />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(246,244,241,0.6)',
            margin: 0,
          }}
        >
          최근 방문 내역이 없습니다
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {visits.slice(0, 3).map((v, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  color: '#F6F4F1',
                  fontFamily: '"Handjet", system-ui, sans-serif',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginRight: '8px',
                }}
              >
                {v.placeName}
              </span>
              <span
                style={{
                  color: 'rgba(246,244,241,0.5)',
                  fontFamily: '"Handjet", system-ui, sans-serif',
                  letterSpacing: '0.03em',
                  flexShrink: 0,
                }}
              >
                {formatVisitDate(v.redeemedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatVisitDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}