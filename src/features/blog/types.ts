// Post content is deliberately English-only (admin-authored, not i18n'd).
export type BlogPost = {
  slug: string;
  title: string;
  bodyHtml: string;
  imageUrl: string | null;
  // Shown in BlogPostMeta instead of the downDATA logo when set.
  avatarUrl: string | null;
  // Null = draft; an ISO instant = published and the date shown.
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
