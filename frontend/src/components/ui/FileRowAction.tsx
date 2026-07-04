"use client";

import { useState } from "react";
import { Download, Trash2, CheckCircle, Clock } from "lucide-react";

export function FileRowAction({ fileId, currentStatus, userRole, onStatusUpdate, onDeleteSuccess }: { fileId: number, currentStatus: string, userRole?: string, onStatusUpdate?: () => void, onDeleteSuccess?: () => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/download`);
      if (!res.ok) throw new Error("Failed to get download URL");
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      alert("Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/files/${fileId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error(error);
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete file");
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (error) {
      console.error(error);
      alert("Failed to delete file");
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {/* Workflow Status Quick Actions */}
      {currentStatus === "internal_review" && userRole !== "client" && (
        <button 
          onClick={() => handleStatusUpdate("client_review")}
          disabled={isUpdating}
          className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
        >
          <Clock className="w-3 h-3" /> Send to Client
        </button>
      )}
      {currentStatus === "client_review" && (
        <button 
          onClick={() => handleStatusUpdate("approved")}
          disabled={isUpdating}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-md px-2 py-1 flex items-center gap-1 transition-colors"
        >
          <CheckCircle className="w-3 h-3" /> Approve
        </button>
      )}

      {/* Primary Actions */}
      <button 
        onClick={handleDownload}
        disabled={isDownloading}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
      
      {userRole !== "client" && (
        <button 
          onClick={handleDelete}
          disabled={isUpdating}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
