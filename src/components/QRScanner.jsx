import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const QR_BOX_SIZE = 220

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
            qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return
            if (scannedRef.current) return

            scannedRef.current = true
            console.log('QR Code detected:', decodedText)
            onScan(decodedText)

            // allow another scan after 2 seconds
            setTimeout(() => {
              scannedRef.current = false
            }, 2000)
          },
          () => {}
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
      <style>{`
        /* Force the scan region box to be a perfect square */
        #qr-scanner-container #qr-shaded-region {
          border-width: 0 !important;
        }

        /* Remove the default rectangle border and replace with square corner brackets in orange */
        #qr-scanner-container video {
          border-radius: 12px;
        }

        /* The inner scan box — make it square with corner brackets */
        #qr-scanner-container #qr-shaded-region + div,
        #qr-scanner-container [id^="qr-code-full-region"] > div:last-child {
          border: none !important;
        }

        /* Override the shaded border lines html5-qrcode draws */
        #qr-shaded-region {
          border: none !important;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45) !important;
        }

        /* The actual scanning box outline — square corners */
        #qr-shaded-region::before {
          content: '';
          position: absolute;
          inset: 0;
          border: 2.5px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          pointer-events: none;
        }
      `}</style>

      {/* Wrapper so we can overlay our own corner brackets */}
      <div
        className="relative w-full max-w-xs"
        style={{ aspectRatio: '1' }}
      >
        <div
          id="qr-scanner-container"
          className="w-full h-full rounded-2xl overflow-hidden"
        />

        {/* Corner bracket overlay — positioned over the qrbox area */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            width: QR_BOX_SIZE,
            height: QR_BOX_SIZE,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Top-left */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 28,
              height: 28,
              borderTop: '3px solid #f97316',
              borderLeft: '3px solid #f97316',
              borderRadius: '4px 0 0 0',
            }}
          />
          {/* Top-right */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 28,
              height: 28,
              borderTop: '3px solid #f97316',
              borderRight: '3px solid #f97316',
              borderRadius: '0 4px 0 0',
            }}
          />
          {/* Bottom-left */}
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 28,
              height: 28,
              borderBottom: '3px solid #f97316',
              borderLeft: '3px solid #f97316',
              borderRadius: '0 0 0 4px',
            }}
          />
          {/* Bottom-right */}
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderBottom: '3px solid #f97316',
              borderRight: '3px solid #f97316',
              borderRadius: '0 0 4px 0',
            }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center">
        매장 QR 코드를 스캔해주세요
      </p>
    </div>
  )
}