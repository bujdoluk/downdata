-- Tracking becomes purely "this service is on one of my boards" — the
-- separate global `services` table ("My Services", shared by every
-- logged-in user with no owner of its own) is retired. Its two remaining
-- real jobs — validating a brand-new host actually looks like a
-- Statuspage site, and making sure `catalog` has an entry for it — move
-- into the board-add flow (see lib/catalog.ts's ensureCatalogEntry,
-- added alongside this migration; lib/services.ts is deleted).
--
-- `services` today is your own dev/testing data, not something to hand
-- out to every future signup, so it's folded into your own account's
-- earliest board (looked up by email) before the table is dropped — not
-- fanned out to every user. Any signup after this migration starts with
-- an empty board, which is the right default for real SaaS onboarding.
do $$
declare
  target_user_id uuid;
  target_board_id uuid;
  preserved_slugs text[];
begin
  select id into target_user_id from auth.users where email = 'lukas.bujdos@gmail.com';

  if target_user_id is not null then
    -- boards has no created_at to order by — id is a random uuid, so this
    -- picks an arbitrary-but-deterministic one of the account's boards,
    -- not necessarily the literal first one created. Good enough for a
    -- one-shot data-preservation step.
    select id into target_board_id from boards where user_id = target_user_id order by id asc limit 1;

    if target_board_id is not null then
      select array_agg(distinct slug) into preserved_slugs from services;

      if preserved_slugs is not null then
        update boards
        set service_slugs = (select array_agg(distinct s) from unnest(service_slugs || preserved_slugs) as s)
        where id = target_board_id;
      end if;
    end if;
  end if;
end $$;

drop table services;
