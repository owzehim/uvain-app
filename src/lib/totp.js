async function hmacSHA1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes)
  return new Uint8Array(sig)
}

function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const output = []
  const str = base32.toUpperCase().replace(/=+$/, '')
  for (const char of str) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

export async function generateTOTP(secret, step = 15, digits = 8) {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / step)

  const counterBytes = new Uint8Array(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const keyBytes = base32ToBytes(secret)
  const hmac = await hmacSHA1(keyBytes, counterBytes)

  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = code % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

export async function verifyTOTP(token, secret, step = 15, digits = 8, window = 2) {
  for (let i = -window; i <= window; i++) {
    const epoch = Math.floor(Date.now() / 1000)
    const counter = Math.floor(epoch / step) + i

    const counterBytes = new Uint8Array(8)
    let tmp = counter
    for (let j = 7; j >= 0; j--) {
      counterBytes[j] = tmp & 0xff
      tmp = Math.floor(tmp / 256)
    }

    const keyBytes = base32ToBytes(secret)
    const hmac = await hmacSHA1(keyBytes, counterBytes)

    const offset = hmac[hmac.length - 1] & 0x0f
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)

    const otp = (code % Math.pow(10, digits)).toString().padStart(digits, '0')
    if (otp === token) return true
  }
  return false
}

export function getSecondsLeft(step = 15) {
  const epoch = Math.floor(Date.now() / 1000)
  return step - (epoch % step)
}