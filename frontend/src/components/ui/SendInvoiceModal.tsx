"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  X, 
  Loader2, 
  FileText, 
  Paperclip, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from "lucide-react";
import { generateInvoicePdf } from "./InvoicePDFGenerator";

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoiceData: any;
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  onSent,
  invoiceData
}: SendInvoiceModalProps) {
  const invoice = invoiceData?.invoice || invoiceData || {};
  const client = invoiceData?.client || {};
  const items = invoiceData?.items || [];
  const currency = invoice.currency || 'LKR';
  const companyName = invoiceData?.settings?.companyName || "Shatter";

  const totalFormatted = `${currency} ${parseFloat(invoice.total || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dueDateFormatted = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt';
  const clientName = client?.contactPerson || client?.companyName || 'Valued Client';
  const isOverdue = invoice.status === 'overdue';

  const defaultSubject = isOverdue
    ? `Payment Reminder: Invoice ${invoice.invoiceNumber} from ${companyName} (${totalFormatted})`
    : `Invoice ${invoice.invoiceNumber} from ${companyName} (${totalFormatted})`;

  const defaultMessage = isOverdue
    ? `Dear ${clientName},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} was due on ${dueDateFormatted}.\n\nTotal Due: ${totalFormatted}\n\nPlease find the invoice PDF attached for your convenience. Kindly process payment at your earliest convenience or let us know if you have any questions.\n\nThank you,\n${companyName} Billing Team`
    : `Dear ${clientName},\n\nPlease find attached invoice ${invoice.invoiceNumber} for recent project services.\n\nTotal Due: ${totalFormatted}\nDue Date: ${dueDateFormatted}\n\nPlease review the attached invoice. You do not need to log into the client portal to access it.\n\nThank you for your business!\n\nBest regards,\n${companyName}`;

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [includePortalLink, setIncludePortalLink] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(client?.email || "");
      setCc("");
      setBcc("");
      setShowBcc(false);
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setAttachPdf(true);
      setIncludePortalLink(true);
      setActiveTab('compose');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, client?.email, defaultSubject, defaultMessage]);

  if (!isOpen) return null;

  const handleAddCcSelf = () => {
    const currentList = cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [];
    const myEmail = "billing@meetshatter.com";
    if (!currentList.includes(myEmail)) {
      currentList.push(myEmail);
      setCc(currentList.join(', '));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      setError("Please specify at least one recipient email in 'To'.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      let pdfBase64: string | undefined = undefined;
      if (attachPdf) {
        // Generate PDF base64 using client-side jsPDF
        const generated = generateInvoicePdf(invoiceData, 'base64');
        if (typeof generated === 'string') {
          pdfBase64 = generated;
        }
      }

      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.split(',').map(s => s.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          bcc: bcc ? bcc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          subject,
          message,
          attachPdf,
          pdfBase64,
          includePortalLink
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email.");
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSent) onSent();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Send invoice error:", err);
      setError(err.message || "An unexpected error occurred while sending the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Send Invoice {invoice.invoiceNumber}</span>
                {isOverdue && (
                  <span className="text-[10px] uppercase font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-0.5 rounded-full">
                    Overdue
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email invoice directly to client with PDF attachment and CC options
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6 bg-white dark:bg-slate-900 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'compose'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Compose Email</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Preview Email</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">Invoice email sent successfully!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Recipients notified and status updated to Sent.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'compose' ? (
            <form id="send-invoice-form" onSubmit={handleSend} className="space-y-4">
              {/* To field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  To (Recipient Email) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="client@company.com (comma separated for multiple)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* CC field with Quick Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CC (Carbon Copy)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCcSelf}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>CC Billing Team</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="accounting@client.com, director@client.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Multiple addresses can be comma-separated. Everyone on CC receives a copy.
                </p>
              </div>

              {/* BCC Toggle & field */}
              {!showBcc ? (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add BCC</span>
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      BCC (Blind Carbon Copy)
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowBcc(false); setBcc(""); }}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="archive@meetshatter.com"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message / Cover Letter
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white resize-y font-mono text-xs"
                />
              </div>

              {/* Delivery Options Checklist */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Delivery & Attachment Settings
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Attach PDF Invoice directly to email
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      The client can view, save, or forward the official invoice PDF without needing to log in.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePortalLink}
                    onChange={(e) => setIncludePortalLink(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Include Client Portal button (Optional)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Adds an optional "View in Client Portal" link for online file review and account history.
                    </p>
                  </div>
                </label>
              </div>
            </form>
          ) : (
            /* Live Preview Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">From:</span>
                  <span className="text-slate-800 dark:text-slate-200">{companyName} Billing &lt;hello@mailer.meetshatter.com&gt;</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">To:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{to || 'client@example.com'}</span>
                </div>
                {cc && (
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-16">CC:</span>
                    <span className="text-slate-800 dark:text-slate-200">{cc}</span>
                  </div>
                )}
                {bcc && (
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-16">BCC:</span>
                    <span className="text-slate-800 dark:text-slate-200">{bcc}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">Subject:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{subject}</span>
                </div>
                {attachPdf && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="font-semibold">Attachment: {invoice.invoiceNumber}.pdf (Ready to generate)</span>
                  </div>
                )}
              </div>

              {/* Rendered Email Simulator */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white text-slate-900 text-sm">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-base">{companyName}</h4>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Official Invoice</span>
                  </div>
                  <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full uppercase">
                    Due {dueDateFormatted}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500">Invoice Number</span>
                    <p className="font-extrabold text-base text-slate-900">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase font-bold text-slate-500">Total Due</span>
                    <p className="font-black text-lg text-slate-900">{totalFormatted}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="whitespace-pre-wrap text-slate-700 text-xs sm:text-sm bg-slate-50 p-3 rounded-lg border-l-4 border-amber-400">
                    {message}
                  </div>

                  {attachPdf && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>PDF Attached:</strong> <code>{invoice.invoiceNumber}.pdf</code> will arrive in the client's inbox.</span>
                    </div>
                  )}

                  {/* Sample items table */}
                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                          <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.slice(0, 3).map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-2 font-medium">{item.description}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-right font-bold">{currency} {parseFloat(item.amount || '0').toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {includePortalLink && (
                    <div className="text-center pt-2">
                      <div className="inline-block bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-lg">
                        View in Client Portal →
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || success}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs hover:shadow transition-all disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Email...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Sent!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Invoice Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
