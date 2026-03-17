import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }

  // Upsert — one subscription per endpoint
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription: subscription,
    },
    { onConflict: "endpoint" },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
