// src/lib/qrSync.js
// Real-time QR code expiry synchronization using localStorage events

export const subscribeToQRExpiry = (studentNumber, callback) => {
  const handleStorageChange = (e) => {
    if (e.key === `qr-expiry-${studentNumber}` && e.newValue) {
      try {
        const data = JSON.parse(e.newValue)
        callback(data)
      } catch (error) {
        console.error('Error parsing QR expiry data:', error)
      }
    }
  }

  window.addEventListener('storage', handleStorageChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
  }
}

export const broadcastQRExpiry = (studentNumber) => {
  try {
    localStorage.setItem(
      `qr-expiry-${studentNumber}`,
      JSON.stringify({ timestamp: Date.now() })
    )
  } catch (error) {
    console.error('Error broadcasting QR expiry:', error)
  }
}