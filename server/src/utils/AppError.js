export class AppError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST', cause } = {}) {
    super(message, { cause })
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}
