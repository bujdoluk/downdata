import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";

// The target is always the caller's own session — never a client-supplied
// id — so this route can only ever delete the signed-in account itself.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Best-effort — Storage objects aren't tied to auth.users by a foreign
  // key, so this won't cascade with the user row deletion below; failure
  // here shouldn't block the actual account deletion.
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
