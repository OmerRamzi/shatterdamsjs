"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";

export function InvoiceActions({ invoiceId, currentStatus, onStatusUpdate }: { invoiceId: number, currentStatus: string, onStatusUpdate?: () => void }) {
  const [isSending, setIsSending] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to send invoice");
      alert("Invoice sent successfully via Resend!");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to send invoice.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      if (!res.ok) throw new Error("Failed to update status");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to mark as paid.");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="flex gap-2">
      {currentStatus !== 'paid' && currentStatus !== 'cancelled' && (
        <button 
          onClick={handleMarkPaid} 
          disabled={isMarking}
          className="btn-secondary text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-2 border-emerald-500/20"
        >
          {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Mark Paid
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
    </div>
  );
}
