/* Tizen integration informed by HorizonX's MIT-licensed platform adapter.
 * No background service, system package changes or Home interception. */
(function () {
  'use strict';
  var tz = window.tizen;
  var sample = ['Netflix', 'YouTube', 'Prime Video', 'Disney+', 'Apple TV', 'Spotify', 'Max', 'Plex', 'Samsung TV Plus', 'Internet'];
  var P = window.TV = { native: !!tz };
  P.apps = function (done, fail) {
    if (!tz) { done(sample.map(function (name, i) { return { id: 'demo.' + i, name: name, icon: '' }; })); return; }
    try {
      tz.application.getAppsInfo(function (apps) {
        var self = tz.application.getCurrentApplication().appInfo.id;
        done(apps.filter(function (a) { return a.id !== self && a.show !== false && a.name; }).map(function (a) {
          return { id: a.id, name: a.name, icon: a.iconPath || '' };
        }));
      }, fail);
    } catch (e) { fail(e); }
  };
  P.launch = function (app, fail) {
    if (!tz) { fail('Vista de demostración: en el televisor se abrirá ' + app.name + '.'); return; }
    try { tz.application.launch(app.id, function () {}, function () { fail('No se pudo abrir ' + app.name + '.'); }); }
    catch (e) { fail('El televisor no permite abrir esta aplicación.'); }
  };
  P.exit = function () {
    if (!tz) { return false; }
    try { tz.application.getCurrentApplication().exit(); return true; } catch (e) { return false; }
  };
  P.info = function () {
    var out = { model: 'Vista de demostración', firmware: 'Sin conexión al televisor', version: 'No disponible' };
    try { out.model = window.webapis.productinfo.getRealModel(); out.firmware = window.webapis.productinfo.getFirmware(); } catch (e) { /* optional API */ }
    try { out.version = tz.systeminfo.getCapability('http://tizen.org/feature/platform.version'); } catch (e) { /* desktop */ }
    return out;
  };
})();
