"use client";

import dynamic from "next/dynamic";

export const InvoicePDFGenerator = dynamic(
  () => import("./InvoicePDFGenerator").then((mod) => mod.InvoicePDFGenerator),
  { ssr: false }
);

export const QuotePDFGenerator = dynamic(
  () => import("./QuotePDFGenerator").then((mod) => mod.QuotePDFGenerator),
  { ssr: false }
);
