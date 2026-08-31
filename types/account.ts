// The signed-in user's own identity, as shown in the Sidebar's avatar
// trigger and the /account page — both read/write the same TanStack Query
// cache entry (queryKeys.account()) so an avatar or timezone change on one
// is reflected on the other without a refetch.
export type Account = {
  id: string;
  email: string;
  avatarUrl: string | null;
  timeZone: string;
};
