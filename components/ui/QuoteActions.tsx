"use client";

import { useState } from "react";
import { sendQuoteEmail, acceptQuote } from "@/app/actions/quotes";
import { Send, CheckCircle, Loader2 } from "lucide-react";

export function QuoteActions({ quoteId, currentStatus }: { quoteId: number, currentStatus: string }) {
  const [isSending, setIsSending] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendQuoteEmail(quoteId);
      alert("Quotation sent successfully via Resend!");
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
      await acceptQuote(quoteId);
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
