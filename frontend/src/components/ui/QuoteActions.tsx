"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";

export function QuoteActions({ quoteId, currentStatus, onStatusUpdate }: { quoteId: number, currentStatus: string, onStatusUpdate?: () => void }) {
  const [isSending, setIsSending] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to send quote");
      alert("Quotation sent successfully via Resend!");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to send quote.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAccepted = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      });
      if (!res.ok) throw new Error("Failed to update status");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to mark as accepted.");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="flex gap-2">
      {currentStatus !== 'accepted' && currentStatus !== 'rejected' && (
        <button 
          onClick={handleMarkAccepted} 
          disabled={isMarking}
          className="btn-secondary text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-2 border-emerald-500/20"
        >
          {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Mark Accepted
        </button>
      )}
      
      {currentStatus !== 'accepted' && currentStatus !== 'rejected' && (
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
