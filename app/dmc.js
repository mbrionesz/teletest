/* Parse the public DMC data grammar without eval, script injection or executing remote code. */
(function () {
  'use strict';
  function wallTime(year, month, day, hour, minute, zone) {
    var wall = Date.UTC(year, month - 1, day, hour, minute), guess = wall;
    var f = new Intl.DateTimeFormat('en-GB', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    for (var i = 0; i < 3; i++) {
      var p = {};
      f.formatToParts(new Date(guess)).forEach(function (v) { p[v.type] = v.value; });
      var shown = Date.UTC(+p.year,+p.month - 1,+p.day,+p.hour % 24,+p.minute);
      guess += wall - shown;
    }
    return guess;
  }
  window.DMC = {
    parse: function (text, city) {
      if (typeof text !== 'string' || text.length > 16384) { return null; }
      var code = window.ORBITA_WEATHER.stations[city];
      if (!code || !/^[A-Z]{4}$/.test(code)) { return null; }
      // Remove comments so historical examples are never mistaken for live records.
      text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      var re = /CondicionActualMetar\['([A-Z]{4})'\]\s*=\s*'([^'\r\n]*)'\s*;/g, match, found = null, count = 0;
      while ((match = re.exec(text))) { if (match[1] === code) { found = match[2]; count++; } }
      if (count !== 1 || !found) { return null; }
      var parts = found.split('|');
      if (parts.length !== 11 || parts[0] !== code || !/^\d{2}:\d{2}$/.test(parts[1]) || !/^-?\d+(\.\d+)?$/.test(parts[6])) { return null; }
      var updated = /CondicionActualMetar_actualizado\s*=\s*'(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2} hrs\.'/g.exec(text);
      if (!updated) { return null; }
      var hour = +parts[1].slice(0,2), minute = +parts[1].slice(3);
      if (hour > 23 || minute > 59) { return null; }
      // DMC's publication timestamp is mainland local time. Each station reports its local hour.
      var publication = wallTime(+updated[1],+updated[2],+updated[3],+updated[4],+updated[5],'America/Santiago');
      var observed = wallTime(+updated[1],+updated[2],+updated[3],hour,minute,Profile.zone(city));
      if (observed > publication + 5 * 60000) {
        var prior = new Date(Date.UTC(+updated[1],+updated[2]-1,+updated[3])-86400000);
        observed = wallTime(prior.getUTCFullYear(),prior.getUTCMonth()+1,prior.getUTCDate(),hour,minute,Profile.zone(city));
      }
      var condition = parts[10].toLowerCase(), key = 'unknown';
      if (/tormenta/.test(condition)) { key = 'storm'; }
      else if (/nieve|nevada/.test(condition)) { key = 'snow'; }
      else if (/lluvia|llovizna|chubasco/.test(condition)) { key = 'rain'; }
      else if (/niebla|neblina|bruma/.test(condition)) { key = 'fog'; }
      else if (/parcial|escasa/.test(condition)) { key = 'partly_cloudy'; }
      else if (/cubierto|nublado/.test(condition)) { key = 'cloudy'; }
      else if (/despejado/.test(condition)) { key = 'clear'; }
      return {city:city,temperatureC:Number(parts[6]),condition:key,observedAt:new Date(observed).toISOString(),station:code,source:'DMC'};
    }
  };
})();
