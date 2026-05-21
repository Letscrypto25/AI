const spec = await fetch('https://api.theracingapi.com/openapi.json').then((r) => r.json());
const refs = [
  ['Racecard runner', spec.components.schemas.RacecardOdds.properties.runners.items['$ref']],
  ['Result runner', spec.components.schemas.ResultStandard.properties.runners.items['$ref']]
];
for (const [label, ref] of refs) {
  console.log(label + ': ' + ref);
  const name = ref.split('/').pop();
  const schema = spec.components.schemas[name];
  console.log(Object.keys(schema.properties || {}).join(', '));
  console.log('');
}
console.log('Tip schema type:', JSON.stringify(spec.components.schemas.RacecardOdds.properties.tip, null, 2));
console.log('Verdict schema type:', JSON.stringify(spec.components.schemas.RacecardOdds.properties.verdict, null, 2));
console.log('Betting forecast schema type:', JSON.stringify(spec.components.schemas.RacecardOdds.properties.betting_forecast, null, 2));
