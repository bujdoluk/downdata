update services set slug = 'bunny' where slug = 'bunny-net';
update services set slug = 'newrelic' where slug = 'new-relic';
update services set slug = 'stabilityai' where slug = 'stability-ai';

update boards set service_slugs = array_replace(service_slugs, 'bunny-net', 'bunny');
update boards set service_slugs = array_replace(service_slugs, 'new-relic', 'newrelic');
update boards set service_slugs = array_replace(service_slugs, 'stability-ai', 'stabilityai');
