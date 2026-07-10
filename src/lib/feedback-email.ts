interface FeedbackEmail {
  category: "bug" | "suggestion";
  message: string;
  displayName: string;
  email: string;
  userAgent: string | null;
  feedbackId: string;
}

export function feedbackEmailSubject(f: FeedbackEmail): string {
  const label = f.category === "bug" ? "Bug report" : "Suggestion";
  const preview =
    f.message.length > 60 ? `${f.message.slice(0, 60)}…` : f.message;
  return `[Spare Me] ${label}: ${preview}`;
}

export function feedbackEmailHtml(f: FeedbackEmail): string {
  const isBug = f.category === "bug";
  const badgeColor = isBug ? "#ef4444" : "#3b82f6";
  const badgeBg = isBug ? "#fee2e2" : "#dbeafe";
  const label = isBug ? "Bug Report" : "Suggestion";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td style="padding-bottom:20px;" align="center">
          <span style="font-size:20px;font-weight:800;color:#f1f5f9;">Spare Me<span style="color:#f59e0b;">?</span></span>
        </td></tr>

        <tr><td style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:28px;">
          <span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:.4px;">${label.toUpperCase()}</span>

          <p style="color:#f1f5f9;font-size:16px;line-height:1.6;margin:18px 0 24px;white-space:pre-wrap;">${esc(f.message)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #334155;padding-top:16px;">
            <tr>
              <td style="color:#64748b;font-size:12px;padding:12px 0 4px;width:80px;">From</td>
              <td style="color:#cbd5e1;font-size:13px;padding:12px 0 4px;">${esc(f.displayName)} &lt;${esc(f.email)}&gt;</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;vertical-align:top;">Device</td>
              <td style="color:#cbd5e1;font-size:13px;padding:4px 0;">${esc(f.userAgent ?? "unknown")}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Ref</td>
              <td style="color:#cbd5e1;font-size:13px;padding:4px 0;font-family:monospace;">${esc(f.feedbackId)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding-top:20px;" align="center">
          <a href="https://supabase.com/dashboard/project/ztohbjkorybnlzzwfjhn/editor" style="color:#3b82f6;font-size:13px;text-decoration:none;font-weight:600;">Open feedback table →</a>
          <p style="color:#475569;font-size:11px;margin-top:14px;">Sent automatically by spareme.club when a player submits feedback.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
