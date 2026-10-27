/** Pesewas -> "GHS 1,350.00", for messages and documents. */
export const formatMoney = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
