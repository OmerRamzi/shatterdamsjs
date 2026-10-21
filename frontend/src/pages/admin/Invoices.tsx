import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Pencil, 
  Trash2, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Send,
  CheckCircle2,
  Download,
  AlertTriangle,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  Building2,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { generateInvoicePdf } from "../../components/ui/InvoicePDFGenerator";
import { SendInvoiceModal } from "../../components/ui/SendInvoiceModal";
import { PaymentModal } from "../../components/ui/PaymentModal";

interface InvoiceStats {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  statusCounts: Record<string, number>;
}

export default function AdminInvoicesPage() {
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    overdueAmount: 0,
    statusCounts: { all: 0, draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Search state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Modals state for row actions
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchInvoices = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    fetch(`/api/invoices?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setInvoicesList(list);
        setTotal(typeof res?.total === 'number' ? res.total : list.length);
        if (res?.stats) {
          setStats(res.stats);
        }
      })
      .catch(err => {
        console.error("Failed to load invoices:", err);
        setInvoicesList([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  }, [search, status, page]);

  useEffect(() => {
    const delay = setTimeout(() => fetchInvoices(), 300);
    return () => clearTimeout(delay);
  }, [fetchInvoices]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting invoice');
    }
  };

  // Quick Action Handlers
  const handleOpenSend = async (invItem: any) => {
    setActionLoadingId(invItem.invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invItem.invoice.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setSelectedInvoiceData(fullData);
        setIsSendModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load invoice details for email.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenPayment = (invItem: any) => {
    setSelectedInvoiceData({
      invoice: invItem.invoice,
      client: invItem.client,
      project: invItem.project
    });
    setIsPaymentModalOpen(true);
  };

  const handleQuickDownload = async (invItem: any) => {
    setActionLoadingId(invItem.invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invItem.invoice.id}`);
      if (res.ok) {
        const fullData = await res.json();
        generateInvoicePdf(fullData, 'save');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (invoicesList.length === 0) return alert("No invoices to export.");
    const headers = ["Invoice Number", "Client Company", "Date Issued", "Due Date", "Currency", "Total Amount", "Paid Amount", "Balance Due", "Status"];
    const rows = invoicesList.map(({ invoice, client }: any) => {
      const totalAmt = parseFloat(invoice.total || '0');
      const paidAmt = parseFloat(invoice.paidAmount || '0');
      const balance = Math.max(0, totalAmt - paidAmt);
      return [
        `"${invoice.invoiceNumber || ''}"`,
        `"${(client?.companyName || 'Unknown').replace(/"/g, '""')}"`,
        `"${invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : ''}"`,
        `"${invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''}"`,
        `"${invoice.currency || 'LKR'}"`,
        totalAmt.toFixed(2),
        paidAmt.toFixed(2),
        balance.toFixed(2),
        `"${invoice.status || 'draft'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const statuses = [
    { label: 'All', value: '', count: stats.statusCounts.all },
    { label: 'Draft', value: 'draft', count: stats.statusCounts.draft },
    { label: 'Sent', value: 'sent', count: stats.statusCounts.sent },
    { label: 'Paid', value: 'paid', count: stats.statusCounts.paid },
    { label: 'Overdue', value: 'overdue', count: stats.statusCounts.overdue },
    { label: 'Cancelled', value: 'cancelled', count: stats.statusCounts.cancelled },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Financials & Billing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage billing, send email invoices with CC & PDF attachments, and track payment collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm transition-all shadow-xs"
            title="Export invoices list to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <Link 
            to="/invoices/new" 
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoiced */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            LKR {stats.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across all issued invoices</p>
        </div>

        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            LKR {stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Successfully cleared payments</p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Outstanding</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            LKR {stats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sent & pending payment</p>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overdue</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              LKR {stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {stats.overdueCount > 0 && (
              <span className="text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-0.5 rounded-full">
                {stats.overdueCount} {stats.overdueCount === 1 ? 'invoice' : 'invoices'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires immediate follow-up</p>
        </div>
      </div>

      {/* Main Table & Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Status Navigation Tabs with live badge counters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {statuses.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setPage(1); }}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    status === s.value 
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{s.label}</span>
                  {s.count !== undefined && (
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      status === s.value
                        ? 'bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-950 font-black'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {s.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Search Input */}
            <div className="relative min-w-[240px] max-w-md w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, client, or title..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-extrabold">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Client & Project</th>
                <th className="px-5 py-3.5">Issue Date</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoicesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mb-2 mx-auto opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or status filter.</p>
                  </td>
                </tr>
              ) : (
                invoicesList.map((item: any) => {
                  const { invoice, client, project } = item;
                  if (!invoice) return null;
                  const isActionLoading = actionLoadingId === invoice.id;
                  const balanceDue = Math.max(0, parseFloat(invoice.total || '0') - parseFloat(invoice.paidAmount || '0'));

                  return (
                    <tr 
                      key={invoice.id} 
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        invoice.status === 'overdue' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Invoice Number */}
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <Link 
                          to={`/invoices/${invoice.id}`} 
                          className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5"
                        >
                          <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{invoice.invoiceNumber}</span>
                        </Link>
                      </td>

                      {/* Client & Project */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {client?.companyName || 'Unknown Client'}
                          </span>
                          {project && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                              {project.title}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 text-xs">
                        {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-4 text-xs">
                        {invoice.dueDate ? (
                          <span className={invoice.status === 'overdue' ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Amount & Balance */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {invoice.currency || 'LKR'} {parseFloat(invoice.total || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {parseFloat(invoice.paidAmount || '0') > 0 && invoice.status !== 'paid' && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                              Due: {invoice.currency || 'LKR'} {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' :
                          invoice.status === 'sent' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400' :
                          invoice.status === 'overdue' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400' :
                          invoice.status === 'cancelled' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            invoice.status === 'paid' ? 'bg-emerald-500' :
                            invoice.status === 'sent' ? 'bg-sky-500' :
                            invoice.status === 'overdue' ? 'bg-rose-500 animate-pulse' :
                            invoice.status === 'cancelled' ? 'bg-slate-400' :
                            'bg-slate-400'
                          }`} />
                          <span>{invoice.status}</span>
                        </span>
                      </td>

                      {/* Quick Action Icons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Send / Resend Email with CC & PDF */}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => handleOpenSend(item)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title={invoice.status === 'overdue' ? 'Send Overdue Reminder' : invoice.status === 'sent' ? 'Resend Email Invoice' : 'Send Invoice Email'}
                            >
                              {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Record Payment */}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => handleOpenPayment(item)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              title="Record Payment"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Download PDF */}
                          <button
                            onClick={() => handleQuickDownload(item)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* View */}
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit */}
                          <Link 
                            to={`/invoices/${invoice.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Invoice"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button 
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< md screens) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <span>Loading invoices...</span>
            </div>
          ) : invoicesList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Receipt className="w-8 h-8 mb-2 mx-auto opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No invoices found</p>
            </div>
          ) : (
            invoicesList.map((item: any) => {
              const { invoice, client, project } = item;
              if (!invoice) return null;
              const isActionLoading = actionLoadingId === invoice.id;
              const balanceDue = Math.max(0, parseFloat(invoice.total || '0') - parseFloat(invoice.paidAmount || '0'));

              return (
                <div key={invoice.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link to={`/invoices/${invoice.id}`} className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-amber-500" />
                      <span>{invoice.invoiceNumber}</span>
                    </Link>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' :
                      invoice.status === 'sent' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400' :
                      invoice.status === 'overdue' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {client?.companyName || 'Unknown Client'}
                    </p>
                    {project && <p className="text-[11px] text-slate-400 truncate">{project.title}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</span>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-sm text-slate-900 dark:text-white">
                        {invoice.currency || 'LKR'} {parseFloat(invoice.total || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      {parseFloat(invoice.paidAmount || '0') > 0 && invoice.status !== 'paid' && (
                        <p className="text-[10px] text-amber-600 font-bold">
                          Due: {invoice.currency || 'LKR'} {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button
                          onClick={() => handleOpenSend(item)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      )}

                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button
                          onClick={() => handleOpenPayment(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleQuickDownload(item)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link 
                        to={`/invoices/${invoice.id}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Link 
                        to={`/invoices/${invoice.id}/edit`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(invoice.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination Footer */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} invoices
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mounted Modals for Quick Actions */}
      {selectedInvoiceData && (
        <>
          <SendInvoiceModal
            isOpen={isSendModalOpen}
            onClose={() => {
              setIsSendModalOpen(false);
              setSelectedInvoiceData(null);
            }}
            invoiceData={selectedInvoiceData}
            onSent={() => {
              setIsSendModalOpen(false);
              setSelectedInvoiceData(null);
              fetchInvoices();
            }}
          />

          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedInvoiceData(null);
            }}
            invoiceId={selectedInvoiceData.invoice.id}
            total={parseFloat(selectedInvoiceData.invoice.total || '0')}
            paidAmount={parseFloat(selectedInvoiceData.invoice.paidAmount || '0')}
            currency={selectedInvoiceData.invoice.currency || 'LKR'}
            onSuccess={() => {
              setIsPaymentModalOpen(false);
              setSelectedInvoiceData(null);
              fetchInvoices();
            }}
          />
        </>
      )}
    </div>
  );
}
