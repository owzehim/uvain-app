import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    const scannerId = 'qr-scanner-container'
    const scanner = new Html5Qrcode(scannerId, { verbose: false })
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      },
      (decodedText) => {
        // prevent firing twice
        if (scannedRef.current) return
        scannedRef.current = true

        // stop scanner then call onScan
        scanner.stop()
          .catch(() => {})
          .finally(() => {
            onScan(decodedText)
          })
      },
      () => {
        // ignore per-frame errors
      }
    ).catch((err) => {
      console.error('QR scanner failed to start:', err)
    })

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div
        id="qr-scanner-container"
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ aspectRatio: '1' }}
      />
      <p className="text-sm text-gray-500 text-center">매장 QR 코드를 스캔해주세요</p>
    </div>
  )
}
