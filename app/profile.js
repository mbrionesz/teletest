(function () {
  'use strict';
  var box, done, cancel;
  function escape(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function zone(city) {
    if (city === 'Isla de Pascua') { return 'Pacific/Easter'; }
    if (['Coyhaique','Balmaceda','Chile Chico','Cochrane','Puerto Aysen','Puerto Natales','Punta Arenas','Porvenir','Puerto Williams','Antartica'].indexOf(city) >= 0) { return 'America/Punta_Arenas'; }
    return 'America/Santiago';
  }
  function format(city, options, date) {
    options.timeZone = zone(city);
    return new Intl.DateTimeFormat('es-CL', options).format(date || new Date());
  }
  var step = 0, draft, introTimer = null, frame = null, transition = false;
  function reduced() { return !draft.motion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function stopEffect() { clearTimeout(introTimer); introTimer = null; if (frame) { cancelAnimationFrame(frame); frame = null; } transition = false; }
  function close() { stopEffect(); Profile.active = false; box.hidden = true; box.classList.remove('onboarding'); box.innerHTML = ''; }
  function captureName() { var field = document.getElementById('profile-name'); if (field) { draft.name = field.value.trim().replace(/[\u0000-\u001f]/g, '').slice(0,32); } }
  function begin() {
    if (transition || step !== 0) { return; }
    clearTimeout(introTimer);
    if (reduced() || document.hidden) { show(1); return; }
    transition = true;
    var heading = document.getElementById('welcome-title'), rect = heading.getBoundingClientRect();
    var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    if (!ctx) { show(1); return; }
    canvas.className = 'sand'; canvas.setAttribute('aria-hidden','true');
    var scale = Math.min(1,1920 / innerWidth); canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale); box.appendChild(canvas); ctx.scale(scale,scale);
    var font = window.getComputedStyle(heading).font;
    ctx.font = font; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.fillText(heading.textContent, rect.left, rect.top);
    ctx.setTransform(1,0,0,1,0,0);
    var pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data, particles = [];
    // Bounded particle count and lifetime. Canvas is removed after this one transition.
    for (var y = Math.max(0,Math.floor(rect.top * scale)); y < Math.min(canvas.height,rect.bottom * scale); y += 7) {
      for (var x = Math.max(0,Math.floor(rect.left * scale)); x < Math.min(canvas.width,rect.right * scale); x += 7) {
        if (pixels[(y * canvas.width + x)*4+3] > 60 && particles.length < 650) { particles.push({x:x,y:y,vx:30+Math.random()*160,vy:-30+Math.random()*90,size:1+Math.random()*2}); }
      }
    }
    heading.style.opacity = '0';
    var start = null;
    function draw(now) {
      if (start === null) { start = now; }
      var t = Math.min((now-start)/700,1);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#d4c9ff'; ctx.globalAlpha = 1-t;
      particles.forEach(function (p) { ctx.fillRect(p.x+p.vx*t,p.y+p.vy*t+70*t*t,p.size,p.size); });
      if (t < 1 && Profile.active && !document.hidden) { frame = requestAnimationFrame(draw); }
      else { show(1); }
    }
    frame = requestAnimationFrame(draw);
  }
  function show(next) {
    stopEffect(); step = next;
    var content = '';
    if (step === 0) {
      content = '<div class="welcome-center"><p class="eyebrow">Ó R B I T A · T V</p><h1 id="welcome-title" tabindex="-1">Bienvenido.</h1><p>Un espacio para ti.</p><div class="welcome-actions"><button class="action primary" id="welcome-start">Comenzar →</button><button class="subtle" id="welcome-reduce">Sin animaciones</button></div></div>';
    } else if (step === 1) {
      content = '<form id="name-form" class="welcome-form"><p class="eyebrow">01 / TU ESPACIO</p><h1 id="welcome-title"><label for="profile-name">¿Cómo te llamas?</label></h1><p>Tu nombre o un alias. Tú eliges.</p><input id="profile-name" maxlength="32" autocomplete="given-name" placeholder="Escribe tu nombre o alias" value="' + escape(draft.name) + '"><small>Opcional. Se guarda solo en este dispositivo.</small><div class="welcome-actions"><button type="submit" class="action primary">Continuar →</button><button type="button" class="subtle" id="profile-cancel">Más tarde</button></div></form>';
    } else {
      content = '<form id="profile-form" class="welcome-form"><p class="eyebrow">02 / TU LUGAR</p><h1 id="welcome-title"><label for="profile-city">¿En qué ciudad estás?</label></h1><p>Tu hora y el clima, en su lugar.</p><select id="profile-city">' + Weather.cities.map(function (c) { return '<option' + (c === draft.city ? ' selected' : '') + '>' + escape(c) + '</option>'; }).join('') + '</select><div class="welcome-time"><strong id="profile-time"></strong><span id="profile-zone"></span><small>Hora del televisor · Clima DMC por internet</small></div><div class="welcome-actions"><button type="submit" class="action primary">Guardar y entrar</button><button type="button" class="subtle" id="profile-back">← Volver</button></div></form>';
    }
    box.innerHTML = '<section class="welcome-screen" role="dialog" aria-modal="true" aria-labelledby="welcome-title">' + content + '<div class="welcome-footer"><span>ÓRBITA TV</span><span>' + (step === 0 ? 'Hecho para disfrutar.' : 'Tu nombre y ciudad quedan guardados en este dispositivo.') + '</span></div></section>';
    if (step === 0) {
      document.getElementById('welcome-start').onclick = begin;
      document.getElementById('welcome-reduce').onclick = function () { draft.motion = false; show(1); };
      document.getElementById('welcome-title').focus();
      introTimer = setTimeout(begin, reduced() ? 600 : 1600);
    } else if (step === 1) {
      document.getElementById('name-form').onsubmit = function (e) { e.preventDefault(); captureName(); show(2); };
      document.getElementById('profile-cancel').onclick = function () { Profile.dismiss(); };
      document.getElementById('profile-name').focus();
    } else {
      function update() { var c = document.getElementById('profile-city').value; document.getElementById('profile-time').textContent = format(c,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); document.getElementById('profile-zone').textContent = c + ' · ' + zone(c); }
      document.getElementById('profile-city').onchange = update; update();
      document.getElementById('profile-back').onclick = function () { draft.city = document.getElementById('profile-city').value; show(1); };
      document.getElementById('profile-form').onsubmit = function (e) { e.preventDefault(); draft.city = document.getElementById('profile-city').value; if (Weather.cities.indexOf(draft.city) < 0) { return; } close(); done(draft.name,draft.city,draft.motion); };
      document.getElementById('profile-city').focus();
    }
  }
  window.Profile = {
    active: false, zone: zone, format: format,
    open: function (settings, save, dismiss) {
      box = document.getElementById('modal'); done = save; cancel = dismiss;
      draft = {name:settings.name || '',city:settings.city,motion:settings.motion};
      this.active = true; box.hidden = false; box.classList.add('onboarding'); show(settings.onboarded ? 1 : 0);
    },
    dismiss: function () { close(); cancel(); },
    key: function (e) {
      if (e.keyCode === 27 || e.keyCode === 10009) { e.preventDefault(); if (step === 2) { draft.city = document.getElementById('profile-city').value; show(1); } else { this.dismiss(); } return; }
      if (step === 0) { if (e.keyCode === 13) { e.preventDefault(); if (document.activeElement.tagName === 'BUTTON') { document.activeElement.click(); } else { begin(); } return; } else if (e.keyCode >= 37 && e.keyCode <= 40) { e.preventDefault(); document.getElementById('welcome-reduce').focus(); return; } }
      var target = document.activeElement;
      if (e.keyCode === 13 && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) { e.preventDefault(); if (step === 1) { captureName(); show(2); } else { document.querySelector('#profile-form [type="submit"]').focus(); } }
      if (e.keyCode === 40 && target.tagName === 'INPUT') { e.preventDefault(); document.querySelector('#name-form [type="submit"]').focus(); }
      if (e.keyCode === 38 && target.tagName === 'BUTTON' && step > 0) { e.preventDefault(); document.getElementById(step === 1 ? 'profile-name' : 'profile-city').focus(); }
      if (e.keyCode === 40 && target.type === 'submit') { e.preventDefault(); document.getElementById(step === 1 ? 'profile-cancel' : 'profile-back').focus(); }
      if (e.keyCode === 9) { var fields = Array.prototype.slice.call(box.querySelectorAll('input,select,button')), at = fields.indexOf(target); e.preventDefault(); fields[(at+(e.shiftKey?-1:1)+fields.length)%fields.length].focus(); }
    }
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden && Profile.active && step === 0) { show(1); } });
})();
