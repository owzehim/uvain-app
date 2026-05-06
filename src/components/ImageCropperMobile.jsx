import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, MagnifyingGlassPlus, MagnifyingGlassMinus, CropSimple } from 'phosphor-react'

// accepts either a File object OR a URL string (for re-cropping uploaded images)
export function ImageCropperMobile({ file, imageUrl, onCrop, onCancel, onSkip, aspectRatios = ['1:1', '4:5'] }) {
  const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0])
  const [zoom, setZoom] = useState(1)                 // 1 = fit, > 1 = zoomed in
  const [pan, setPan] = useState({ x: 0, y: 0 })     // offset of image inside viewport (px)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 })
  const [lastPinchDist, setLastPinchDist] = useState(null)

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)

  // ratio of crop box  width/height
  const ratioMap = { '1:1': 1, '4:5': 4 / 5 }
  const ar = ratioMap[selectedRatio] ?? 1

  // ─── load image ────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      resetView(img)
    }
    if (imageUrl) {
      img.src = imageUrl
    } else if (file) {
      const url = URL.createObjectURL(file)
      img.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [file, imageUrl])

  // ─── reset pan/zoom so image fills the crop box ────────────────────────────
  const resetView = useCallback((img) => {
    if (!containerRef.current || !img) return
    const cw = containerRef.current.offsetWidth
    const ch = getCanvasHeight(cw)
    const cropW = getCropBoxSize(cw, ch).w
    const cropH = getCropBoxSize(cw, ch).h
    // scale image so its shorter side fills the crop box
    const scaleX = cropW / img.width
    const scaleY = cropH / img.height
    const fitZoom = Math.max(scaleX, scaleY)
    setZoom(fitZoom)
    setPan({ x: 0, y: 0 })
  }, [])

  // ─── canvas size helpers ───────────────────────────────────────────────────
  const getCanvasHeight = (cw) => Math.round(cw * 1.1)   // a bit taller than wide

  const getCropBoxSize = (cw, ch) => {
    const maxW = cw - 32
    const maxH = ch - 32
    let w, h
    if (ar >= 1) {                   // landscape / square
      w = Math.min(maxW, maxH * ar)
      h = w / ar
    } else {                         // portrait  (4:5)
      h = Math.min(maxH, maxW / ar)
      w = h * ar
    }
    return { w: Math.round(w), h: Math.round(h) }
  }

  // ─── draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    draw()
  }, [zoom, pan, selectedRatio])

  const draw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    const cw = containerRef.current.offsetWidth
    const ch = getCanvasHeight(cw)
    canvas.width = cw
    canvas.height = ch

    const { w: cropW, h: cropH } = getCropBoxSize(cw, ch)
    const cropX = (cw - cropW) / 2
    const cropY = (ch - cropH) / 2

    // draw image (zoomed + panned)
    const drawW = img.width * zoom
    const drawH = img.height * zoom
    const imgX = (cw - drawW) / 2 + pan.x
    const imgY = (ch - drawH) / 2 + pan.y

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, imgX, imgY, drawW, drawH)

    // dark overlay outside crop box
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    ctx.rect(0, 0, cw, ch)                          // outer
    ctx.rect(cropX, cropY, cropW, cropH)             // inner (cut out)
    ctx.fill('evenodd')

    // crop border + corner handles
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropW, cropH)

    const hs = 16  // handle size
    ctx.fillStyle = '#ffffff'
    ;[[cropX, cropY], [cropX + cropW - hs, cropY],
      [cropX, cropY + cropH - hs], [cropX + cropW - hs, cropY + cropH - hs]
    ].forEach(([x, y]) => ctx.fillRect(x, y, hs, hs))
  }, [zoom, pan, selectedRatio])

  // ─── clamp pan so image always covers the crop box ─────────────────────────
  const clampPan = useCallback((newPan, newZoom, img) => {
    if (!containerRef.current || !img) return newPan
    const cw = containerRef.current.offsetWidth
    const ch = getCanvasHeight(cw)
    const { w: cropW, h: cropH } = getCropBoxSize(cw, ch)
    const cropX = (cw - cropW) / 2
    const cropY = (ch - cropH) / 2

    const drawW = img.width * newZoom
    const drawH = img.height * newZoom
    const imgX = (cw - drawW) / 2 + newPan.x
    const imgY = (ch - drawH) / 2 + newPan.y

    const minPanX = cropX - imgX >= 0 ? cropX - ((cw - drawW) / 2) : newPan.x
    // simpler: just clamp so crop box is always inside the drawn image
    const maxPanX = (cw - drawW) / 2 - cropX + (cw - drawW) / 2
    const clampedX = Math.min(
      (drawW - cropW) / 2,
      Math.max(-(drawW - cropW) / 2, newPan.x)
    )
    const clampedY = Math.min(
      (drawH - cropH) / 2,
      Math.max(-(drawH - cropH) / 2, newPan.y)
    )
    return { x: clampedX, y: clampedY }
  }, [selectedRatio])

  // ─── zoom helpers ──────────────────────────────────────────────────────────
  const changeZoom = (delta) => {
    if (!imageRef.current || !containerRef.current) return
    const img = imageRef.current
    const cw = containerRef.current.offsetWidth
    const ch = getCanvasHeight(cw)
    const { w: cropW, h: cropH } = getCropBoxSize(cw, ch)
    const minZoom = Math.max(cropW / img.width, cropH / img.height)
    const newZoom = Math.min(5, Math.max(minZoom, zoom + delta))
    const clamped = clampPan(pan, newZoom, img)
    setZoom(newZoom)
    setPan(clamped)
  }

  // ─── pointer events (drag to pan) ─────────────────────────────────────────
  const getPoint = (e) => {
    if (e.touches && e.touches.length === 1) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  const onPointerDown = (e) => {
    if (e.touches && e.touches.length === 2) return  // let pinch handler take over
    e.preventDefault()
    const pt = getPoint(e)
    setIsDragging(true)
    setDragStart({ x: pt.x, y: pt.y, panX: pan.x, panY: pan.y })
  }

  const onPointerMove = useCallback((e) => {
    // pinch zoom
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastPinchDist !== null) {
        const delta = (dist - lastPinchDist) * 0.01
        changeZoom(delta)
      }
      setLastPinchDist(dist)
      return
    }
    if (!isDragging) return
    e.preventDefault()
    const pt = getPoint(e)
    const newPan = {
      x: dragStart.panX + (pt.x - dragStart.x),
      y: dragStart.panY + (pt.y - dragStart.y),
    }
    const clamped = clampPan(newPan, zoom, imageRef.current)
    setPan(clamped)
  }, [isDragging, dragStart, zoom, lastPinchDist, clampPan])

  const onPointerUp = () => {
    setIsDragging(false)
    setLastPinchDist(null)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchmove', onPointerMove, { passive: false })
    el.addEventListener('touchend', onPointerUp)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    return () => {
      el.removeEventListener('touchmove', onPointerMove)
      el.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
    }
  }, [onPointerMove])

  // ─── ratio change ──────────────────────────────────────────────────────────
  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio)
    // re-clamp after ratio change
    setTimeout(() => {
      if (imageRef.current) {
        const clamped = clampPan(pan, zoom, imageRef.current)
        setPan(clamped)
      }
    }, 0)
  }

  // ─── crop & export ─────────────────────────────────────────────────────────
  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return
    const img = imageRef.current
    const cw = containerRef.current.offsetWidth
    const ch = getCanvasHeight(cw)
    const { w: cropW, h: cropH } = getCropBoxSize(cw, ch)
    const cropX = (cw - cropW) / 2
    const cropY = (ch - cropH) / 2

    // where image is drawn on canvas
    const drawW = img.width * zoom
    const drawH = img.height * zoom
    const imgX = (cw - drawW) / 2 + pan.x
    const imgY = (ch - drawH) / 2 + pan.y

    // map crop box back to image coordinates
    const srcX = (cropX - imgX) / zoom
    const srcY = (cropY - imgY) / zoom
    const srcW = cropW / zoom
    const srcH = cropH / zoom

    const out = document.createElement('canvas')
    // output at 2x for retina quality
    out.width = Math.round(srcW)
    out.height = Math.round(srcH)
    out.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, out.width, out.height)

    const mimeType = file?.type || 'image/jpeg'
    const fileName = file?.name || 'cropped.jpg'
    out.toBlob((blob) => {
      if (!blob) return
      onCrop(new File([blob], fileName, { type: mimeType }))
    }, mimeType, 0.92)
  }

  const canvasHeight = containerRef.current
    ? getCanvasHeight(containerRef.current.offsetWidth)
    : 340

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md flex flex-col max-h-[95vh]">
        {/* header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CropSimple size={18} weight="bold" />
            이미지 자르기
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* canvas viewport */}
        <div
          ref={containerRef}
          className="relative bg-black mx-0 touch-none overflow-hidden shrink-0"
          style={{ height: canvasHeight, cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
          {/* zoom buttons (desktop) */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => changeZoom(0.15)}
              className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow text-gray-700"
            >
              <MagnifyingGlassPlus size={16} weight="bold" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => changeZoom(-0.15)}
              className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow text-gray-700"
            >
              <MagnifyingGlassMinus size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* controls */}
        <div className="px-4 pt-3 pb-4 space-y-3 shrink-0">
          {/* ratio buttons */}
          <div className="flex gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => handleRatioChange(ratio)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedRatio === ratio
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ratio === '1:1' ? '■ 1:1' : '▬ 4:5'}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            드래그로 위치 조정 · 핀치 또는 ＋/－ 버튼으로 확대/축소
          </p>

          {/* action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCrop}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Check size={16} weight="bold" />
              자르기
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
              >
                그냥 올리기
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-4 bg-gray-100 text-gray-500 rounded-xl py-3 text-sm active:scale-95 transition-transform"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}