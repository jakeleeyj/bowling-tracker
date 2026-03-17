import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:spareme@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body, url } = await request.json();

  // Validate inputs
  if (
    typeof title !== "string" ||
    typeof body !== "string" ||
    title.length > 100 ||
    body.length > 200
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (url !== undefined && (typeof url !== "string" || !url.startsWith("/"))) {
    return NextResponse.json(
      { error: "URL must be a relative path" },
      { status: 400 },
    );
  }

  // Use service role to read all subscriptions (RLS restricts anon to own rows)
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get all subscriptions EXCEPT the sender's
  const { data: subs } = await adminClient
    .from("push_subscriptions")
    .select("subscription, id")
    .neq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url });
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as unknown as webpush.PushSubscription,
          payload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (staleIds.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent: subs.length - staleIds.length });
}
