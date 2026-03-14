import { createClient } from "@/lib/supabase-server";
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

  // Get all subscriptions EXCEPT the sender's
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = (await (supabase as any)
    .from("push_subscriptions")
    .select("subscription, id")
    .neq("user_id", user.id)) as {
    data: { subscription: webpush.PushSubscription; id: string }[] | null;
  };

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url });
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds);
  }

  return NextResponse.json({ sent: subs.length - staleIds.length });
}
