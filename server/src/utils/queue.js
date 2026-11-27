const DEFAULT_TIME_ZONE = 'Asia/Kuala_Lumpur'
const DEFAULT_RESET_HOUR = 4

function safeTimeZone(value) {
  const timeZone = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_TIME_ZONE

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

function safeResetHour(value) {
  return Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : DEFAULT_RESET_HOUR
}

function pad(value) {
  return String(value).padStart(2, '0')
}

// A business day begins at the configured cut-off hour in the restaurant's
// time zone. For example, with a 4 AM cut-off, an order at 1 AM is still part
// of the previous day's queue, while 4 AM starts a fresh queue.
export function getBusinessQueueDate({
  now = new Date(),
  timeZone,
  resetHour = DEFAULT_RESET_HOUR,
} = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('A valid date is required to calculate the queue date.')
  }

  const zone = safeTimeZone(timeZone)
  const cutOffHour = safeResetHour(resetHour)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const partsByType = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  let year = Number(partsByType.year)
  const month = Number(partsByType.month)
  const day = Number(partsByType.day)
  const hour = Number(partsByType.hour)

  let localDate = new Date(Date.UTC(year, month - 1, day))

  if (hour < cutOffHour) {
    localDate.setUTCDate(localDate.getUTCDate() - 1)
    year = localDate.getUTCFullYear()
  }

  return `${year}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`
}
