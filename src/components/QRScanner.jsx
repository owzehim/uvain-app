import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    const scannerId = 'qr-scanner-container'
    let isMounted = true

    async function startScanner() {
      try {
        const scanner = new Html5Qrcode(scannerId, { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return
            if (scannedRef.current) return
            scannedRef.current = true
            // just notify parent; cleanup will stop the scanner
            onScan(decodedText)
          },
          () => {
            // per-frame decode error, ignore
          }
        )
      } catch (err) {
        console.error('QR scanner start error:', err)
      }
    }

    startScanner()

    return () => {
      isMounted = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          const stopResult = scanner.stop()
          if (stopResult && typeof stopResult.catch === 'function') {
            stopResult.catch((err) => {
              console.warn('QR scanner stop error (ignored):', err?.message || err)
            })
          }
        } catch (err) {
          console.warn('QR scanner stop threw (ignored):', err?.message || err)
        }
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