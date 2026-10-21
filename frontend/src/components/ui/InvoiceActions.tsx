"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2, Copy, XCircle, BellRing } from "lucide-react";
import { PaymentModal } from "./PaymentModal";
import { SendInvoiceModal } from "./SendInvoiceModal";

export function InvoiceActions({ 
  invoiceId, 
  currentStatus, 
  total,
  paidAmount = 0,
  currency = "LKR",
  invoiceData,
  onStatusUpdate 
}: { 
  invoiceId: number; 
  currentStatus: string;
  total: number;
  paidAmount?: number;
  currency?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoiceData?: any;
  onStatusUpdate?: () => void;
}) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // Fallback composite data for modal if raw invoiceData not passed
  const modalData = invoiceData || {
    invoice: {
      id: invoiceId,
      invoiceNumber: `INV-${invoiceId}`,
      status: currentStatus,
      total,
      paidAmount,
      currency
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to duplicate invoice");
      const data = await res.json();
      if (data.invoiceId) {
        window.location.href = `/admin/invoices/${data.invoiceId}`;
      } else {
        if (onStatusUpdate) onStatusUpdate();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to duplicate invoice.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this invoice? This cannot be undone.")) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!res.ok) throw new Error("Failed to cancel invoice");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel invoice.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        {/* Record Payment */}
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={() => setIsPaymentModalOpen(true)} 
            className="btn-secondary text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 border-emerald-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
        
        {/* Send / Resend Email with CC & Attachment */}
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={() => setIsSendModalOpen(true)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all ${
              currentStatus === 'overdue'
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950'
            }`}
          >
            {currentStatus === 'overdue' ? (
              <>
                <BellRing className="w-4 h-4" />
                <span>Send Reminder</span>
              </>
            ) : currentStatus === 'sent' ? (
              <>
                <Send className="w-4 h-4" />
                <span>Resend Email</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send to Client</span>
              </>
            )}
          </button>
        )}

        {/* Duplicate */}
        <button 
          onClick={handleDuplicate} 
          disabled={isDuplicating}
          className="btn-secondary flex items-center gap-2"
          title="Duplicate this invoice"
        >
          {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          <span>Duplicate</span>
        </button>

        {/* Cancel */}
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={handleCancel} 
            disabled={isCancelling}
            className="btn-secondary text-destructive hover:bg-destructive/10 flex items-center gap-2 border-destructive/20"
            title="Cancel invoice"
          >
            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoiceId={invoiceId}
        total={total}
        paidAmount={paidAmount}
        currency={currency}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          if (onStatusUpdate) onStatusUpdate();
        }}
      />

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        invoiceData={modalData}
        onSent={() => {
          setIsSendModalOpen(false);
          if (onStatusUpdate) onStatusUpdate();
        }}
      />
    </>
  );
}
