import { ChartLine, Money, Star, FireSimple } from '@phosphor-icons/react'
import { useActivityStats } from '../hooks/useActivityStats'

export default function ActivityStatsCard({ userId }) {
  const { stats, loading } = useActivityStats(userId)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ChartLine size={16} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900 text-sm">
          이번 달 활동
        </h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 bg-gray-100 rounded animate-pulse"
              style={{ width: `${60 + i * 10}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <StatRow
            icon={Money}
            label="받은 할인"
            value={stats.discountCount}
            unit="회"
          />
          <StatRow
            icon={Star}
            label="남긴 리뷰"
            value={stats.reviewCount}
            unit="개"
          />
          <StatRow
            icon={FireSimple}
            label="연속 방문"
            value={stats.streakDays}
            unit="일"
            highlight={stats.streakDays >= 3}
          />
        </div>
      )}
    </div>
  )
}

function StatRow({ icon: Icon, label, value, unit, highlight = false }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon size={15} />
        <span className="text-gray-600">{label}</span>
      </div>
      <span className={'font-semibold ' + (highlight ? 'text-orange-500' : 'text-gray-900')}>
        {value} <span className="font-normal text-gray-400">{unit}</span>
      </span>
    </div>
  )
}
