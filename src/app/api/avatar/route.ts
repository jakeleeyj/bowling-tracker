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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Validate type and size
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  // Add cache-buster to force refresh
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  return NextResponse.json({ avatarUrl });
}
