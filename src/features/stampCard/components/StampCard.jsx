import { Octagon } from '@phosphor-icons/react'

const SIZES = {
  mini: {
    cardWidth: 120,
    iconSize: 11,
    padding: 6,
    titleFont: '10px',
    subtitleFont: '9px',
    rewardFont: '9px',
    showDates: false,
    dateFont: '0px',
    stampGap: 3,
  },
  full: {
    cardWidth: '100%',
    iconSize: 24,
    padding: 14,
    titleFont: '15px',
    subtitleFont: '12px',
    rewardFont: '13px',
    showDates: true,
    dateFont: '9px',
    stampGap: 6,
  },
}

export default function StampCard({ config, visits = [], size = 'full', isCardFull = false }) {
  if (!config) return null

  const s = SIZES[size] ?? SIZES.full
  const hasWallpaper = !!config.wallpaper_url
  const stampsPerRow = Math.max(
    1,
    Math.min(config.stamps_per_row || config.total_stamps, config.total_stamps),
  )

  const slots = Array.from({ length: config.total_stamps }, (_, i) => ({
    filled: i < visits.length,
    date: i < visits.length ? visits[i].visited_at?.slice(0, 10) : null,
  }))

  const accentBg = hasWallpaper ? 'transparent' : config.accent_color
  const whiteBg = hasWallpaper ? 'transparent' : '#ffffff'

  const cardStyle = {
    position: 'relative',
    width: s.cardWidth,
    aspectRatio: '1.586 / 1',
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    display: 'grid',
    gridTemplateRows: '25% 55% 20%',
    ...(isCardFull && {
      boxShadow: `0 0 0 2.5px ${config.accent_color}, 0 2px 8px rgba(0,0,0,0.12)`,
    }),
  }

  return (
    <div style={cardStyle}>
      {hasWallpaper && (
        <img
          src={config.wallpaper_url}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: whiteBg,
          padding: `${Math.round(s.padding * 0.7)}px ${s.padding}px`,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {config.title && (
          <p style={{
            margin: 0,
            fontWeight: 600,
            fontSize: s.titleFont,
            color: '#111827',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {config.title}
          </p>
        )}
        {config.subtitle && (
          <p style={{
            margin: 0,
            fontSize: s.subtitleFont,
            color: '#6b7280',
            lineHeight: 1.15,
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {config.subtitle}
          </p>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${Math.round(s.padding * 0.55)}px ${s.padding}px`,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stampsPerRow}, minmax(${s.iconSize}px, max-content))`,
            justifyContent: 'center',
            alignContent: 'center',
            gap: s.stampGap,
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
          }}
        >
          {slots.map((slot, i) => (
            <SlotItem
              key={i}
              slot={slot}
              iconSize={s.iconSize}
              textColor={config.text_color}
              showDates={s.showDates}
              dateFont={s.dateFont}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: whiteBg,
          padding: `${Math.round(s.padding * 0.45)}px ${s.padding}px`,
          textAlign: 'center',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <p style={{
          margin: 0,
          fontSize: s.rewardFont,
          fontWeight: isCardFull ? 700 : 500,
          color: isCardFull ? config.accent_color : '#374151',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {config.reward_text || (isCardFull ? '리워드를 획득하셨어요' : '')}
        </p>
      </div>
    </div>
  )
}

function SlotItem({ slot, iconSize, textColor, showDates, dateFont }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: iconSize }}>
      <Octagon
        size={iconSize}
        weight={slot.filled ? 'fill' : 'regular'}
        color={textColor}
        style={{ opacity: slot.filled ? 1 : 0.25, display: 'block', flexShrink: 0 }}
      />
      {showDates && slot.filled && slot.date && (
        <span style={{ fontSize: dateFont, color: textColor, lineHeight: 1, whiteSpace: 'nowrap' }}>
          {slot.date}
        </span>
      )}
    </div>
  )
}
