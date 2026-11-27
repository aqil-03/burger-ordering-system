export function formatRinggit(priceSen) {
  const safeValue = Number.isInteger(priceSen) ? priceSen : 0

  return `RM ${(safeValue / 100).toFixed(2)}`
}
