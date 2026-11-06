(function () {
  'use strict';
  var main = document.getElementById('main'), modal = document.getElementById('modal');
  var apps = [], page = 'home', manage = false, previousFocus = null, toastTimer, clockTimer, loadingError = false;
  var defaults = { favorites: [], hidden: [], initialized: false, motion: true, theme: 'violet', wallpaper: 'aurora', dim: 'balanced', weatherEnabled: false, city: 'Santiago', name: '', onboarded: false }, settings;
  try { settings = JSON.parse(localStorage.getItem('orbita.settings.v1') || 'null'); } catch (e) { settings = null; }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) { settings = {}; }
  Object.keys(defaults).forEach(function (k) { if (typeof settings[k] !== typeof defaults[k]) { settings[k] = defaults[k]; } });
  ['favorites', 'hidden'].forEach(function (k) { if (!Array.isArray(settings[k])) { settings[k] = []; } settings[k] = settings[k].filter(function (x) { return typeof x === 'string'; }); });
  if (['green', 'blue', 'violet'].indexOf(settings.theme) < 0) { settings.theme = 'violet'; }
  if (['aurora', 'ocean', 'sunset', 'mountain', 'graphite'].indexOf(settings.wallpaper) < 0) { settings.wallpaper = 'aurora'; }
  if (['soft', 'balanced', 'dark'].indexOf(settings.dim) < 0) { settings.dim = 'balanced'; }
  if (Weather.cities.indexOf(settings.city) < 0) { settings.city = 'Santiago'; }
  function save() { try { localStorage.setItem('orbita.settings.v1', JSON.stringify(settings)); } catch (e) { toast('No se pudieron guardar los cambios en este dispositivo.'); } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function toast(s) { var t = document.getElementById('toast'); t.textContent = s; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4000); }
  function appearance() { document.body.setAttribute('data-theme', settings.theme); document.body.setAttribute('data-motion', settings.motion ? 'on' : 'off'); document.body.setAttribute('data-wallpaper', settings.wallpaper); document.body.setAttribute('data-dim', settings.dim); }
  function clock() {
    Weather.tick();
    var d = new Date();
    document.getElementById('clock').textContent = Profile.format(settings.city, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'}, d);
    document.getElementById('date').textContent = Profile.format(settings.city, { weekday: 'long', day: 'numeric', month: 'long' }, d);
  }
  var wallpapers = { aurora: 'Aurora violeta', ocean: 'Océano', sunset: 'Atardecer', mountain: 'Cordillera', graphite: 'Grafito' };
  var themes = { violet: 'Lavanda', blue: 'Azul hielo', green: 'Menta' };
  function paintWeather() {
    var box = document.getElementById('weather');
    if (!box) { return; }
    var w = Weather.snapshot();
    box.hidden = !w;
    if (!w) { return; }
    var detail = w.available ? w.condition : w.status;
    var stamp = w.available ? Profile.format(settings.city, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle:'h23' }, new Date(w.observedAt)) : '';
    box.innerHTML = Weather.icon(w.icon) + '<span><strong>' + esc(w.city) + (w.available ? ' · ' + w.temperature + '°' : '') + '</strong><small>' + esc(detail) + '</small>' + (w.available ? '<small class="weather-source">' + esc((w.stale ? 'Dato antiguo · ' : '') + 'DMC · ' + stamp) + '</small>' : '') + '</span>';
    box.title = w.available ? 'Observación de la estación ' + w.station + '. No es un pronóstico.' : 'La conexión con la fuente oficial aún no está habilitada.';
  }
  function weatherSettings() {
    return '<button class="setting" data-action="weather"><span><strong>Clima discreto</strong><small>Condición actual junto al saludo. Sin animaciones.</small></span><em>' + (settings.weatherEnabled ? 'Activado' : 'Desactivado') + '</em></button>' + (settings.weatherEnabled ? '<button class="setting" data-action="city"><span><strong>Ciudad del clima</strong><small>Estaciones publicadas por la DMC; algunas pueden no tener datos.</small></span><em>' + esc(settings.city) + '</em></button>' : '');
  }
  function tile(a) {
    var name = a.name.toLowerCase(), color = '#26333d', label = a.name;
    if (name.indexOf('netflix') >= 0) { color = '#3b111b'; }
    else if (name.indexOf('youtube') >= 0) { color = '#45201f'; }
    else if (name.indexOf('prime') >= 0) { color = '#153d52'; }
    else if (name.indexOf('disney') >= 0) { color = '#252957'; }
    else if (name.indexOf('spotify') >= 0) { color = '#173d2b'; }
    else if (name.indexOf('apple') >= 0) { color = '#292b30'; }
    var icon = a.icon && /^(file:\/\/|wgt-package:\/\/|\/)/.test(a.icon) ? '<img alt="" src="' + esc(a.icon) + '">' : '<span class="wordmark">' + esc(label) + '</span>';
    return '<button class="app" data-app="' + esc(a.id) + '" aria-label="' + esc((manage ? 'Personalizar ' : 'Abrir ') + a.name) + '"><span class="tile" style="--tile:' + color + '">' + icon + (settings.favorites.indexOf(a.id) >= 0 ? '<span class="badge" aria-label="Favorita">★</span>' : '') + '</span><span class="app-name">' + esc(a.name) + (settings.hidden.indexOf(a.id) >= 0 ? ' · Oculta' : '') + '</span></button>';
  }
  function grid(list) { return list.length ? '<div class="grid">' + list.map(tile).join('') + '</div>' : '<div class="empty">' + (loadingError ? 'No pudimos consultar las aplicaciones. Vuelve a intentarlo con Actualizar.' : 'Este espacio está vacío. Personaliza tu biblioteca para elegir las aplicaciones que quieres ver.') + '</div>'; }
  function render(focusId) {
    document.querySelectorAll('[data-page]').forEach(function (b) { var active = b.getAttribute('data-page') === page; b.classList.toggle('active', active); if (active) { b.setAttribute('aria-current', 'page'); } else { b.removeAttribute('aria-current'); } });
    var demo = !TV.native ? '<div class="demo">Vista de demostración · Las aplicaciones son de ejemplo. En tu Samsung se consultarán las instaladas.</div>' : '';
    if (page === 'home') {
      var hour = Number(Profile.format(settings.city, {hour:'2-digit',hourCycle:'h23'})), hello = hour < 12 ? 'Buenos días.' : hour < 20 ? 'Buenas tardes.' : 'Buenas noches.';
      var favorites = settings.favorites.map(function (id) { return apps.filter(function (a) { return a.id === id; })[0]; }).filter(function (a) { return a && settings.hidden.indexOf(a.id) < 0; });
      main.innerHTML = '<div class="home-top"><section class="hero"><div class="eyebrow">Menos ruido. Más de lo que te gusta.</div><h1>' + esc(settings.name ? hello.slice(0,-1) + ', ' + settings.name + '.' : hello) + '<br>Este es tu espacio.</h1><p>Tus aplicaciones favoritas, sin distracciones.</p><span class="pill">Órbita TV · Vista esencial</span></section><aside id="weather" class="weather" aria-label="Condición actual" hidden></aside></div>' + demo + '<div class="section-head"><h2>Tus favoritos</h2><button class="subtle" data-action="library">Ver aplicaciones →</button></div>' + grid(favorites);
    } else if (page === 'library') {
      var visible = manage ? apps : apps.filter(function (a) { return settings.hidden.indexOf(a.id) < 0; });
      main.innerHTML = '<section class="hero"><div class="eyebrow">A tu manera</div><h1>Tu biblioteca.</h1><p>' + (manage ? 'Selecciona una app para marcarla como favorita u ocultarla. Ocultar solo cambia lo que ves en Órbita.' : 'Todo lo que necesitas, en un solo lugar.') + '</p></section>' + demo + '<div class="toolbar"><button class="action primary" data-action="manage">' + (manage ? 'Terminar de personalizar' : 'Personalizar biblioteca') + '</button><button class="action" data-action="refresh">Actualizar</button></div>' + grid(visible);
    } else {
      var info = TV.info();
      main.innerHTML = '<section class="hero"><div class="eyebrow">Lo esencial, bien hecho</div><h1>Como tú prefieras.</h1></section><div class="settings"><button class="setting" data-action="profile"><span><strong>Perfil y ubicación</strong><small>Nombre, ciudad y configuración inicial.</small></span><em>' + esc(settings.name || 'Personalizar') + '</em></button><button class="setting" data-action="time"><span><strong>Fecha y hora</strong><small>' + esc(settings.city + ' · ' + Profile.zone(settings.city)) + '</small></span><em>Reloj del TV</em></button><button class="setting" data-action="cleanup"><span><strong>Gestionar aplicaciones en Samsung</strong><small>Cómo eliminar las apps que el televisor permita.</small></span><em>Ver pasos →</em></button><button class="setting" data-action="motion"><span><strong>Movimiento</strong><small>Transiciones breves al navegar entre aplicaciones.</small></span><em>' + (settings.motion ? 'Activado' : 'Desactivado') + '</em></button><button class="setting" data-action="theme"><span><strong>Color de acento</strong><small>Un toque de color sobre un fondo oscuro.</small></span><em>' + themes[settings.theme] + '</em></button><button class="setting" data-action="wallpaper"><span><strong>Fondo de pantalla</strong><small>Paisajes y colores estáticos, sin vídeo de fondo.</small></span><em>' + wallpapers[settings.wallpaper] + '</em></button><button class="setting" data-action="dim"><span><strong>Intensidad del fondo</strong><small>Ajusta el contraste para que tus apps destaquen.</small></span><em>' + ({soft:'Luminoso',balanced:'Equilibrado',dark:'Tenue'})[settings.dim] + '</em></button>' + weatherSettings() + '<button class="setting" data-action="restore"><span><strong>Mostrar todas las aplicaciones</strong><small>Vuelve a mostrar las apps ocultas en Órbita. Conserva tus favoritos.</small></span><em>Restaurar</em></button><button class="setting" data-action="exit"><span><strong>Volver a Samsung</strong><small>Cierra Órbita y vuelve al sistema del televisor.</small></span><em>Salir →</em></button><div class="device-info">Órbita TV 0.4.0 · ' + esc(info.model) + '<br>Firmware: ' + esc(info.firmware) + '<br>Tizen: ' + esc(info.version) + '<br>RAM y procesador: no verificados para este modelo.<br>El botón Home conserva el comportamiento de Samsung.</div></div>';
    }
    paintWeather();
    main.querySelectorAll('img').forEach(function (img) { img.addEventListener('error', function () { var fallback = document.createElement('span'); fallback.className = 'wordmark'; fallback.textContent = img.closest('button').querySelector('.app-name').textContent; img.parentNode.replaceChild(fallback, img); }); });
    if (focusId) { var found = Array.prototype.filter.call(main.querySelectorAll('[data-app]'), function (b) { return b.getAttribute('data-app') === focusId; })[0]; if (found) { found.focus(); } }
  }
  function go(p) { page = p; manage = false; render(); window.scrollTo(0, 0); }
  function closeDialog() { modal.hidden = true; modal.innerHTML = ''; if (previousFocus && document.body.contains(previousFocus)) { previousFocus.focus(); } else { document.querySelector('[data-page="' + page + '"]').focus(); } }
  function dialog(title, text, actions) {
    previousFocus = document.activeElement;
    modal.innerHTML = '<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">' + esc(title) + '</h2><p>' + esc(text) + '</p>' + actions.map(function (a, i) { return '<button class="action' + (i === 0 ? ' primary' : '') + '" data-dialog="' + i + '">' + esc(a.label) + '</button>'; }).join('') + '</section>';
    modal.hidden = false;
    modal.querySelectorAll('button').forEach(function (b, i) { b.onclick = function () { closeDialog(); actions[i].run(); }; });
    modal.querySelector('button').focus();
  }
  function appDialog(a) {
    var favorite = settings.favorites.indexOf(a.id) >= 0, hidden = settings.hidden.indexOf(a.id) >= 0;
    dialog(a.name, 'Estos cambios solo afectan a Órbita; no desinstalan aplicaciones del televisor.', [
      { label: favorite ? 'Quitar de favoritos' : 'Añadir a favoritos', run: function () { settings.favorites = favorite ? settings.favorites.filter(function (id) { return id !== a.id; }) : settings.favorites.concat([a.id]); save(); render(a.id); } },
      { label: hidden ? 'Mostrar en Órbita' : 'Ocultar en Órbita', run: function () { settings.hidden = hidden ? settings.hidden.filter(function (id) { return id !== a.id; }) : settings.hidden.concat([a.id]); save(); render(a.id); } },
      { label: 'Cancelar', run: function () {} }
    ]);
  }
  function refreshSettings(action) { save(); appearance(); render(); var b = document.querySelector('[data-action="' + action + '"]'); if (b) { b.focus(); } }
  function wallpaperDialog() {
    dialog('Elige tu paisaje', 'Fondos estáticos para mantener la navegación ligera.', Object.keys(wallpapers).map(function (key) {
      return { label: wallpapers[key] + (settings.wallpaper === key ? ' · Actual' : ''), run: function () { settings.wallpaper = key; refreshSettings('wallpaper'); } };
    }).concat([{label: 'Cancelar', run: function () {}}]));
    modal.querySelectorAll('[data-dialog]').forEach(function (b, i) { if (i < 5) { b.setAttribute('data-swatch', Object.keys(wallpapers)[i]); } });
  }
  function cityDialog() {
    dialog('Elige una ciudad', 'La condición corresponde a una estación de observación; no es un pronóstico por comuna.', Weather.cities.map(function (city) {
      return { label: city, run: function () { settings.city = city; save(); Weather.configure(settings.city, settings.weatherEnabled, paintWeather); clock(); render(); document.querySelector('[data-action="city"]').focus(); } };
    }).concat([{label: 'Cancelar', run: function () {}}]));
  }
  function profileDialog() {
    Profile.open(settings, function (name, city, motion) {
      settings.name = name; settings.city = city; settings.motion = motion; settings.onboarded = true; appearance(); settings.weatherEnabled = true;
      save(); Weather.configure(settings.city, true, paintWeather); clock(); render(); document.querySelector('[data-page="' + page + '"]').focus();
    }, function () { document.querySelector('[data-page="' + page + '"]').focus(); });
  }
  function cleanupDialog() {
    dialog('Eliminar apps desde Samsung', 'Pulsa Home en el mando → Apps → Ajustes (engranaje) → selecciona una app → Eliminar. Si Eliminar no está disponible, Samsung la protege. Órbita puede ocultarla en su biblioteca. Borrar apps libera almacenamiento; no garantiza más RAM ni mayor velocidad.', [{ label: 'Entendido', run: function () {} }]);
  }
  function exitDialog() { dialog('¿Volver a Samsung?', 'Se cerrará Órbita. Podrás abrirla de nuevo desde las aplicaciones del televisor.', [{ label: 'Quedarme aquí', run: function () {} }, { label: 'Salir de Órbita', run: function () { if (!TV.exit()) { toast('La salida al sistema está disponible en el televisor.'); } } }]); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !modal.hidden) { return; }
    if (b.hasAttribute('data-page')) { go(b.getAttribute('data-page')); return; }
    var id = b.getAttribute('data-app');
    if (id) { var a = apps.filter(function (x) { return x.id === id; })[0]; if (a) { if (manage) { appDialog(a); } else { TV.launch(a, toast); } } return; }
    var action = b.getAttribute('data-action');
    if (action === 'library') { go('library'); document.querySelector('[data-action="manage"]').focus(); }
    else if (action === 'manage') { manage = !manage; render(); document.querySelector('[data-action="manage"]').focus(); }
    else if (action === 'refresh') { loadApps(); }
    else if (action === 'motion' || action === 'theme') { if (action === 'motion') { settings.motion = !settings.motion; } else { var colors = ['violet', 'blue', 'green']; settings.theme = colors[(colors.indexOf(settings.theme) + 1) % colors.length]; } save(); appearance(); render(); document.querySelector('[data-action="' + action + '"]').focus(); }
    else if (action === 'profile') { profileDialog(); }
    else if (action === 'time') { dialog('Hora según tu ciudad', Profile.format(settings.city, {dateStyle:'long',timeStyle:'short'}) + ' · ' + Profile.zone(settings.city) + '. Fuente: reloj del televisor; configura fecha y hora automáticas en Samsung. La sincronización con horaoficial.cl no está habilitada.', [{label:'Entendido',run:function(){}}]); }
    else if (action === 'cleanup') { cleanupDialog(); }
    else if (action === 'wallpaper') { wallpaperDialog(); }
    else if (action === 'dim') { var dims = ['soft', 'balanced', 'dark']; settings.dim = dims[(dims.indexOf(settings.dim) + 1) % dims.length]; refreshSettings('dim'); }
    else if (action === 'weather') { settings.weatherEnabled = !settings.weatherEnabled; save(); Weather.configure(settings.city, settings.weatherEnabled, paintWeather); render(); document.querySelector('[data-action="weather"]').focus(); }
    else if (action === 'city') { cityDialog(); }
    else if (action === 'restore') { settings.hidden = []; save(); toast('Todas las aplicaciones vuelven a estar visibles en Órbita.'); }
    else if (action === 'exit') { exitDialog(); }
  });
  function focusable() { return Array.prototype.filter.call((modal.hidden ? document : modal).querySelectorAll('button'), function (b) { return b.getClientRects().length && !b.disabled; }); }
  function navigate(key) {
    var buttons = focusable(), current = document.activeElement;
    if (buttons.indexOf(current) < 0) { if (buttons[0]) { buttons[0].focus(); } return; }
    var r = current.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, best = null, bestScore = Infinity;
    buttons.forEach(function (b) {
      if (b === current) { return; }
      var q = b.getBoundingClientRect(), dx = q.left + q.width / 2 - x, dy = q.top + q.height / 2 - y;
      var horizontal = key === 37 || key === 39;
      var primary = horizontal ? dx * (key === 37 ? -1 : 1) : dy * (key === 38 ? -1 : 1);
      var cross = Math.abs(horizontal ? dy : dx);
      if (primary <= 2 || (horizontal && cross > Math.max(r.height, q.height) * 0.6)) { return; }
      var score = primary + cross * 3;
      if (score < bestScore) { best = b; bestScore = score; }
    });
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function back() { if (!modal.hidden) { closeDialog(); } else if (manage) { manage = false; render(); document.querySelector('[data-action="manage"]').focus(); } else if (page !== 'home') { go('home'); document.querySelector('[data-page="home"]').focus(); } else { exitDialog(); } }
  document.addEventListener('keydown', function (e) {
    if (Profile.active) { Profile.key(e); return; }
    if (e.keyCode >= 37 && e.keyCode <= 40) { e.preventDefault(); navigate(e.keyCode); }
    else if (e.keyCode === 10009 || e.keyCode === 27 || e.keyCode === 8) { e.preventDefault(); back(); }
    else if (e.keyCode === 13) { e.preventDefault(); if (!e.repeat && document.activeElement.tagName === 'BUTTON') { document.activeElement.click(); } }
    else if (e.keyCode === 9 && !modal.hidden) { var list = focusable(), at = list.indexOf(document.activeElement); e.preventDefault(); list[(at + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus(); }
  });
  function loadApps() {
    TV.apps(function (list) {
      loadingError = false; apps = list;
      if (!settings.initialized && list.length) { settings.favorites = list.slice(0, 5).map(function (a) { return a.id; }); settings.initialized = true; save(); }
      var focusedApp = document.activeElement.getAttribute('data-app'); render(focusedApp); if (Profile.active) { return; }
      if (!document.activeElement || document.activeElement === document.body) { document.querySelector('[data-page="' + page + '"]').focus(); }
    }, function () { loadingError = true; render(); toast('No se pudieron consultar las aplicaciones del televisor.'); if (Profile.active) { return; } document.querySelector('[data-page="' + page + '"]').focus(); });
  }
  document.addEventListener('visibilitychange', function () { clearInterval(clockTimer); if (!document.hidden) { clock(); clockTimer = setInterval(clock, 60000); loadApps(); } });
  Weather.configure(settings.city, settings.weatherEnabled, paintWeather);
  appearance(); clock(); clockTimer = setInterval(clock, 60000); loadApps();
  if (!settings.onboarded) { profileDialog(); }
})();
