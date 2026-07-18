"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InvoicePDFGenerator({ data }: { data: any }) {
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const { invoice, client, items, project } = data;
    const currency = invoice.currency || 'USD';

    // Header
    doc.setFontSize(22);
    doc.text("INVOICE", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 14, 30);
    doc.text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 35);
    if (invoice.dueDate) {
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, 40);
    }

    // Bill To
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Bill To:", 14, 55);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(client.companyName || "Unknown Client", 14, 62);
    if (client.contactPerson) doc.text(client.contactPerson, 14, 67);
    if (client.email) doc.text(client.email, 14, 72);
    if (client.address) doc.text(client.address, 14, 77);

    // Project Info
    if (project) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Project:", 120, 55);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(project.title, 120, 62);
    }

    // Table
    const tableData = items.map((item: any) => [
      item.description,
      item.quantity.toString(),
      `${currency} ${parseFloat(item.unitPrice).toFixed(2)}`,
      `${currency} ${parseFloat(item.amount).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }, // Slate 900
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 90;

    // Totals
    let currentY = finalY + 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Subtotal:", 140, currentY);
    doc.text(`${currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 180, currentY, { align: "right" });
    
    if (parseFloat(invoice.tax) > 0) {
      currentY += 8;
      doc.text("Tax:", 140, currentY);
      doc.text(`${currency} ${parseFloat(invoice.tax).toFixed(2)}`, 180, currentY, { align: "right" });
    }
    
    if (parseFloat(invoice.discount) > 0) {
      currentY += 8;
      doc.text("Discount:", 140, currentY);
      doc.text(`-${currency} ${parseFloat(invoice.discount).toFixed(2)}`, 180, currentY, { align: "right" });
    }
    
    currentY += 12;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, currentY);
    doc.text(`${currency} ${parseFloat(invoice.total).toFixed(2)}`, 180, currentY, { align: "right" });
    
    if (parseFloat(invoice.paidAmount) > 0) {
      currentY += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text("Amount Paid:", 140, currentY);
      doc.text(`-${currency} ${parseFloat(invoice.paidAmount).toFixed(2)}`, 180, currentY, { align: "right" });
      
      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Balance Due:", 140, currentY);
      doc.text(`${currency} ${(parseFloat(invoice.total) - parseFloat(invoice.paidAmount || '0')).toFixed(2)}`, 180, currentY, { align: "right" });
    }

    // Notes
    if (invoice.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Notes / Terms:", 14, currentY + 20);
      const splitNotes = doc.splitTextToSize(invoice.notes, 180);
      doc.text(splitNotes, 14, currentY + 27);
    }

    // Save
    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  return (
    <button onClick={handleGeneratePDF} className="btn-secondary flex items-center gap-2">
      <Download className="w-4 h-4" />
      Download PDF
    </button>
  );
}
