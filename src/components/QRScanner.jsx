import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

export default function QRScanner({ onScan }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [status, setStatus] = useState('카메라 초기화 중...')

  useEffect(() => {
    const reader = new BrowserQRCodeReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        controlsRef.current = controls

        if (result) {
          controls.stop()
          onScan(result.getText())
        }
        // ignore all errors — they are mostly "no QR in this frame" noise
      })
      .then(() => setStatus('매장 QR 코드를 스캔해주세요'))
      .catch(() => setStatus('카메라에 접근할 수 없습니다.'))

    return () => {
      controlsRef.current?.stop()
    }
  }, [onScan])

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-full max-w-xs rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '1' }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
        {/* Corner frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500 text-center">{status}</p>
    </div>
  )
}
