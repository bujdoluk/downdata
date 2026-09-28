do $$
declare
  target_user_id uuid;
  target_board_id uuid;
  preserved_slugs text[];
begin
  select id into target_user_id from auth.users where email = 'lukas.bujdos@gmail.com';

  if target_user_id is not null then
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
