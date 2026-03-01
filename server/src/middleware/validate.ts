export function validateUsername(u: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(u)
}

export function validateEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export function validatePassword(p: string): boolean {
  return typeof p === 'string' && p.length >= 6
}

export function validateDateString(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d))
}

export function validateTimeString(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t)
}
