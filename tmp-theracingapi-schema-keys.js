const names = [
  'RacecardsOddsPage',
  'RacecardsOddsProPage',
  'RacecardOdds',
  'RacecardOddsPro',
  'ResultsBasicPage',
  'ResultStandard',
  'Horse',
  'HorsePro'
];
const spec = await fetch('https://api.theracingapi.com/openapi.json').then((r) => r.json());
for (const name of names) {
  const schema = spec.components.schemas[name];
  console.log(`SCHEMA ${name}`);
  console.log(Object.keys(schema.properties || {}).join(', '));
  console.log('');
}
