"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function QuotePDFGenerator({ data }: { data: any }) {
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const { quote, client, items, project } = data;

    // Header
    doc.setFontSize(22);
    doc.text("QUOTATION", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Quote Number: ${quote.quoteNumber}`, 14, 30);
    doc.text(`Date Issued: ${new Date(quote.createdAt || new Date()).toLocaleDateString()}`, 14, 35);
    if (quote.validUntil) {
      doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 14, 40);
    }

    // Bill To
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Prepared For:", 14, 55);
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
      `$${parseFloat(item.unitPrice).toFixed(2)}`,
      `$${parseFloat(item.amount).toFixed(2)}`
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
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Subtotal:", 140, finalY + 10);
    doc.text(`$${parseFloat(quote.subtotal).toFixed(2)}`, 180, finalY + 10, { align: "right" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, finalY + 20);
    doc.text(`$${parseFloat(quote.total).toFixed(2)}`, 180, finalY + 20, { align: "right" });

    // Notes
    if (quote.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Notes / Terms:", 14, finalY + 40);
      const splitNotes = doc.splitTextToSize(quote.notes, 180);
      doc.text(splitNotes, 14, finalY + 47);
    }

    // Save
    doc.save(`${quote.quoteNumber}.pdf`);
  };

  return (
    <button onClick={handleGeneratePDF} className="btn-secondary flex items-center gap-2">
      <Download className="w-4 h-4" />
      Download PDF
    </button>
  );
}
