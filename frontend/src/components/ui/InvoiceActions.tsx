"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2, Copy, XCircle } from "lucide-react";
import { PaymentModal } from "./PaymentModal";

export function InvoiceActions({ 
  invoiceId, 
  currentStatus, 
  total,
  paidAmount = 0,
  currency = "LKR",
  onStatusUpdate 
}: { 
  invoiceId: number; 
  currentStatus: string;
  total: number;
  paidAmount?: number;
  currency?: string;
  onStatusUpdate?: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to send invoice");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to send invoice.");
    } finally {
      setIsSending(false);
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
      <div className="flex gap-2 flex-wrap">
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={() => setIsPaymentModalOpen(true)} 
            className="btn-secondary text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-2 border-emerald-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            Record Payment
          </button>
        )}
        
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={handleSend} 
            disabled={isSending}
            className="btn-primary flex items-center gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Client
          </button>
        )}

        <button 
          onClick={handleDuplicate} 
          disabled={isDuplicating}
          className="btn-secondary flex items-center gap-2"
        >
          {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Duplicate
        </button>

        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
          <button 
            onClick={handleCancel} 
            disabled={isCancelling}
            className="btn-secondary text-destructive hover:bg-destructive/10 flex items-center gap-2 border-destructive/20"
          >
            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel Invoice
          </button>
        )}
      </div>

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
    </>
  );
}
