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
          { fps: 10, qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE }, aspectRatio: 1.0 },
          (decodedText) => {
            if (!isMounted || scannedRef.current) return
            scannedRef.current = true
            onScan(decodedText)
            setTimeout(() => { scannedRef.current = false }, 2000)
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
          if (stopResult?.catch) stopResult.catch((err) => console.warn('QR scanner stop error:', err?.message))
        } catch (err) {
          console.warn('QR scanner stop threw:', err?.message)
        }
      }
    }
  }, [onScan])

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <style>{`
        #qr-scanner-container #qr-shaded-region {
          border-width: 0 !important;
        }
        #qr-scanner-container video {
          border-radius: 12px;
        }
        #qr-scanner-container #qr-shaded-region + div,
        #qr-scanner-container [id^="qr-code-full-region"] > div:last-child {
          border: none !important;
        }
        /* Overlay: card background color */
        #qr-shaded-region {
          border: none !important;
          box-shadow: 0 0 0 9999px rgba(246, 244, 241, 0.75) !important;
        }
        /* Scan box inner border: white */
        #qr-shaded-region::before {
          content: '';
          position: absolute;
          inset: 0;
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          pointer-events: none;
        }
      `}</style>

      <div className="relative w-full max-w-xs" style={{ aspectRatio: '1' }}>
        <div id="qr-scanner-container" className="w-full h-full rounded-2xl overflow-hidden" />

        {/* Corner brackets — warm charcoal */}
        <div
          className="absolute pointer-events-none"
          style={{ top: '50%', left: '50%', width: QR_BOX_SIZE, height: QR_BOX_SIZE, transform: 'translate(-50%, -50%)' }}
        >
          {[
            { top: 0,    left: 0,  borderTop: true,    borderLeft: true,  radius: '4px 0 0 0' },
            { top: 0,    right: 0, borderTop: true,    borderRight: true, radius: '0 4px 0 0' },
            { bottom: 0, left: 0,  borderBottom: true, borderLeft: true,  radius: '0 0 0 4px' },
            { bottom: 0, right: 0, borderBottom: true, borderRight: true, radius: '0 0 4px 0' },
          ].map((corner, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                width: 28,
                height: 28,
                ...(corner.top    !== undefined && { top:    corner.top }),
                ...(corner.bottom !== undefined && { bottom: corner.bottom }),
                ...(corner.left   !== undefined && { left:   corner.left }),
                ...(corner.right  !== undefined && { right:  corner.right }),
                ...(corner.borderTop    && { borderTop:    '3px solid #F6F4F1' }),
                ...(corner.borderBottom && { borderBottom: '3px solid #F6F4F1' }),
                ...(corner.borderLeft   && { borderLeft:   '3px solid #F6F4F1' }),
                ...(corner.borderRight  && { borderRight:  '3px solid #F6F4F1' }),
                borderRadius: corner.radius,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center px-4">
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#2C2A27', fontFamily: '"Handjet", system-ui, sans-serif', letterSpacing: '0.04em', margin: 0 }}>
          매장 QR 코드를 스캔해주세요
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(44,42,39,0.45)', fontFamily: '"Handjet", system-ui, sans-serif', letterSpacing: '0.02em', margin: 0 }}>
          카메라가 실행되지 않으면 앱을 재시작해주세요
        </p>
      </div>
    </div>
  )
}