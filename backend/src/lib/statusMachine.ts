export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type NotificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type CreditNoteStatus = 'draft' | 'applied' | 'void';

const invoiceTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],      // terminal
  cancelled: [], // terminal
};

const quoteTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],  // terminal (can be converted to invoice)
  rejected: [],
  expired: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;
  return invoiceTransitions[from].includes(to);
}

export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true;
  return quoteTransitions[from].includes(to);
}
