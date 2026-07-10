import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { feedbackEmailHtml, feedbackEmailSubject } from "@/lib/feedback-email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, message, userAgent } = await request.json();
  if (
    (category !== "bug" && category !== "suggestion") ||
    typeof message !== "string" ||
    message.trim().length < 3 ||
    message.length > 2000
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      category,
      message: message.trim(),
      user_agent: typeof userAgent === "string" ? userAgent : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Email notification is best-effort — a mail outage must not lose feedback
  if (process.env.RESEND_API_KEY && process.env.FEEDBACK_NOTIFY_EMAIL) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const payload = {
      category,
      message: message.trim(),
      displayName: profile?.display_name ?? "Unknown",
      email: user.email ?? "no email",
      userAgent: typeof userAgent === "string" ? userAgent : null,
      feedbackId: inserted.id,
    } as const;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Spare Me Feedback <feedback@spareme.club>",
        to: [process.env.FEEDBACK_NOTIFY_EMAIL],
        subject: feedbackEmailSubject(payload),
        html: feedbackEmailHtml(payload),
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
