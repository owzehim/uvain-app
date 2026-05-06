import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, Plus, Minus } from 'phosphor-react'

export function ImageCropperMobile({ file, imageUrl, onCrop, onCancel, aspectRatios = ['1:1', '4:5'] }) {
  const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0])
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 80, height: 80 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPinchDist, setLastPinchDist] = useState(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const cropRef = useRef(crop)
  const zoomRef = useRef(zoom)

  cropRef.current = crop
  zoomRef.current = zoom

  const ratioMap = { '1:1': 1, '4:5': 5 / 4 }

  // Load image from file or URL
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      // Initialize crop based on ratio
      initCrop(selectedRatio, img)
    }
    if (file) {
      const url = URL.createObjectURL(file)
      img.src = url
      return () => URL.revokeObjectURL(url)
    } else if (imageUrl) {
      img.src = imageUrl
    }
  }, [file, imageUrl])

  const initCrop = (ratio, img) => {
    const ar = ratioMap[ratio]
    // ar = width/height, so for 4:5 portrait ar = 5/4 means height > width
    // We want the crop box to have the correct aspect ratio
    // For 1:1: width = height
    // For 4:5 portrait: width = 4 parts, height = 5 parts
    const portraitRatio = ratio === '4:5' ? 4 / 5 : 1 // actual w/h ratio
    const boxWidth = 75
    const boxHeight = boxWidth / portraitRatio
    const clampedHeight = Math.min(boxHeight, 90)
    const clampedWidth = clampedHeight * portraitRatio
    setCrop({
      x: (100 - clampedWidth) / 2,
      y: (100 - clampedHeight) / 2,
      width: clampedWidth,
      height: clampedHeight
    })
  }

  useEffect(() => {
    drawPreview()
  }, [crop, zoom, selectedRatio])

  const drawPreview = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    const cw = canvas.width
    const ch = canvas.height

    ctx.clearRect(0, 0, cw, ch)

    // Draw zoomed image centered
    const drawW = cw * zoom
    const drawH = ch * zoom
    const offsetX = (cw - drawW) / 2
    const offsetY = (ch - drawH) / 2
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

    // Dark overlay over entire canvas
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, cw, ch)

    // Clear (reveal) the crop area so image shows through
    const cropX = (crop.x / 100) * cw
    const cropY = (crop.y / 100) * ch
    const cropW = (crop.width / 100) * cw
    const cropH = (crop.height / 100) * ch

    ctx.clearRect(cropX, cropY, cropW, cropH)

    // Re-draw image only inside crop area (so it shows through clearly)
    ctx.save()
    ctx.beginPath()
    ctx.rect(cropX, cropY, cropW, cropH)
    ctx.clip()
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
    ctx.restore()

    // Crop border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropW, cropH)

    // Corner handles
    const handleSize = 12
    ctx.fillStyle = '#3b82f6'
    const corners = [
      [cropX, cropY],
      [cropX + cropW - handleSize, cropY],
      [cropX, cropY + cropH - handleSize],
      [cropX + cropW - handleSize, cropY + cropH - handleSize]
    ]
    corners.forEach(([hx, hy]) => ctx.fillRect(hx, hy, handleSize, handleSize))

    // Grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(cropX + cropW / 3, cropY)
    ctx.lineTo(cropX + cropW / 3, cropY + cropH)
    ctx.moveTo(cropX + (cropW * 2) / 3, cropY)
    ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH)
    ctx.moveTo(cropX, cropY + cropH / 3)
    ctx.lineTo(cropX + cropW, cropY + cropH / 3)
    ctx.moveTo(cropX, cropY + (cropH * 2) / 3)
    ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3)
    ctx.stroke()
  }, [crop, zoom])

  const getPoint = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const getPinchDist = (e) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleStart = (e) => {
    if (!containerRef.current) return
    if (e.touches && e.touches.length === 2) {
      setLastPinchDist(getPinchDist(e))
      return
    }
    e.preventDefault()
    setIsDragging(true)
    setDragStart(getPoint(e))
  }

  const handleMove = useCallback((e) => {
    // Pinch zoom
    if (e.touches && e.touches.length === 2) {
      if (lastPinchDist === null) return
      const newDist = getPinchDist(e)
      const delta = (newDist - lastPinchDist) / 100
      setZoom(z => Math.min(3, Math.max(1, z + delta)))
      setLastPinchDist(newDist)
      return
    }

    if (!isDragging || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const pt = getPoint(e)
    const deltaX = ((pt.x - dragStart.x) / rect.width) * 100
    const deltaY = ((pt.y - dragStart.y) / rect.height) * 100

    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + deltaX, 100 - prev.width)),
      y: Math.max(0, Math.min(prev.y + deltaY, 100 - prev.height))
    }))
    setDragStart(pt)
  }, [isDragging, dragStart, lastPinchDist])

  const handleEnd = () => {
    setIsDragging(false)
    setLastPinchDist(null)
  }

  useEffect(() => {
    document.addEventListener('mousemove', handleMove, { passive: false })
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [handleMove])

  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio)
    if (imageRef.current) initCrop(ratio, imageRef.current)
  }

  const handleCrop = () => {
    if (!imageRef.current) return
    const img = imageRef.current
    const canvas = canvasRef.current
    const cw = canvas.width
    const ch = canvas.height

    const drawW = cw * zoom
    const drawH = ch * zoom
    const offsetX = (cw - drawW) / 2
    const offsetY = (ch - drawH) / 2

    const cropX = (crop.x / 100) * cw
    const cropY = (crop.y / 100) * ch
    const cropW = (crop.width / 100) * cw
    const cropH = (crop.height / 100) * ch

    // Map canvas crop coords back to image coords
    const scaleX = img.width / drawW
    const scaleY = img.height / drawH
    const srcX = (cropX - offsetX) * scaleX
    const srcY = (cropY - offsetY) * scaleY
    const srcW = cropW * scaleX
    const srcH = cropH * scaleY

    const out = document.createElement('canvas')
    out.width = Math.max(1, srcW)
    out.height = Math.max(1, srcH)
    out.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, out.width, out.height)

    const mimeType = file ? file.type : 'image/jpeg'
    const fileName = file ? file.name : 'cropped.jpg'
    out.toBlob((blob) => {
      if (!blob) return
      onCrop(new File([blob], fileName, { type: mimeType }))
    }, mimeType)
  }

  // Set canvas size after mount
  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const w = containerRef.current.offsetWidth || 340
      canvasRef.current.width = w
      canvasRef.current.height = w
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-sm space-y-3 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="font-semibold text-gray-900 text-sm">이미지 자르기</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="mx-4 bg-black rounded-xl overflow-hidden cursor-move touch-none select-none"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>

        {/* Zoom controls */}
        <div className="px-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 w-10">확대</span>
          <button
            onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(1)))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
          >
            <Minus size={14} />
          </button>
          <input
            type="range"
            min="1" max="3" step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <button
            onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
          >
            <Plus size={14} />
          </button>
          <span className="text-xs text-gray-400 w-10 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Ratio buttons */}
        <div className="px-4">
          <p className="text-xs text-gray-500 mb-2">비율 선택</p>
          <div className="flex gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => handleRatioChange(ratio)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRatio === ratio ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ratio === '4:5' ? '4:5 (세로)' : '1:1 (정사각)'}
              </button>
            ))}
          </div>
        </div>

        <p className="px-4 text-xs text-gray-400">
          💡 밝은 영역이 잘릴 부분입니다. 드래그로 위치를 조정하세요.
        </p>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleCrop}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Check size={16} weight="bold" />
            자르기
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-200"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}