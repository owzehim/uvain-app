import { useState, useRef } from 'react'

export function ImageReorder({ images, onReorder, onDelete, label = '기존 사진' }) {
  const dragIndex = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  if (!images || images.length === 0) return null

  const handleDragStart = (i) => { dragIndex.current = i }
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOver(i) }
  const handleDrop = (i) => {
    if (dragIndex.current === null || dragIndex.current === i) { setDragOver(null); return }
    const reordered = [...images]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(i, 0, moved)
    onReorder(reordered)
    dragIndex.current = null
    setDragOver(null)
  }
  const handleDragEnd = () => { dragIndex.current = null; setDragOver(null) }

  // Touch drag support
  const touchStartPos = useRef(null)
  const touchDragIndex = useRef(null)

  const handleTouchStart = (e, i) => {
    touchDragIndex.current = i
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e, i) => {
    if (touchDragIndex.current === null || touchDragIndex.current === i) return
    const reordered = [...images]
    const [moved] = reordered.splice(touchDragIndex.current, 1)
    reordered.splice(i, 0, moved)
    onReorder(reordered)
    touchDragIndex.current = null
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label} ({images.length}장) — 드래그로 순서 변경</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            onTouchStart={e => handleTouchStart(e, i)}
            onTouchEnd={e => handleTouchEnd(e, i)}
            className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
            style={{
              outline: dragOver === i ? '2px solid #3b82f6' : 'none',
              borderRadius: '8px',
              opacity: dragIndex.current === i ? 0.5 : 1,
              transition: 'opacity 0.15s'
            }}>
            <img src={url} className="h-20 w-20 object-cover rounded-lg select-none" draggable={false} />
            <div className="absolute top-0 left-0 bg-black bg-opacity-40 text-white text-xs w-5 h-5 flex items-center justify-center rounded-tl-lg rounded-br-lg">
              {i + 1}
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(url)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
