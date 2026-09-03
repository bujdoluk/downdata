import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await supabase.storage
    .from("avatars")
    .remove([`${user.id}/avatar`])
    .catch(() => {});

  const { error } = await getSupabaseClient().auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "Couldn't delete your account. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
