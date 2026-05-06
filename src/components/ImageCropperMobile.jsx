import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, Plus, Minus } from 'phosphor-react'

export function ImageCropperMobile({ file, imageUrl, onCrop, onCancel, aspectRatios = ['원본', '1:1', '4:5'] }) {
  const [selectedRatio, setSelectedRatio] = useState('원본')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPinchDist, setLastPinchDist] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)

  const CANVAS_SIZE = 320

  const ratioMap = {
    '원본': null,
    '1:1': 1,
    '4:5': 4 / 5,
  }

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    if (file) {
      const url = URL.createObjectURL(file)
      img.src = url
      return () => URL.revokeObjectURL(url)
    } else if (imageUrl) {
      img.src = imageUrl
    }
  }, [file, imageUrl])

  // Draw canvas
  const draw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    const ratio = ratioMap[selectedRatio]

    // Canvas dimensions
    const cw = CANVAS_SIZE
    const ch = ratio ? Math.round(CANVAS_SIZE / ratio) : CANVAS_SIZE
    canvas.width = cw
    canvas.height = ch

    ctx.clearRect(0, 0, cw, ch)

    // Draw image centered with zoom and offset
    const baseScale = Math.max(cw / img.width, ch / img.height)
    const scale = baseScale * zoom
    const drawW = img.width * scale
    const drawH = img.height * scale

    const cx = cw / 2 + offset.x
    const cy = ch / 2 + offset.y

    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH)

    // Draw crop overlay — darken outside, clear inside
    const padX = 0
    const padY = 0
    const cropX = padX
    const cropY = padY
    const cropW = cw - padX * 2
    const cropH = ch - padY * 2

    // Darken everything
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, cw, ch)

    // Clear the crop area so the image shows through
    ctx.clearRect(cropX, cropY, cropW, cropH)

    // Redraw image ONLY in crop area (so it's visible)
    ctx.save()
    ctx.beginPath()
    ctx.rect(cropX, cropY, cropW, cropH)
    ctx.clip()
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
    ctx.restore()

    // Draw crop border
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropW, cropH)

    // Draw rule-of-thirds grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(cropX + (cropW / 3) * i, cropY)
      ctx.lineTo(cropX + (cropW / 3) * i, cropY + cropH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cropX, cropY + (cropH / 3) * i)
      ctx.lineTo(cropX + cropW, cropY + (cropH / 3) * i)
      ctx.stroke()
    }

    // Corner handles
    const handleSize = 16
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    const corners = [
      [cropX, cropY],
      [cropX + cropW, cropY],
      [cropX, cropY + cropH],
      [cropX + cropW, cropY + cropH],
    ]
    corners.forEach(([hx, hy]) => {
      const dx = hx === cropX ? 1 : -1
      const dy = hy === cropY ? 1 : -1
      ctx.beginPath()
      ctx.moveTo(hx, hy + dy * handleSize)
      ctx.lineTo(hx, hy)
      ctx.lineTo(hx + dx * handleSize, hy)
      ctx.stroke()
    })
  }, [imageLoaded, selectedRatio, zoom, offset])

  useEffect(() => {
    draw()
  }, [draw])

  // Clamp offset so image always covers crop area
  const clampOffset = useCallback((ox, oy, z) => {
    if (!imageRef.current || !canvasRef.current) return { x: ox, y: oy }
    const img = imageRef.current
    const ratio = ratioMap[selectedRatio]
    const cw = CANVAS_SIZE
    const ch = ratio ? Math.round(CANVAS_SIZE / ratio) : CANVAS_SIZE
    const baseScale = Math.max(cw / img.width, ch / img.height)
    const scale = baseScale * z
    const drawW = img.width * scale
    const drawH = img.height * scale
    const maxX = Math.max(0, (drawW - cw) / 2)
    const maxY = Math.max(0, (drawH - ch) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }, [selectedRatio])

  // Pointer helpers
  const getPointer = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const getPinchDist = (e) => {
    if (e.touches && e.touches.length >= 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    return null
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    if (e.touches && e.touches.length === 2) {
      setLastPinchDist(getPinchDist(e))
      return
    }
    setIsDragging(true)
    const p = getPointer(e)
    setDragStart({ x: p.x - offset.x, y: p.y - offset.y })
  }

  const handlePointerMove = (e) => {
    e.preventDefault()
    // Pinch zoom
    if (e.touches && e.touches.length === 2 && lastPinchDist !== null) {
      const dist = getPinchDist(e)
      const delta = dist / lastPinchDist
      setZoom(prev => {
        const next = Math.max(1, Math.min(4, prev * delta))
        setOffset(o => clampOffset(o.x, o.y, next))
        return next
      })
      setLastPinchDist(dist)
      return
    }
    if (!isDragging) return
    const p = getPointer(e)
    const newOffset = clampOffset(p.x - dragStart.x, p.y - dragStart.y, zoom)
    setOffset(newOffset)
  }

  const handlePointerUp = (e) => {
    setIsDragging(false)
    setLastPinchDist(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false })
    canvas.addEventListener('touchend', handlePointerUp, { passive: false })
    return () => {
      canvas.removeEventListener('touchmove', handlePointerMove)
      canvas.removeEventListener('touchend', handlePointerUp)
    }
  }, [isDragging, dragStart, zoom, lastPinchDist, offset, selectedRatio])

  const handleZoom = (dir) => {
    setZoom(prev => {
      const next = Math.max(1, Math.min(4, prev + dir * 0.25))
      setOffset(o => clampOffset(o.x, o.y, next))
      return next
    })
  }

  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleCrop = () => {
    if (!imageRef.current) return
    const img = imageRef.current
    const ratio = ratioMap[selectedRatio]
    const cw = CANVAS_SIZE
    const ch = ratio ? Math.round(CANVAS_SIZE / ratio) : CANVAS_SIZE
    const baseScale = Math.max(cw / img.width, ch / img.height)
    const scale = baseScale * zoom

    // Output at 2x for quality
    const outW = cw * 2
    const outH = ch * 2
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outW
    outputCanvas.height = outH
    const ctx = outputCanvas.getContext('2d')

    const drawW = img.width * scale * 2
    const drawH = img.height * scale * 2
    const cx = outW / 2 + offset.x * 2
    const cy = outH / 2 + offset.y * 2

    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH)

    outputCanvas.toBlob((blob) => {
      if (!blob) return
      const name = file ? file.name : `cropped_${Date.now()}.jpg`
      const type = file ? file.type : 'image/jpeg'
      onCrop(new File([blob], name, { type }))
    }, file ? file.type : 'image/jpeg', 0.92)
  }

  const ratio = ratioMap[selectedRatio]
  const canvasHeight = ratio ? Math.round(CANVAS_SIZE / ratio) : CANVAS_SIZE

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 text-sm">이미지 자르기</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-shrink-0 bg-black flex items-center justify-center" style={{ minHeight: Math.min(canvasHeight, 360) }}>
          {!imageLoaded ? (
            <p className="text-white text-sm">이미지 로딩 중...</p>
          ) : (
            <canvas
              ref={canvasRef}
              className="block touch-none"
              style={{ width: CANVAS_SIZE, height: canvasHeight, maxWidth: '100%', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-4 py-3 space-y-3 overflow-y-auto">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-8">확대</span>
            <button
              onClick={() => handleZoom(-1)}
              disabled={zoom <= 1}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30"
            >
              <Minus size={14} weight="bold" />
            </button>
            <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${((zoom - 1) / 3) * 100}%` }}
              />
            </div>
            <button
              onClick={() => handleZoom(1)}
              disabled={zoom >= 4}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30"
            >
              <Plus size={14} weight="bold" />
            </button>
            <span className="text-xs text-gray-400 w-8 text-right">{zoom.toFixed(1)}x</span>
          </div>

          {/* Ratio */}
          <div>
            <p className="text-xs text-gray-500 mb-2">비율</p>
            <div className="flex gap-2">
              {aspectRatios.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRatioChange(r)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedRatio === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            드래그로 위치 조정 · 핀치로 확대/축소
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-200"
            >
              취소
            </button>
            <button
              onClick={handleCrop}
              disabled={!imageLoaded}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700 font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check size={15} weight="bold" />
              자르기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}