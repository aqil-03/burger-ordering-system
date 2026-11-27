export const CUSTOMER_NAME_MAX_LENGTH = 60
export const CUSTOMER_PHONE_MAX_LENGTH = 24

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u
const PHONE_PATTERN = /^(?:\+?60|0)1\d{8,9}$/

export function validateCustomerName(value) {
  const name = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!name) {
    return { value: '', error: 'Please enter your name.' }
  }

  if (name.length < 2) {
    return { value: name, error: 'Your name must be at least 2 characters.' }
  }

  if (name.length > CUSTOMER_NAME_MAX_LENGTH) {
    return {
      value: name,
      error: `Your name must be ${CUSTOMER_NAME_MAX_LENGTH} characters or fewer.`,
    }
  }

  if (!NAME_PATTERN.test(name)) {
    return {
      value: name,
      error:
        'Use letters, spaces, apostrophes, hyphens, or full stops in your name.',
    }
  }

  return { value: name, error: '' }
}

export function normalizeMalaysianPhone(value) {
  const rawValue = String(value ?? '').trim()

  if (!rawValue) {
    return {
      value: '',
      error: 'Please enter your mobile number.',
    }
  }

  const compactValue = rawValue.replace(/[\s().-]/g, '')

  if (
    !/^\+?\d+$/.test(compactValue) ||
    !PHONE_PATTERN.test(compactValue)
  ) {
    return {
      value: rawValue,
      error:
        'Enter a valid Malaysian mobile number, for example 012-345 6789.',
    }
  }

  let nationalNumber

  if (compactValue.startsWith('+60')) {
    nationalNumber = compactValue.slice(3)
  } else if (compactValue.startsWith('60')) {
    nationalNumber = compactValue.slice(2)
  } else {
    nationalNumber = compactValue.slice(1)
  }

  return {
    value: `+60${nationalNumber}`,
    error: '',
  }
}

export function validateCustomerDetails({ name, phone }) {
  const nameResult = validateCustomerName(name)
  const phoneResult = normalizeMalaysianPhone(phone)

  return {
    values: {
      name: nameResult.value,
      phone: phoneResult.value,
    },
    errors: {
      name: nameResult.error,
      phone: phoneResult.error,
    },
  }
}
