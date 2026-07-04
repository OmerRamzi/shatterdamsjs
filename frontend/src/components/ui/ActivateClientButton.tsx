"use client";

import { useTransition } from "react";

import { Mail } from "lucide-react";

export function ActivateClientButton({ clientId }: { clientId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleActivate = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/activate`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to activate');
        // We'll let the parent reload or handle state, for now this is ok
      } catch (error) {
        console.error("Failed to activate client", error);
      }
    });
  };

  return (
    <button 
      onClick={handleActivate}
      disabled={isPending}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
    >
      <Mail className="w-3 h-3" />
      {isPending ? "Sending..." : "Activate Account"}
    </button>
  );
}
