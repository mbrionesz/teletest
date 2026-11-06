/* One small JSON request per 30 minutes while visible. No HTML scraping on TV. */
(function () {
  'use strict';
  var config = window.ORBITA_WEATHER, timer = null, request = null, generation = 0;
  var city = '', enabled = false, onChange = function () {}, record = null, lastAttempt = 0;
  var PERIOD = 30 * 60 * 1000, STALE = 90 * 60 * 1000;
  var conditions = { clear: 'Despejado', partly_cloudy: 'Parcialmente nublado', cloudy: 'Nublado', fog: 'Niebla', rain: 'Lluvia', snow: 'Nieve', storm: 'Tormenta', unknown: 'Condición no disponible' };
  var icons = {
    clear: '<circle cx="16" cy="16" r="6"/><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3"/>',
    partly_cloudy: '<circle cx="11" cy="11" r="6"/><path d="M9 26h15a6 6 0 0 0 0-12 8 8 0 0 0-15 3 4.5 4.5 0 0 0 0 9Z"/>',
    cloudy: '<path d="M7 25h17a6 6 0 0 0 0-12 9 9 0 0 0-17 3 4.5 4.5 0 0 0 0 9Z"/>',
    fog: '<path d="M5 11h22M2 17h24M6 23h24"/>',
    rain: '<path d="M7 20h17a5 5 0 0 0 0-10 8 8 0 0 0-15 2 4 4 0 0 0-2 8Zm2 5-2 4m10-4-2 4m10-4-2 4"/>',
    snow: '<path d="M16 3v26M5 9l22 14M5 23 27 9M12 6l4 4 4-4M12 26l4-4 4 4"/>',
    storm: '<path d="M7 19h17a5 5 0 0 0 0-10 8 8 0 0 0-15 2 4 4 0 0 0-2 8Zm10-3-5 8h6l-4 6"/>',
    unknown: '<circle cx="16" cy="16" r="12"/><path d="M12 12a4 4 0 1 1 6 3c-2 1-2 2-2 3m0 4v1"/>'
  };
  function validate(v, wanted) {
    if (!v || v.city !== wanted || typeof v.temperatureC !== 'number' || !isFinite(v.temperatureC) || v.temperatureC < -60 || v.temperatureC > 60 || !Object.prototype.hasOwnProperty.call(conditions, v.condition)) { return null; }
    var stamp = Date.parse(v.observedAt);
    if (!isFinite(stamp) || stamp > Date.now() + 5 * 60000 || typeof v.station !== 'string' || !v.station || v.station.length > 100 || v.source !== 'DMC') { return null; }
    return { city: wanted, temperatureC: v.temperatureC, condition: v.condition, observedAt: new Date(stamp).toISOString(), station: v.station, source: 'DMC' };
  }
  function readCache() {
    try { record = validate(JSON.parse(localStorage.getItem('orbita.weather.' + city)), city); } catch (e) { record = null; }
    try { var attempt = Number(localStorage.getItem('orbita.weather.attempt.' + city)); lastAttempt = attempt > 0 && attempt <= Date.now() ? attempt : 0; } catch (e) { lastAttempt = 0; }
  }
  function notify() { onChange(); }
  function stop() { clearTimeout(timer); timer = null; generation++; if (request) { request.abort(); request = null; } }
  function schedule() { clearTimeout(timer); if (enabled && !document.hidden && config.endpoint) { timer = setTimeout(refresh, PERIOD); } }
  function refresh() {
    if (!enabled || document.hidden || !config.endpoint || request) { return; }
    if (Date.now() - lastAttempt < PERIOD) { schedule(); return; }
    // Only a reviewed HTTPS endpoint is allowed. The city is a query value, not a URL.
    if (!/^https:\/\//.test(config.endpoint)) { return; }
    lastAttempt = Date.now();
    try { localStorage.setItem('orbita.weather.attempt.' + city, String(lastAttempt)); } catch (e) { /* optional persistence */ }
    var token = generation, target = city, x = new XMLHttpRequest(); request = x;
    x.open('GET', config.format === 'dmc' ? config.endpoint : config.endpoint + (config.endpoint.indexOf('?') < 0 ? '?' : '&') + 'city=' + encodeURIComponent(city));
    x.timeout = 8000;
    x.onprogress = function (e) { if (e.loaded > 16384) { x.abort(); } };
    function finish() { if (token !== generation) { return; } request = null; notify(); schedule(); }
    x.onload = function () {
      if (token !== generation) { return; }
      if (x.status === 200 && x.responseText.length <= 16384) {
        var value = null;
        try { value = validate(config.format === 'dmc' ? DMC.parse(x.responseText, target) : JSON.parse(x.responseText), target); } catch (e) { /* invalid upstream */ }
        if (value) { record = value; try { localStorage.setItem('orbita.weather.' + target, JSON.stringify(record)); } catch (e) { /* cache optional */ } }
      }
      finish();
    };
    x.onerror = x.ontimeout = x.onabort = finish;
    try { x.send(); } catch (e) { finish(); }
  }
  var W = window.Weather = {
    cities: config.cities,
    configure: function (want, active, callback) {
      var changed = want !== city || active !== enabled;
      onChange = callback;
      if (!changed) { return; }
      stop(); city = want; enabled = active; lastAttempt = 0; readCache(); notify();
      if (enabled) { refresh(); }
    },
    snapshot: function () {
      if (!enabled) { return null; }
      if (!record) { return { city: city, available: false, status: config.endpoint ? 'Sin datos · revisa conexión y hora del TV' : 'Conexión DMC pendiente' }; }
      return { city: city, available: true, temperature: Math.round(record.temperatureC), condition: conditions[record.condition], icon: record.condition, observedAt: record.observedAt, station: record.station, stale: Date.now() - Date.parse(record.observedAt) > STALE };
    },
    icon: function (key) { return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[key || 'unknown'] + '</svg>'; },
    tick: notify
  };
  document.addEventListener('visibilitychange', function () { stop(); if (!document.hidden && enabled) { notify(); refresh(); schedule(); } });
})();
