import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { nowIso } from "@/lib/formatTime";
import type { BlogPost, BlogPostInput } from "@/features/blog/types";

type BlogPostRow = {
  slug: string;
  title: string;
  body_html: string;
  image_url: string | null;
  avatar_url: string | null;
  published_at: string | null;
  created_at: string;
};

function toBlogPost(row: BlogPostRow): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    bodyHtml: row.body_html,
    imageUrl: row.image_url,
    avatarUrl: row.avatar_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

// Service-role throughout: blog_posts has no per-row ownership.
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as BlogPostRow[] | null)?.map(toBlogPost) ?? [];
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BlogPostRow[] | null)?.map(toBlogPost) ?? [];
}

// Ignores draft state: public callers must check `publishedAt` themselves.
// cache() dedupes generateMetadata's and the page's calls.
export const resolvePostBySlug = cache(async (slug: string): Promise<BlogPost | undefined> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toBlogPost(data as BlogPostRow) : undefined;
});

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug: input.slug,
      title: input.title,
      body_html: input.bodyHtml,
      image_url: input.imageUrl,
      avatar_url: input.avatarUrl,
    })
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .single();
  if (error) throw error;
  return toBlogPost(data as BlogPostRow);
}

// slug (primary key) isn't editable, to avoid breaking existing links;
// delete-and-recreate is the deliberate path.
export async function updatePost(
  slug: string,
  input: Omit<BlogPostInput, "slug">,
): Promise<BlogPost | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .update({ title: input.title, body_html: input.bodyHtml, image_url: input.imageUrl, avatar_url: input.avatarUrl })
    .eq("slug", slug)
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .maybeSingle();
  if (error) throw error;
  return data ? toBlogPost(data as BlogPostRow) : undefined;
}

export async function deletePost(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("blog_posts").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function setPostPublished(slug: string, published: boolean): Promise<BlogPost | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .update({ published_at: published ? nowIso() : null })
    .eq("slug", slug)
    .select("slug, title, body_html, image_url, avatar_url, published_at, created_at")
    .maybeSingle();
  if (error) throw error;
  return data ? toBlogPost(data as BlogPostRow) : undefined;
}
