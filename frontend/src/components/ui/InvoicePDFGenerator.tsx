"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateInvoicePdf(
  data: any, 
  mode: 'save' | 'base64' | 'blob' = 'save'
): string | Blob | void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const invoice = data.invoice || data;
  const client = data.client || {};
  const items = data.items || [];
  const project = data.project || null;
  const currency = invoice.currency || 'LKR';
  const companyName = data.settings?.companyName || "Shatter Agency";

  // Watermark for status
  const statusStr = (invoice.status || 'draft').toUpperCase();
  if (statusStr === 'PAID' || statusStr === 'OVERDUE' || statusStr === 'DRAFT') {
    doc.saveGraphicsState();
    doc.setFontSize(72);
    doc.setFont("helvetica", "bold");
    if (statusStr === 'PAID') {
      doc.setTextColor(220, 252, 231); // Very light emerald
    } else if (statusStr === 'OVERDUE') {
      doc.setTextColor(254, 226, 226); // Very light rose
    } else {
      doc.setTextColor(241, 245, 249); // Very light slate
    }
    doc.text(statusStr, 35, 145, { angle: 45 });
    doc.restoreGraphicsState();
  }

  // Top Accent Bar
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 8, 'F');
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 8, 210, 1.5, 'F');

  // Company Brand Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName.toUpperCase(), 14, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Agency Management & Digital Services", 14, 29);
  doc.text("billing@meetshatter.com | https://meetshatter.com", 14, 34);

  // Large Invoice Header (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE", 196, 24, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(invoice.invoiceNumber, 196, 30, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const issueDateStr = invoice.issueDate || invoice.createdAt;
  doc.text(`Issued: ${new Date(issueDateStr).toLocaleDateString()}`, 196, 35, { align: "right" });
  if (invoice.dueDate) {
    doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 196, 40, { align: "right" });
  }

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 46, 196, 46);

  // Bill To & Project Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("BILLED TO", 14, 53);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(client.companyName || "Client Account", 14, 59);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let billToY = 64;
  if (client.contactPerson) {
    doc.text(client.contactPerson, 14, billToY);
    billToY += 5;
  }
  if (client.email) {
    doc.text(client.email, 14, billToY);
    billToY += 5;
  }
  if (client.address) {
    const splitAddr = doc.splitTextToSize(client.address, 70);
    doc.text(splitAddr, 14, billToY);
  }

  // Project Info on right
  if (project || invoice.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT / ENGAGEMENT", 120, 53);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(project?.title || invoice.title || "Services", 120, 59);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Currency: ${currency}`, 120, 64);
    doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, 120, 69);
  }

  // Line items table
  const tableData = items.map((item: any) => [
    item.description,
    item.quantity.toString(),
    `${currency} ${parseFloat(item.unitPrice || '0').toFixed(2)}`,
    `${currency} ${parseFloat(item.amount || '0').toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 4,
      textColor: [30, 41, 59],
      lineColor: [241, 245, 249],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Totals Section
  let currentY = finalY + 10;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal:", 140, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${parseFloat(invoice.subtotal || '0').toFixed(2)}`, 196, currentY, { align: "right" });
  
  if (parseFloat(invoice.tax || '0') > 0) {
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Tax:", 140, currentY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${currency} ${parseFloat(invoice.tax).toFixed(2)}`, 196, currentY, { align: "right" });
  }
  
  if (parseFloat(invoice.discount || '0') > 0) {
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Discount:", 140, currentY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`-${currency} ${parseFloat(invoice.discount).toFixed(2)}`, 196, currentY, { align: "right" });
  }
  
  currentY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(135, currentY - 2, 196, currentY - 2);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Invoice Total:", 140, currentY + 3);
  doc.text(`${currency} ${parseFloat(invoice.total || '0').toFixed(2)}`, 196, currentY + 3, { align: "right" });
  
  if (parseFloat(invoice.paidAmount || '0') > 0) {
    currentY += 9;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("Amount Paid:", 140, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${currency} ${parseFloat(invoice.paidAmount).toFixed(2)}`, 196, currentY, { align: "right" });
    
    currentY += 7;
    const balance = Math.max(0, parseFloat(invoice.total || '0') - parseFloat(invoice.paidAmount || '0'));
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(135, currentY - 4, 61, 10, 1.5, 1.5, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Balance Due:", 140, currentY + 2);
    doc.text(`${currency} ${balance.toFixed(2)}`, 194, currentY + 2, { align: "right" });
  }

  // Payment Instructions & Notes
  let notesY = finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("PAYMENT INSTRUCTIONS & BANK DETAILS", 14, notesY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Direct Bank Transfer / Wire:", 14, notesY + 5);
  doc.text("Beneficiary: Shatter Agency", 14, notesY + 10);
  doc.text("Payment Reference: " + invoice.invoiceNumber, 14, notesY + 15);

  if (invoice.notes || invoice.terms) {
    notesY += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES & TERMS", 14, notesY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const combinedNotes = [invoice.notes, invoice.terms].filter(Boolean).join("\n\n");
    const splitNotes = doc.splitTextToSize(combinedNotes, 105);
    doc.text(splitNotes, 14, notesY + 5);
  }

  // Footer banner
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your business! | Generated automatically via Shatter DAMS", 105, 287, { align: "center" });

  if (mode === 'base64') {
    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1];
  } else if (mode === 'blob') {
    return doc.output('blob');
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InvoicePDFGenerator({ data, label = "Download PDF", className = "" }: { data: any; label?: string; className?: string }) {
  const handleGeneratePDF = () => {
    generateInvoicePdf(data, 'save');
  };

  return (
    <button 
      onClick={handleGeneratePDF} 
      className={className || "btn-secondary flex items-center gap-2"}
      title="Download PDF Invoice"
    >
      <Download className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
