"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export function ClientQuoteAction({ quoteId, currentStatus, onStatusUpdate }: { quoteId: number, currentStatus: string, onStatusUpdate?: () => void }) {
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAccepted = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/portal/client/quotes/${quoteId}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to accept quote");
      alert("Quotation accepted!");
      if (onStatusUpdate) onStatusUpdate();
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
