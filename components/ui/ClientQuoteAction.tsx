"use client";

import { useState } from "react";
import { acceptQuote } from "@/app/actions/quotes";
import { CheckCircle, Loader2 } from "lucide-react";

export function ClientQuoteAction({ quoteId, currentStatus }: { quoteId: number, currentStatus: string }) {
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAccepted = async () => {
    setIsMarking(true);
    try {
      await acceptQuote(quoteId);
      alert("Quotation accepted!");
    } catch (error) {
      console.error(error);
      alert("Failed to accept quote.");
    } finally {
      setIsMarking(false);
    }
  };

  if (currentStatus === 'accepted' || currentStatus === 'rejected') {
    return null;
  }

  return (
    <button 
      onClick={handleMarkAccepted} 
      disabled={isMarking}
      className="btn-primary flex items-center gap-2"
    >
      {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
      Accept Quotation
    </button>
  );
}
