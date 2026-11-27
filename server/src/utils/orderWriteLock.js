// SQLite supports only one writer at a time. Serializing order writes inside
// this single Node process avoids interactive-transaction timeouts. The unique
// queue constraint remains the database-level safeguard.
let orderWriteQueue = Promise.resolve()

export function withOrderWriteLock(task) {
  const result = orderWriteQueue.then(task, task)
  orderWriteQueue = result.catch(() => {})
  return result
}
