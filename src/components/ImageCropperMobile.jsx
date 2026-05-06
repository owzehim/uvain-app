import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'phosphor-react'

export function ImageCropperMobile({ file, onCrop, onCancel, aspectRatios = ['1:1', '4:5'] }) {
  const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0])
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [isInteracting, setIsInteracting] = useState(false)
  const [interactStart, setInteractStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)

  const ratioMap = { '1:1': 1, '4:5': 4 / 5 }

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      drawPreview()
    }
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    drawPreview()
  }, [crop, selectedRatio])

  const drawPreview = () => {
    if (!canvasRef.current || !imageRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    const containerWidth = containerRef.current?.offsetWidth || 300
    canvas.width = containerWidth
    canvas.height = containerWidth
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const cropWidth = (crop.width / 100) * canvas.width
    const cropHeight = (crop.height / 100) * canvas.height
    const cropX = (crop.x / 100) * canvas.width
    const cropY = (crop.y / 100) * canvas.height
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(cropX, cropY, cropWidth, cropHeight)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight)
  }

  const getCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const handleInteractionStart = (e) => {
    if (!containerRef.current) return
    e.preventDefault()
    setIsInteracting(true)
    setInteractStart(getCoords(e))
  }

  const handleInteractionMove = (e) => {
    if (!isInteracting || !containerRef.current) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const { x: currentX, y: currentY } = getCoords(e)
    const deltaX = ((currentX - interactStart.x) / rect.width) * 100
    const deltaY = ((currentY - interactStart.y) / rect.height) * 100
    const newX = Math.max(0, Math.min(crop.x + deltaX, 100 - crop.width))
    const newY = Math.max(0, Math.min(crop.y + deltaY, 100 - crop.height))
    setCrop(prev => ({ ...prev, x: newX, y: newY }))
    setInteractStart({ x: currentX, y: currentY })
  }

  const handleInteractionEnd = () => setIsInteracting(false)

  useEffect(() => {
    if (!isInteracting) return
    document.addEventListener('mousemove', handleInteractionMove, { passive: false })
    document.addEventListener('mouseup', handleInteractionEnd)
    document.addEventListener('touchmove', handleInteractionMove, { passive: false })
    document.addEventListener('touchend', handleInteractionEnd)
    return () => {
      document.removeEventListener('mousemove', handleInteractionMove)
      document.removeEventListener('mouseup', handleInteractionEnd)
      document.removeEventListener('touchmove', handleInteractionMove)
      document.removeEventListener('touchend', handleInteractionEnd)
    }
  }, [isInteracting, crop, interactStart])

  const handleCrop = () => {
    if (!imageRef.current) return
    const img = imageRef.current
    const cropW = (crop.width / 100) * img.width
    const cropH = (crop.height / 100) * img.height
    const cropX = (crop.x / 100) * img.width
    const cropY = (crop.y / 100) * img.height
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = cropW
    outputCanvas.height = cropH
    outputCanvas.getContext('2d').drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    outputCanvas.toBlob((blob) => {
      if (!blob) return
      onCrop(new File([blob], file.name, { type: file.type }))
    }, file.type)
  }

  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio)
    const ar = ratioMap[ratio]
    const newH = crop.width * ar
    if (newH <= 100) {
      setCrop(prev => ({ ...prev, height: newH }))
    } else {
      setCrop(prev => ({ ...prev, width: 100 / ar, height: 100 }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
          <h3 className="font-semibold text-gray-900">이미지 자르기</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={20} />
          </button>
        </div>

        <div
          ref={containerRef}
          className="bg-gray-100 rounded-lg overflow-hidden cursor-move touch-none"
          onMouseDown={handleInteractionStart}
          onTouchStart={handleInteractionStart}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-2">비율 선택</label>
          <div className="flex gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => handleRatioChange(ratio)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedRatio === ratio ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          💡 드래그하여 자를 영역을 선택하세요.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleCrop}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Check size={16} weight="bold" />
            자르기
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-200 active:scale-95 transition-transform"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}