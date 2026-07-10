"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, Lightbulb, Send } from "lucide-react";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";

export default function FeedbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [category, setCategory] = useState<"bug" | "suggestion">("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast("Tell us a little more", "error");
      return;
    }
    setSending(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message: trimmed,
        userAgent: navigator.userAgent,
      }),
    });
    setSending(false);
    if (!res.ok) {
      toast("Failed to send. Try again.", "error");
      return;
    }
    toast("Thanks! Feedback sent.");
    router.push("/profile");
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-extrabold">Feedback</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategory("bug")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-colors ${
              category === "bug"
                ? "border-red/40 bg-red/10 text-red"
                : "border-border bg-surface-light text-text-muted"
            }`}
          >
            <Bug size={16} />
            Report a bug
          </button>
          <button
            type="button"
            onClick={() => setCategory("suggestion")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-colors ${
              category === "suggestion"
                ? "border-blue/40 bg-blue/10 text-blue"
                : "border-border bg-surface-light text-text-muted"
            }`}
          >
            <Lightbulb size={16} />
            Suggest an idea
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder={
            category === "bug"
              ? "What happened? What did you expect instead?"
              : "What would make Spare Me better?"
          }
          className="w-full rounded-lg border border-border bg-surface-light px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
        />

        <button
          type="submit"
          disabled={sending || message.trim().length < 3}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue to-blue-dark py-3 text-sm font-bold text-white shadow-lg shadow-blue/25 active:scale-[0.97] disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? "Sending..." : "Send Feedback"}
        </button>

        <p className="text-center text-xs text-text-muted">
          Your feedback goes straight to the developer. Thank you!
        </p>
      </form>
    </div>
  );
}
