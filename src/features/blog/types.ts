// Post content (title/body) is deliberately English-only — see
// features/blog/services/blogPosts.ts's own header comment for why this
// doesn't go through the 13-locale i18n system the rest of the app's
// user-facing strings do.
export type BlogPost = {
  slug: string;
  title: string;
  bodyHtml: string;
  imageUrl: string | null;
  // Uploaded the same way as imageUrl (see BlogPostForm's Avatar field) —
  // shown in BlogPostMeta instead of the downDATA logo when set.
  avatarUrl: string | null;
  // Null = draft. A real ISO instant = published, and is the date shown.
  publishedAt: string | null;
  createdAt: string;
};

export type BlogPostInput = {
  title: string;
  slug: string;
  bodyHtml: string;
  imageUrl: string | null;
  avatarUrl: string | null;
};
