const targets = [
  '/v1/racecards/standard',
  '/v1/racecards/pro',
  '/v1/racecards/{race_id}/standard',
  '/v1/racecards/{race_id}/pro',
  '/v1/results/today',
  '/v1/results/{race_id}',
  '/v1/horses/{horse_id}/standard',
  '/v1/horses/{horse_id}/pro',
  '/v1/horses/{horse_id}/results',
  '/v1/jockeys/search',
  '/v1/trainers/search'
];

const spec = await fetch('https://api.theracingapi.com/openapi.json').then((r) => r.json());
for (const t of targets) {
  const schema = spec.paths[t].get.responses['200'].content['application/json'].schema;
  const ref = schema['$ref'] || schema.items?.['$ref'] || '';
  console.log(`${t} => ref=${ref} type=${schema.type || ''} title=${schema.title || ''}`);
}
