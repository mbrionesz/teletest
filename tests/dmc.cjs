const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{},Intl,Date,document:{addEventListener(){}}};vm.createContext(context);
vm.runInContext(fs.readFileSync('app/profile.js','utf8'),context);context.Profile=context.window.Profile;
vm.runInContext(fs.readFileSync('app/weather-config.js','utf8'),context);
vm.runInContext(fs.readFileSync('app/dmc.js','utf8'),context);
const parse=context.window.DMC.parse;
// A small fixture using the observed production grammar, with fixed historical timestamps.
const fixture="var CondicionActualMetar = new Array();\n"+
"CondicionActualMetar['SCQN'] = 'SCQN|22:30|101|7.2|||15.7||parcialaltanoche.png|64|Nubosidad parcial';\n"+
"CondicionActualMetar['SCIP'] = 'SCIP|20:00|110|20.4|9999||20|BKN220|parcial.png|78|Nublado';\n"+
"CondicionActualMetar['SCVM'] = '';\n"+
"var CondicionActualMetar_actualizado = '2026-11-05 22:39:01 hrs.';";
const s=parse(fixture,'Santiago');assert.equal(s.temperatureC,15.7);assert.equal(s.condition,'partly_cloudy');assert.equal(s.observedAt,'2026-11-06T01:30:00.000Z');
assert.equal(parse(fixture,'Isla de Pascua').observedAt,'2026-11-06T01:00:00.000Z');
assert.equal(parse(fixture,'Valparaíso'),null);
assert.equal(parse(fixture,'Inventada'),null);
assert.equal(parse('/* '+fixture+' */','Santiago'),null);
assert.equal(parse(fixture+"\nCondicionActualMetar['SCQN'] = '';",'Santiago'),null);
assert.equal(parse(fixture.replace('22:30','29:99'),'Santiago'),null);
assert.equal(parse(fixture+'\nwindow.executed = true;','Santiago').temperatureC,15.7);
assert.equal(context.window.executed,undefined);
assert.equal(context.Profile.format('Santiago',{hour:'2-digit',hourCycle:'h23'},new Date('2026-07-01T12:00:00Z')),'08');
assert.equal(context.Profile.format('Coyhaique',{hour:'2-digit',hourCycle:'h23'},new Date('2026-07-01T12:00:00Z')),'09');
assert.equal(context.Profile.format('Isla de Pascua',{hour:'2-digit',hourCycle:'h23'},new Date('2026-07-01T12:00:00Z')),'06');
if(fs.existsSync('/tmp/dmc-santiago-preview.js')){
 const live=parse(fs.readFileSync('/tmp/dmc-santiago-preview.js','utf8'),'Santiago');
 assert.ok(live && Number.isFinite(live.temperatureC));console.log('Live downloaded DMC sample parsed successfully:',live.station,live.observedAt);
}
console.log('PASS: DMC grammar, missing/duplicate/commented/malformed entries, no remote execution; station time conversion, winter Chile zones.');
