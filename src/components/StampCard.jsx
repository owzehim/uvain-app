import { Octagon } from '@phosphor-icons/react'

const SIZES = {
  mini: {
    cardWidth: 120,
    iconSize: 12,
    padding: 6,
    borderRadius: 12,
    stampAreaMin: 60,
    titleFont: '10px',
    subtitleFont: '9px',
    rewardFont: '9px',
    showDates: false,
    dateFont: '0px',
  },
  full: {
    cardWidth: '100%',
    iconSize: 26,
    padding: 14,
    borderRadius: 16,
    stampAreaMin: 120,
    titleFont: '15px',
    subtitleFont: '12px',
    rewardFont: '13px',
    showDates: true,
    dateFont: '9px',
  },
}

export default function StampCard({ config, visits = [], size = 'full', isCardFull = false }) {
  if (!config) return null

  const s = SIZES[size] ?? SIZES.full
  const hasWallpaper = !!config.wallpaper_url
  const hasHeader = !!(config.title || config.subtitle)
  const hasFooter = isCardFull || !!(config.reward_text)

  const slots = Array.from({ length: config.total_stamps }, (_, i) => ({
    filled: i < visits.length,
    date: i < visits.length ? visits[i].visited_at?.slice(0, 10) : null,
  }))

  // Accent color at 85% opacity over wallpaper
  const accentBg = hasWallpaper
    ? hexToRgba(config.accent_color, 0.85)
    : config.accent_color

  const whiteBg = hasWallpaper ? 'rgba(255,255,255,0.85)' : '#ffffff'

  const cardStyle = {
    position: 'relative',
    width: s.cardWidth,
    borderRadius: s.borderRadius,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    ...(isCardFull && {
      boxShadow: `0 0 0 2.5px ${config.accent_color}, 0 4px 18px rgba(0,0,0,0.13)`,
    }),
  }

  return (
    <div style={cardStyle}>
      {/* Wallpaper layer */}
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

      {/* Section 1 — Header */}
      {hasHeader && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: whiteBg,
            padding: `${s.padding}px ${s.padding}px ${Math.round(s.padding * 0.6)}px`,
          }}
        >
          {config.title && (
            <p style={{
              margin: 0,
              fontWeight: 600,
              fontSize: s.titleFont,
              color: '#111827',
              lineHeight: 1.3,
            }}>
              {config.title}
            </p>
          )}
          {config.subtitle && (
            <p style={{
              margin: 0,
              fontSize: s.subtitleFont,
              color: '#6b7280',
              lineHeight: 1.3,
              marginTop: 2,
            }}>
              {config.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Section 2+3 — Stamp area */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: accentBg,
          minHeight: s.stampAreaMin,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: s.padding,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: size === 'mini' ? 3 : 6,
            maxWidth: '100%',
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

      {/* Section 4 — Footer */}
      {hasFooter && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: whiteBg,
            padding: `${Math.round(s.padding * 0.6)}px ${s.padding}px ${s.padding}px`,
            textAlign: 'center',
          }}
        >
          <p style={{
            margin: 0,
            fontSize: s.rewardFont,
            fontWeight: isCardFull ? 700 : 500,
            color: isCardFull ? config.accent_color : '#374151',
            lineHeight: 1.4,
          }}>
            {config.reward_text || (isCardFull ? '리워드를 획득하셨습니다' : '')}
          </p>
        </div>
      )}
    </div>
  )
}

function SlotItem({ slot, iconSize, textColor, showDates, dateFont }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Octagon
        size={iconSize}
        weight={slot.filled ? 'fill' : 'regular'}
        color={textColor}
        style={{ opacity: slot.filled ? 1 : 0.25, display: 'block' }}
      />
      {showDates && slot.filled && slot.date && (
        <span style={{ fontSize: dateFont, color: textColor, lineHeight: 1 }}>
          {slot.date}
        </span>
      )}
    </div>
  )
}

// Converts a hex color string to rgba(r, g, b, alpha)
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
