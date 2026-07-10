import { createClient } from "@/lib/supabase-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Deleting the profile cascades to sessions, games, frames, caches, etc.
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json(
      { error: "Failed to delete data" },
      { status: 500 },
    );
  }

  await admin.from("push_subscriptions").delete().eq("user_id", user.id);
  const { data: avatarFiles } = await admin.storage
    .from("avatars")
    .list(user.id);
  if (avatarFiles?.length) {
    await admin.storage
      .from("avatars")
      .remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
