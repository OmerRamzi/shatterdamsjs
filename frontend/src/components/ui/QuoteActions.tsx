"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2, Copy, FileText, XCircle } from "lucide-react";

export function QuoteActions({ quoteId, currentStatus, convertedToInvoiceId, onStatusUpdate }: { quoteId: number, currentStatus: string, convertedToInvoiceId?: number, onStatusUpdate?: () => void }) {
  const [isSending, setIsSending] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to send quote");
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
  
  const handleMarkRejected = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!res.ok) throw new Error("Failed to update status");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to mark as rejected.");
    } finally {
      setIsMarking(false);
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/convert-to-invoice`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to convert quote");
      const data = await res.json();
      if (data.invoiceId) {
        window.location.href = `/admin/invoices/${data.invoiceId}`;
      } else {
        if (onStatusUpdate) onStatusUpdate();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to convert to invoice.");
    } finally {
      setIsConverting(false);
    }
  };
  
  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to duplicate quote");
      const data = await res.json();
      if (data.quoteId) {
        window.location.href = `/admin/quotes/${data.quoteId}`;
      } else {
        if (onStatusUpdate) onStatusUpdate();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to duplicate quote.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const canSend = currentStatus === 'draft' || currentStatus === 'sent';
  const canAccept = currentStatus === 'sent';
  const canConvert = currentStatus === 'accepted' && !convertedToInvoiceId;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        
        {canConvert && (
          <button 
            onClick={() => openConfirm(
              "Convert to Invoice", 
              "This will generate a new draft invoice based on this quotation.", 
              handleConvert
            )}
            disabled={isConverting}
            className="btn-primary flex items-center gap-2"
          >
            {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Convert to Invoice
          </button>
        )}
        
        {canAccept && (
          <>
            <button 
              onClick={() => openConfirm(
                "Mark as Accepted", 
                "Are you sure you want to manually mark this quote as accepted by the client?", 
                handleMarkAccepted
              )}
              disabled={isMarking}
              className="btn-secondary text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-2 border-emerald-500/20"
            >
              {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark Accepted
            </button>
            <button 
              onClick={() => openConfirm(
                "Mark as Rejected", 
                "Are you sure you want to manually mark this quote as rejected by the client?", 
                handleMarkRejected
              )}
              disabled={isMarking}
              className="btn-secondary text-destructive hover:bg-destructive/10 flex items-center gap-2 border-destructive/20"
            >
              {isMarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Mark Rejected
            </button>
          </>
        )}
        
        {canSend && (
          <button 
            onClick={() => openConfirm(
              "Send to Client", 
              "This will email the quotation to the client.", 
              handleSend
            )}
            disabled={isSending}
            className={canConvert ? "btn-secondary flex items-center gap-2" : "btn-primary flex items-center gap-2"}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Client
          </button>
        )}
        
        <button 
          onClick={() => openConfirm(
            "Duplicate Quote", 
            "This will create a new draft quote with the same details.", 
            handleDuplicate
          )}
          disabled={isDuplicating}
          className="btn-secondary flex items-center gap-2"
        >
          {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          Duplicate
        </button>
      </div>
      
      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-muted-foreground mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
