/**
 * Safe financial arithmetic using integer math to avoid JS floating point issues.
 * All amounts are handled as strings in the DB, so we parse, multiply by 100, calculate, and format back to strings.
 */

export function toCents(amountStr: string | number): number {
  if (!amountStr) return 0;
  const num = typeof amountStr === 'string' ? parseFloat(amountStr) : amountStr;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calculateLineItemAmount(quantity: string | number, unitPrice: string | number): string {
  const q = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  const upCents = toCents(unitPrice);
  if (isNaN(q)) return "0.00";
  return fromCents(Math.round(q * upCents));
}

export function calculateSubtotal(items: { quantity: string | number, unitPrice: string | number }[]): string {
  const totalCents = items.reduce((sum, item) => {
    const q = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const upCents = toCents(item.unitPrice);
    if (isNaN(q)) return sum;
    return sum + Math.round(q * upCents);
  }, 0);
  return fromCents(totalCents);
}

export function calculateTotal(subtotal: string | number, taxRate: string | number, discount: string | number): string {
  const subCents = toCents(subtotal);
  const taxPct = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
  const disc = toCents(discount);
  
  if (isNaN(taxPct)) return fromCents(subCents - disc);
  
  const taxAmountCents = Math.round(subCents * (taxPct / 100));
  const totalCents = subCents + taxAmountCents - disc;
  
  return fromCents(totalCents > 0 ? totalCents : 0);
}

export function calculateBalanceDue(total: string | number, paidAmount: string | number): string {
  const tCents = toCents(total);
  const pCents = toCents(paidAmount);
  const diff = tCents - pCents;
  return fromCents(diff > 0 ? diff : 0);
}

export function addAmounts(amount1: string | number, amount2: string | number): string {
  return fromCents(toCents(amount1) + toCents(amount2));
}

export function subtractAmounts(amount1: string | number, amount2: string | number): string {
  return fromCents(toCents(amount1) - toCents(amount2));
}

export function isFullyPaid(total: string | number, paidAmount: string | number): boolean {
  return toCents(paidAmount) >= toCents(total);
}
