"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";

export function FileComments({ fileId }: { fileId: number }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/files/${fileId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment })
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      await fetchComments();
    } catch (error) {
      console.error(error);
      alert("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-3 text-muted-foreground">
        <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
      </h4>
      
      <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-2">
        {comments.map((c) => (
          <div key={c.id} className="bg-secondary/50 rounded-lg p-3 text-sm">
            <p className="text-foreground">{c.comment}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(c.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No comments yet.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment or feedback..."
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button 
          type="submit" 
          disabled={isSubmitting || !newComment.trim()}
          className="btn-primary p-1.5 rounded-md disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
