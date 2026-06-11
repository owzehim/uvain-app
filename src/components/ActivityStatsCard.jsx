import { ChartLine, Money, Star, FireSimple } from '@phosphor-icons/react'
import { useActivityStats } from '../hooks/useActivityStats'

const W = 'calc(100vw - 32px)'

export default function ActivityStatsCard({ userId }) {
  const { stats, loading } = useActivityStats(userId)

  return (
    <div
      style={{
        width: W,
        margin: '0 auto',
        background: '#2C2A27',
        borderRadius: '16px',
        padding: '20px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <ChartLine size={16} color="#F6F4F1" />
        <h3 style={{ fontFamily: '"Handjet", system-ui, sans-serif', fontWeight: 700, fontSize: '15px', color: '#F6F4F1', letterSpacing: '0.04em', margin: 0 }}>
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
  )
}

function StatRow({ icon: Icon, label, value, unit, highlight = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={15} color="rgba(246,244,241,0.6)" />
        <span style={{ color: 'rgba(246,244,241,0.7)', fontFamily: '"Handjet", system-ui, sans-serif', letterSpacing: '0.03em' }}>
          {label}
        </span>
      </div>
      <span style={{
        fontWeight: 700,
        fontFamily: '"Handjet", system-ui, sans-serif',
        letterSpacing: '0.04em',
        color: highlight ? '#f97316' : '#F6F4F1',
      }}>
        {value}{' '}
        <span style={{ fontWeight: 400, color: 'rgba(246,244,241,0.4)' }}>{unit}</span>
      </span>
    </div>
  )
}
