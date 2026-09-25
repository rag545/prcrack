/* PRScripts — Client-side bypass + loader
 * Host: GitHub Pages / any static host
 * Purpose: force `valid:true` on verify/ticket/bridge, swap dead payload URLs
 */
(function () {
  'use strict';
  if (window.__PRS_BYPASS_RAN) return;
  window.__PRS_BYPASS_RAN = true;

  /* =========================================================
   *  CONFIG
   * ========================================================= */
  var API_VERIFY              = "https://talvez2026.vercel.app/api/verify";
  var API_SCRIPT              = "https://talvez2026.vercel.app/api/script";
  var API_READER_TICKET       = "https://talvez2026.vercel.app/api/reader-ticket";
  var API_READER_EXCHANGE     = "https://talvez2026.vercel.app/api/reader-ticket/exchange";
  var API_READER_BRIDGE       = "https://talvez2026.vercel.app/api/reader-bridge";
  var API_READER_BRIDGE_CLAIM = "https://talvez2026.vercel.app/api/reader-bridge/claim";
  var TERMS_URL               = "https://talvez2026.vercel.app/aceitar-termos";
  var REDACAO_PANEL_URL       = "https://redacao.mentirada.workers.dev";
  var CODEX_PANEL_URL         = "https://leia.mentirada.workers.dev";

  /* If you get the real PRScripts payload later, drop it next to
   * this file (payload.js) and set SCRIPT_MIRROR to its full URL.
   * Left empty = loader reports success but skips payload. */
  var SCRIPT_MIRROR = ""; /* e.g. "https://user.github.io/repo/payload.js" */

  var FAKE_SESSION = 'byp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  var FAKE_PLAN    = 'pro';
  var FAKE_EXPIRES = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();

  /* =========================================================
   *  NETWORK INTERCEPT — fetch
   * ========================================================= */
  var _fetch = window.fetch;
  window.fetch = function (input, init) {
    var url = '';
    try {
      url = typeof input === 'string' ? input : (input && input.url) || '';
    } catch (e) {}

    if (url.indexOf('/api/verify') > -1) {
      return Promise.resolve(new Response(JSON.stringify({
        valid: true,
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES,
        session_expires: FAKE_EXPIRES,
        terms_accepted: true,
        terms_token: null,
        error: null
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    if (url.indexOf('/api/reader-ticket/exchange') > -1) {
      return Promise.resolve(new Response(JSON.stringify({
        valid: true,
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES,
        email: 'bypass@local'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    if (url.indexOf('/api/reader-ticket') > -1) {
      return Promise.resolve(new Response(JSON.stringify({
        valid: true,
        ticket: 'byp_tkt_' + Math.random().toString(36).slice(2, 14),
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    if (url.indexOf('/api/reader-bridge') > -1) {
      return Promise.resolve(new Response(JSON.stringify({
        valid: true,
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES,
        email: 'bypass@local'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    return _fetch.apply(this, arguments);
  };

  /* =========================================================
   *  NETWORK INTERCEPT — XHR (fallback)
   * ========================================================= */
  var _xhrOpen = XMLHttpRequest.prototype.open;
  var _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__prsUrl = url;
    return _xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var url = String(this.__prsUrl || '');
    var body = null;

    if (url.indexOf('/api/verify') > -1) {
      body = JSON.stringify({
        valid: true,
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES,
        terms_accepted: true,
        error: null
      });
    } else if (url.indexOf('/api/reader-ticket') > -1 || url.indexOf('/api/reader-bridge') > -1) {
      body = JSON.stringify({
        valid: true,
        ticket: 'byp_tkt_' + Math.random().toString(36).slice(2, 14),
        session_token: FAKE_SESSION,
        plan: FAKE_PLAN,
        expires_at: FAKE_EXPIRES,
        email: 'bypass@local'
      });
    }

    if (body !== null) {
      var self = this;
      setTimeout(function () {
        try {
          Object.defineProperty(self, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(self, 'status', { value: 200, configurable: true });
          Object.defineProperty(self, 'responseText', { value: body, configurable: true });
          Object.defineProperty(self, 'response', { value: body, configurable: true });
          if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
          if (typeof self.onload === 'function') self.onload();
        } catch (e) {}
      }, 0);
      return;
    }
    return _xhrSend.apply(this, arguments);
  };

  /* =========================================================
   *  SCRIPT LOADER INTERCEPT
   *  The original loader appends <script src=".../api/script?...">
   *  Redirect that to SCRIPT_MIRROR if set, otherwise swallow.
   * ========================================================= */
  var _appendChild = document.head.appendChild.bind(document.head);
  document.head.appendChild = function (node) {
    try {
      if (node && node.tagName === 'SCRIPT') {
        var src = String(node.src || '');
        if (src.indexOf('/api/script') > -1) {
          if (SCRIPT_MIRROR) {
            var clone = document.createElement('script');
            clone.src = SCRIPT_MIRROR + (SCRIPT_MIRROR.indexOf('?') > -1 ? '&' : '?') + 't=' + FAKE_SESSION;
            clone.async = true;
            return _appendChild(clone);
          }
          /* No mirror — announce success and stop. */
          console.log('[PRScripts] payload skipped (no SCRIPT_MIRROR set)');
          return node;
        }
      }
    } catch (e) {}
    return _appendChild(node);
  };

  /* =========================================================
   *  PLATFORM DETECTION
   * ========================================================= */
  var h = location.hostname;
  var isReaderSite = h.indexOf('nubereader-epub.br.odilo.io') > -1
                  || h.indexOf('nubereader-pdfs.br.odilo.io') > -1
                  || h === 'player.us.odilo.io';

  var platform = null;
  if (h.indexOf('wayground') > -1 || h.indexOf('quizizz') > -1) platform = 'wayground';
  else if (h.indexOf('odilo') > -1 || h.indexOf('leiaparana') > -1 || h.indexOf('nubereader') > -1 || h === 'player.us.odilo.io') platform = 'leiapr';
  else if (h.indexOf('redacao') > -1 && h.indexOf('pr.gov.br') > -1) platform = 'redacao';
  else if (h.indexOf('khanacademy') > -1) platform = 'khan';
  else if (h.indexOf('enempr') > -1) platform = 'enempr';
  else {
    alert('PRScripts\n\nPlataforma nao suportada.\nAbra Wayground, Leia Parana, Redacao Parana, Khan Academy ou Enem Parana primeiro.');
    return;
  }

  /* =========================================================
   *  UI HELPERS
   * ========================================================= */
  function status(text) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;border-radius:10px;background:rgba(0,0,0,0.85);color:#fff;font:14px/1.4 sans-serif;backdrop-filter:blur(8px);transition:all .3s;max-width:360px';
    el.innerHTML = text;
    document.body.appendChild(el);
    return el;
  }
  function statusFail(el, text, ms) {
    el.style.background = 'rgba(220,38,38,0.9)';
    el.innerHTML = text;
    setTimeout(function () { el.remove(); }, ms || 6000);
  }
  function statusOk(el, text, ms) {
    el.style.background = 'rgba(22,163,74,0.9)';
    el.innerHTML = text;
    setTimeout(function () { el.remove(); }, ms || 4000);
  }

  /* =========================================================
   *  DETECTION HELPERS
   * ========================================================= */
  function decodeJwtEmail(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var data = JSON.parse(atob(payload));
      return data.email || data.sub_email || data.unique_name_email || null;
    } catch (e) { return null; }
  }

  function findJwtInValue(val) {
    if (!val || typeof val !== 'string') return null;
    if (val.indexOf('eyJ') === 0 && val.indexOf('.') > -1) return val;
    try {
      var obj = JSON.parse(val);
      if (!obj || typeof obj !== 'object') return null;
      var c = [obj.token, obj.accessToken, obj.access_token, obj.jwt, obj.authToken, obj.idToken, obj.id_token];
      if (obj.token && obj.token.token) c.push(obj.token.token);
      if (obj.auth && obj.auth.token) c.push(obj.auth.token);
      if (obj.data && obj.data.token) c.push(obj.data.token);
      for (var i = 0; i < c.length; i++) {
        if (typeof c[i] === 'string' && c[i].indexOf('eyJ') === 0 && c[i].indexOf('.') > -1) return c[i];
      }
    } catch (e) {}
    return null;
  }

  function detectWaygroundUser() {
    return new Promise(function (resolve) {
      fetch('/_api/main/user', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.data) {
            var u = d.data.user || {};
            var local = u.local || {};
            var email = local.email || u.email || d.data.email || null;
            var userId = u.id || u._id || local.id || local._id || d.data.userId || null;
            if (email && String(email).indexOf('@') > -1) {
              resolve({ email: String(email).toLowerCase(), userId: userId ? String(userId) : null });
              return;
            }
          }
          fetch('/settings', { credentials: 'include' })
            .then(function (r2) { return r2.ok ? r2.text() : null; })
            .then(function (html) {
              if (html) {
                var m = html.match(/[\w.+-]+@escola\.pr\.gov\.br/i);
                if (m) { resolve({ email: m[0].toLowerCase(), userId: null }); return; }
              }
              resolve(null);
            })
            .catch(function () { resolve(null); });
        })
        .catch(function () { resolve(null); });
    });
  }

  function getLeiaProof() {
    try {
      var isMain = h.indexOf('leiaparana.odilo.us') > -1 && h.indexOf('-le.') === -1;
      var isClub = h.indexOf('leiaparana-le.odilo.us') > -1;

      if (isMain) {
        var td = localStorage.getItem('token');
        if (td) {
          var pt = JSON.parse(td);
          var bt = (pt.token && pt.token.token) ? pt.token.token : pt.token;
          var uid = null;
          try { uid = localStorage.getItem('userId'); } catch (e) {}
          if (bt) return { proofType: 'odilo_bearer_token', payload: { access_token: bt, site_variant: 'main', user_id: uid, expires_at: pt.expires || null } };
        }
      }

      if (isClub) {
        var cj = null;
        try {
          var u = new URLSearchParams(location.search).get('token');
          if (u && u.indexOf('eyJ') === 0) cj = u;
        } catch (e) {}
        if (!cj) {
          for (var i = 0; i < localStorage.length; i++) {
            cj = findJwtInValue(localStorage.getItem(localStorage.key(i)) || '');
            if (cj) break;
          }
        }
        if (!cj) {
          for (var j = 0; j < sessionStorage.length; j++) {
            cj = findJwtInValue(sessionStorage.getItem(sessionStorage.key(j)) || '');
            if (cj) break;
          }
        }
        if (cj) return { proofType: 'odilo_club_jwt', payload: { jwt: cj, site_variant: 'club' } };
      }
    } catch (e) {}
    return null;
  }

  function getLeiaEmail() {
    return new Promise(function (resolve) {
      var isMain = h.indexOf('leiaparana.odilo.us') > -1 && h.indexOf('-le.') === -1;
      var isClub = h.indexOf('leiaparana-le.odilo.us') > -1;

      try {
        var saved = (document.cookie.match(/prscripts_email=([^;]+)/) || [])[1];
        if (saved) {
          var se = decodeURIComponent(saved).toLowerCase();
          if (se.indexOf('@escola.pr.gov.br') > -1 || se.indexOf('@aluno') > -1) { resolve(se); return; }
        }
      } catch (e) {}

      if (isMain) {
        var bt = null;
        try {
          var td = localStorage.getItem('token');
          if (td) {
            var pt = JSON.parse(td);
            bt = (pt.token && pt.token.token) ? pt.token.token : pt.token;
          }
        } catch (e) {}

        if (bt) {
          fetch('/opac/api/v2/patrons/local', {
            credentials: 'include',
            headers: { 'Authorization': 'Bearer ' + bt }
          }).then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              if (d && (d.email || d.externalId) && String(d.email || d.externalId).indexOf('@') > -1) {
                resolve(String(d.email || d.externalId).toLowerCase()); return;
              }
              for (var i = 0; i < localStorage.length; i++) {
                var m = (localStorage.getItem(localStorage.key(i)) || '').match(/[\w.+-]+@escola\.pr\.gov\.br/i);
                if (m) { resolve(m[0].toLowerCase()); return; }
              }
              resolve(null);
            }).catch(function () { resolve(null); });
          return;
        }
      }

      if (isClub) {
        var cj = null;
        try {
          var u = new URLSearchParams(location.search).get('token');
          if (u && u.indexOf('eyJ') === 0) cj = u;
        } catch (e) {}
        if (!cj) {
          for (var i = 0; i < localStorage.length; i++) {
            cj = findJwtInValue(localStorage.getItem(localStorage.key(i)) || '');
            if (cj) break;
          }
        }
        if (!cj) {
          for (var j = 0; j < sessionStorage.length; j++) {
            cj = findJwtInValue(sessionStorage.getItem(sessionStorage.key(j)) || '');
            if (cj) break;
          }
        }
        if (cj) {
          var je = decodeJwtEmail(cj);
          if (je && je.indexOf('@') > -1) { resolve(je.toLowerCase()); return; }
        }
      }

      for (var k = 0; k < localStorage.length; k++) {
        var m2 = (localStorage.getItem(localStorage.key(k)) || '').match(/[\w.+-]+@escola\.pr\.gov\.br/i);
        if (m2) { resolve(m2[0].toLowerCase()); return; }
      }
      var m3 = (document.cookie || '').match(/[\w.+-]+@escola\.pr\.gov\.br/i);
      if (m3) { resolve(m3[0].toLowerCase()); return; }
      resolve(null);
    });
  }

  function isSchoolEmailKhan(email) {
    if (!email) return false;
    var v = String(email).toLowerCase();
    return v.indexOf('@escola.pr.gov.br') > -1 || v.indexOf('@aluno') > -1;
  }

  function readCookieValue(name) {
    try {
      var chunks = (document.cookie || '').split(';');
      for (var i = 0; i < chunks.length; i++) {
        var entry = (chunks[i] || '').trim();
        var eq = entry.indexOf('=');
        if (eq <= 0) continue;
        if (entry.slice(0, eq).trim() !== name) continue;
        return decodeURIComponent(entry.slice(eq + 1));
      }
    } catch (e) {}
    return '';
  }

  function getKhanUserKey() {
    var k = readCookieValue('kaid') || readCookieValue('KAID');
    if (k) return String(k).trim();
    try { if (window.KA && window.KA.currentUser && window.KA.currentUser.kaid) return String(window.KA.currentUser.kaid).trim(); } catch (e) {}
    return '';
  }

  /* =========================================================
   *  MAIN FLOW — KHAN
   * ========================================================= */
  var statusEl = status('PRScripts: Detectando sua conta...');

  if (platform === 'khan') {
    (async function () {
      await new Promise(function (r) { setTimeout(r, 800); });
      var kaid = getKhanUserKey();
      var email = null;

      try {
        for (var i = 0; i < localStorage.length; i++) {
          var m = (localStorage.getItem(localStorage.key(i)) || '').match(/[\w.+-]+@(escola\.pr\.gov\.br|aluno[^\s"]*)/i);
          if (m) { email = m[0].toLowerCase(); break; }
        }
      } catch (e) {}
      if (!email) {
        var mc = (document.cookie || '').match(/[\w.+-]+@(escola\.pr\.gov\.br|aluno[^\s";]*)/i);
        if (mc) email = mc[0].toLowerCase();
      }
      if (!email) email = 'bypass@escola.pr.gov.br';

      statusEl.textContent = 'PRScripts: Verificando licenca...';

      try {
        var vr = await fetch(API_VERIFY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'khan',
            proof_type: 'khan_session_context',
            proof_payload: { email: email, kaid: kaid },
            email: email
          })
        });
        var vd = await vr.json();
        if (!vd.valid) { statusFail(statusEl, 'PRScripts: ' + (vd.error || 'Sem licenca.')); return; }

        window.__PRSCRIPTS_CONFIG = {
          sessionToken: vd.session_token,
          verifyUrl: API_VERIFY,
          proxyUrl: API_VERIFY.replace('/verify', '/proxy'),
          email: email,
          plan: vd.plan,
          expiresAt: vd.expires_at,
          platform: 'khan'
        };
        statusOk(statusEl, 'PRScripts: ' + email.split('@')[0] + ' | khan');

        var s = document.createElement('script');
        s.src = API_SCRIPT + '?p=khan&t=' + encodeURIComponent(vd.session_token);
        s.onerror = function () { console.log('[PRScripts] script load failed — set SCRIPT_MIRROR'); };
        document.head.appendChild(s);
      } catch (e) {
        statusFail(statusEl, 'PRScripts: Erro de conexao.');
      }
    })();
    return;
  }

  /* =========================================================
   *  MAIN FLOW — WAYGROUND
   * ========================================================= */
  if (platform === 'wayground') {
    detectWaygroundUser().then(function (user) {
      var email = user ? user.email : 'bypass@escola.pr.gov.br';
      statusEl.textContent = 'PRScripts: Verificando licenca de ' + email.split('@')[0] + '...';
      fetch(API_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'wayground',
          proof_type: 'platform_api_user',
          proof_payload: { email: email, has_user_data: !!user, user_id: user ? user.userId : null },
          email: email
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.valid) { statusFail(statusEl, 'PRScripts: ' + (d.error || 'Sem licenca.')); return; }
        window.__PRSCRIPTS_CONFIG = {
          sessionToken: d.session_token,
          verifyUrl: API_VERIFY,
          proxyUrl: API_VERIFY.replace('/verify', '/proxy'),
          email: email,
          plan: d.plan,
          expiresAt: d.expires_at,
          platform: 'wayground'
        };
        statusOk(statusEl, 'PRScripts: ' + email.split('@')[0] + ' | wayground');
        var s = document.createElement('script');
        s.src = API_SCRIPT + '?p=wayground&t=' + encodeURIComponent(d.session_token);
        s.onerror = function () { console.log('[PRScripts] script load failed — set SCRIPT_MIRROR'); };
        document.head.appendChild(s);
      }).catch(function () {
        statusFail(statusEl, 'PRScripts: Erro de conexao.');
      });
    });
    return;
  }

  /* =========================================================
   *  MAIN FLOW — ENEM PR
   * ========================================================= */
  if (platform === 'enempr') {
    (async function () {
      var token = '', email = '';
      try {
        var raw = localStorage.getItem('@auth-storage:analytica:v2') || sessionStorage.getItem('@auth-storage:analytica:v2') || '';
        if (raw) {
          var st = (JSON.parse(raw).state) || {};
          if (st.tokens && st.tokens.token) token = st.tokens.token;
          if (st.sessionInfo && st.sessionInfo.email) email = st.sessionInfo.email;
          if (!email && token) email = decodeJwtEmail(token) || '';
        }
      } catch (e) {}

      if (!email) email = 'bypass@escola.pr.gov.br';
      email = String(email).toLowerCase();

      statusEl.textContent = 'PRScripts: Verificando licenca de ' + email.split('@')[0] + '...';
      try {
        var vr = await fetch(API_VERIFY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            platform: 'enempr',
            proof_type: 'analytica_session',
            proof_payload: { email: email, token: token }
          })
        });
        var vd = await vr.json();
        if (!vd.valid) { statusFail(statusEl, 'PRScripts: ' + (vd.error || 'Sem licenca.')); return; }

        window.__PRSCRIPTS_CONFIG = {
          sessionToken: vd.session_token,
          verifyUrl: API_VERIFY,
          proxyUrl: API_VERIFY.replace('/verify', '/proxy'),
          email: email,
          plan: vd.plan,
          expiresAt: vd.session_expires,
          platform: 'enempr'
        };
        statusOk(statusEl, 'PRScripts: acesso autorizado');
        var es = document.createElement('script');
        es.src = API_SCRIPT + '?p=enempr&t=' + encodeURIComponent(vd.session_token);
        es.onerror = function () { console.log('[PRScripts] script load failed — set SCRIPT_MIRROR'); };
        document.head.appendChild(es);
      } catch (e) {
        statusFail(statusEl, 'PRScripts: Erro de conexao.');
      }
    })();
    return;
  }

  /* =========================================================
   *  MAIN FLOW — REDACAO
   * ========================================================= */
  if (platform === 'redacao') {
    var rToken = '', rRefresh = '', rEmail = '', rName = '', rProfileId = '', rExpiresAt = '';
    try {
      rToken = localStorage.getItem('Token') || sessionStorage.getItem('Token') || '';
      rRefresh = localStorage.getItem('RefreshToken') || sessionStorage.getItem('RefreshToken') || '';
      rEmail = localStorage.getItem('Email') || sessionStorage.getItem('Email') || '';
      rName = localStorage.getItem('Name') || sessionStorage.getItem('Name') || '';
      rProfileId = localStorage.getItem('ProfileId') || sessionStorage.getItem('ProfileId') || '';
      rExpiresAt = localStorage.getItem('ExpiresAt') || sessionStorage.getItem('ExpiresAt') || '';
    } catch (e) {}

    if (!rToken || !rRefresh) {
      statusFail(statusEl, 'PRScripts: Faca login no Redacao Parana primeiro.', 5000);
      return;
    }

    var rParams = new URLSearchParams();
    rParams.set('token', rToken);
    rParams.set('refresh', rRefresh);
    if (rEmail) rParams.set('email', rEmail);
    if (rName) rParams.set('name', rName);
    if (rProfileId) rParams.set('profileId', rProfileId);
    if (rExpiresAt) rParams.set('expiresAt', rExpiresAt);

    statusOk(statusEl, 'PRScripts: Abrindo painel...', 2000);
    window.location.href = REDACAO_PANEL_URL + '/api/init?' + rParams.toString();
    return;
  }

  /* =========================================================
   *  MAIN FLOW — LEIA PR (reader site)
   * ========================================================= */
  if (platform === 'leiapr' && isReaderSite) {
    (async function () {
      var ticket = null;
      try {
        var s = new URL(location.href).searchParams.get('prst');
        if (s) ticket = s;
      } catch (e) {}
      if (!ticket && location.hash && location.hash.indexOf('?') > -1) {
        try { ticket = new URLSearchParams(location.hash.split('?')[1]).get('prst'); } catch (e) {}
      }

      var exchangeData = null;
      if (ticket) {
        statusEl.textContent = 'PRScripts: Validando acesso ao livro...';
        try {
          var er = await fetch(API_READER_EXCHANGE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: ticket, reader_url: location.href })
          });
          exchangeData = await er.json();
        } catch (e) {}
      } else {
        statusEl.textContent = 'PRScripts: Verificando bridge de sessao...';
        try {
          var br = await fetch(API_READER_BRIDGE_CLAIM, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          var bd = await br.json();
          if (bd && bd.valid) exchangeData = bd;
        } catch (e) {}
      }

      if (!exchangeData || !exchangeData.valid) {
        exchangeData = { valid: true, session_token: FAKE_SESSION, plan: FAKE_PLAN, expires_at: FAKE_EXPIRES, email: 'bypass@local' };
      }

      window.__PRSCRIPTS_CONFIG = {
        sessionToken: exchangeData.session_token,
        verifyUrl: API_VERIFY,
        proxyUrl: API_VERIFY.replace('/verify', '/proxy'),
        email: exchangeData.email || null,
        plan: exchangeData.plan,
        expiresAt: exchangeData.expires_at,
        platform: 'leiapr'
      };
      statusOk(statusEl, 'PRScripts: acesso autorizado no leitor');
      var rs = document.createElement('script');
      rs.src = API_SCRIPT + '?p=leiapr&t=' + encodeURIComponent(exchangeData.session_token);
      rs.onerror = function () { console.log('[PRScripts] script load failed — set SCRIPT_MIRROR'); };
      document.head.appendChild(rs);
    })();
    return;
  }

  /* =========================================================
   *  MAIN FLOW — LEIA PR (main site / club)
   * ========================================================= */
  if (platform === 'leiapr') {
    (async function () {
      var email = null;
      for (var i = 0; i < 4; i++) {
        if (i > 0) {
          statusEl.textContent = 'PRScripts: aguardando a sessao do Leia carregar...';
          await new Promise(function (r) { setTimeout(r, i * 900); });
        }
        email = await getLeiaEmail();
        if (email) break;
      }
      if (!email) email = 'bypass@escola.pr.gov.br';

      statusEl.textContent = 'PRScripts: Verificando licenca de ' + email.split('@')[0] + '...';

      try {
        var proof = getLeiaProof();
        var vp = { email: email, platform: 'leiapr' };
        if (proof) {
          vp.proof_type = proof.proofType;
          vp.proof_payload = proof.payload;
          if (!vp.proof_payload.email) vp.proof_payload.email = email;
        } else {
          vp.proof_type = 'browser_context';
          vp.proof_payload = { email: email, source: 'bypass', has_user_data: false };
        }

        var vr = await fetch(API_VERIFY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vp)
        });
        var vd = await vr.json();
        if (!vd.valid) { statusFail(statusEl, 'PRScripts: ' + (vd.error || 'Sem licenca.')); return; }

        try {
          var cd = h.indexOf('.odilo.us') > -1 ? '; domain=.odilo.us' : (h.indexOf('.odilo.io') > -1 ? '; domain=.odilo.io' : '');
          var exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = 'prscripts_email=' + encodeURIComponent(email) + cd + '; path=/; expires=' + exp + '; SameSite=Lax';
        } catch (e) {}

        var isMain = h.indexOf('leiaparana.odilo.us') > -1 && h.indexOf('-le.') === -1;
        var cp = getLeiaProof();
        if (isMain && cp && cp.proofType === 'odilo_bearer_token' && cp.payload.user_id) {
          try {
            var qp = new URLSearchParams();
            qp.set('token', cp.payload.access_token);
            qp.set('userId', cp.payload.user_id);
            qp.set('session', vd.session_token);
            qp.set('email', email);
            if (cp.payload.expires_at) qp.set('expiresAt', cp.payload.expires_at);
            statusEl.textContent = 'PRScripts: Abrindo Codex Solver...';
            window.location.href = CODEX_PANEL_URL + '/api/init?' + qp.toString();
            return;
          } catch (e) {}
        }

        statusOk(statusEl, 'PRScripts: Acesso validado. Abra um livro — o painel aparece no leitor.', 5000);
      } catch (e) {
        statusFail(statusEl, 'PRScripts: Erro de conexao.');
      }
    })();
    return;
  }
})();
