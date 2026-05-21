const spec = await fetch('https://api.theracingapi.com/openapi.json').then((r) => r.json());
const raceRunnerSchema = spec.components.schemas.RacecardOdds.properties.runners.items;
const resultRunnerSchema = spec.components.schemas.ResultStandard.properties.runners.items;
const refs = [
  ['Racecard runner', raceRunnerSchema['$ref']],
  ['Result runner', resultRunnerSchema['$ref']],
  ['Betting forecast', spec.components.schemas.RacecardOdds.properties.betting_forecast.items['$ref']],
  ['Tip', spec.components.schemas.RacecardOdds.properties.tip['$ref']],
  ['Verdict', spec.components.schemas.RacecardOdds.properties.verdict['$ref']]
];
for (const [label, ref] of refs) {
  console.log(label + ': ' + ref);
  const name = ref.split('/').pop();
  const schema = spec.components.schemas[name];
  console.log(Object.keys(schema.properties || {}).join(', '));
  console.log('');
}
