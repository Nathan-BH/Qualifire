/* Cycle 23 MOCKUP helpers. Not app code. Fake maps, fake data. No external requests. */
(function () {
  'use strict';
  var TIER_LINE = { purple: '#9000C8', green: '#00D000', yellow: '#F5C542' };
  var CSS = [
    ':root{--bg:#FAF7EE;--card:#FFFFFF;--hair:#E0D9C4;--cb:#E0D9C4;--text:#201F24;--text2:#6D6759;--dim:#8A8577;--accent:#F5C542;--accentText:#B98A0A;--onAccent:#17171b;',
    '--purple:#9000C8;--green:#007A00;--yellow:#8C6900;--good:#007A00;--bad:#9A6A12;--tint:#FDFCF8;--page:#D9D5C8;',
    '--mapbg:#E6E2D4;--road:#F8F5EC;--roadMinor:#EFEBDD;--park:#D5DEC4;--water:#C7D6DE;--casing:#FFFFFF}',
    ':root[data-theme="night"]{--bg:#17171b;--card:#212127;--hair:#2c2c33;--cb:#41414c;--text:#F4F2EC;--text2:#b5b3ac;--dim:#9a978f;--accent:#F5C542;--accentText:#F5C542;--onAccent:#17171b;',
    '--purple:#C364FF;--green:#00D000;--yellow:#F5C542;--good:#00D000;--bad:#E8A33D;--tint:#1d1d22;--page:#0b0b0d;',
    '--mapbg:#1b2026;--road:#2b323a;--roadMinor:#232a31;--park:#1c2a24;--water:#18252f;--casing:#0d1013}',
    '*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}',
    'html,body{height:100%}',
    'body{background:var(--page);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;overflow:hidden}',
    '.cap{width:100%;max-width:640px;padding:6px 12px;font-size:11px;line-height:1.35;color:var(--dim);display:flex;gap:10px;align-items:center;justify-content:space-between;flex:none}',
    '.cap b{color:var(--text2)}.cap button{font:inherit;font-weight:700;color:var(--text);background:none;border:1px solid var(--hair);border-radius:99px;padding:3px 10px;cursor:pointer;white-space:nowrap}',
    '.phone{position:relative;width:100%;max-width:420px;flex:1;min-height:0;max-height:844px;background:var(--bg);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 0 1px var(--hair)}',
    '.head{padding:14px 16px 10px;flex:none}.head h1{font-size:26px;font-weight:800}.head .sport{font-size:12px;font-weight:700;letter-spacing:2px;color:var(--dim);text-transform:uppercase;margin-top:2px}',
    '.feed{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '.tabs{flex:none;display:flex;overflow-x:auto;border-top:1px solid var(--hair);background:var(--bg);scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}',
    '.tab{flex:none;min-width:92px;padding:14px 8px 16px;text-align:center;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--dim);border-top:3px solid transparent;margin-top:-1px}',
    '.tab.on{color:var(--text);border-top-color:var(--accent)}',
    '.act{position:relative;cursor:pointer;padding:14px 0 18px;border-bottom:1px solid var(--hair)}',
    '.act.tint{background:var(--tint)}',
    '.row1{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:0 48px 0 16px}',
    '.name{font-size:17px;font-weight:800}.date{font-size:12.5px;color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.free{font-size:10.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accentText);margin-left:6px}',
    '.hero{display:flex;align-items:baseline;gap:12px;padding:6px 16px 10px}',
    '.lap{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}',
    '.rank{font-size:15px;font-weight:700;color:var(--text2);font-variant-numeric:tabular-nums}.qual{font-size:12.5px;color:var(--dim)}',
    '.herocol{display:flex;flex-direction:column}',
    '.dim{opacity:.45}',
    '.map{position:relative;width:100%;overflow:hidden;background:var(--mapbg)}.map svg{display:block;width:100%;height:100%;pointer-events:none}',
    '.map.inset{width:calc(100% - 32px);margin:0 16px;border-radius:16px;border:1px solid var(--cb)}',
    '.strip{display:flex;gap:22px;padding:10px 16px 0;font-variant-numeric:tabular-nums}',
    '.strip span{font-size:12px;color:var(--dim);font-weight:700;letter-spacing:1px}.strip b{font-size:15px;font-weight:800;margin-left:6px;letter-spacing:0}',
    '.dots{position:absolute;top:10px;right:6px;width:40px;height:40px;border:0;background:none;color:var(--dim);font-size:22px;line-height:40px;text-align:center;cursor:pointer;z-index:3}',
    '.menu{position:absolute;z-index:20;min-width:190px;background:var(--card);border:1px solid var(--hair);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.35);padding:4px 0}',
    '.menu div{padding:11px 16px;font-size:14px;font-weight:600;cursor:pointer}.menu div:hover{background:rgba(127,127,127,.15)}',
    '.detail{position:absolute;inset:0;background:var(--bg);overflow-y:auto;z-index:10}',
    '.fab{position:absolute;top:12px;width:38px;height:38px;border-radius:50%;background:rgba(10,10,10,.55);color:#fff;border:0;font-size:22px;line-height:38px;text-align:center;cursor:pointer;z-index:4}',
    '.pad{padding:0 16px}.dname{font-size:22px;font-weight:800;padding-top:16px}.ddate{font-size:13px;color:var(--dim);margin-top:2px;font-variant-numeric:tabular-nums}',
    '.dlap{font-size:34px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:10px;line-height:1.1}.drank{font-size:13px;color:var(--text2);margin-top:2px}',
    '.replay{display:block;width:100%;margin:16px 0 0;padding:14px;border:0;border-radius:10px;background:var(--accent);color:var(--onAccent);font-size:15px;font-weight:800;letter-spacing:2px;text-transform:uppercase;cursor:pointer}',
    '.sec{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:28px 16px 8px}',
    '.line{display:flex;align-items:baseline;padding:11px 16px;border-top:1px solid var(--hair);font-variant-numeric:tabular-nums;font-size:15px;cursor:default}',
    '.line.sel{background:rgba(127,127,127,.12)}.line.click{cursor:pointer}',
    '.line .k{width:34px;font-weight:700;color:var(--dim)}.line .v{width:64px;font-weight:800}.line .m{flex:1;color:var(--text2);font-size:13.5px}.line .g{font-weight:700;min-width:44px;text-align:right}',
    '.line.today{font-weight:800;background:rgba(245,197,66,.14)}.line .pos{width:38px;font-weight:700;color:var(--dim)}.line .dt{flex:1;color:var(--text2);font-size:13.5px}',
    '.sugg{padding:14px 16px;border-top:1px solid var(--hair);font-size:15px;font-weight:700;display:flex;justify-content:space-between;cursor:pointer}.sugg i{font-style:normal;color:var(--dim)}',
    '.toast{position:absolute;left:50%;bottom:80px;transform:translateX(-50%);background:#000c;color:#fff;font-size:12px;padding:8px 14px;border-radius:99px;z-index:30;white-space:nowrap}',
    '.spacer{height:40px}'
  ].join('\n');

  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var P = 'purple', G = 'green', Y = 'yellow', E = 'est';
  var RIDES = [
    { id: 1, kind: 'route', name: 'Morning Loop', date: 'Tue 05 Aug · 08:31', lap: '5m03s', tier: P, rank: [1, 10], q: 'clean', sec: [['1:41', '1:44', P], ['1:52', '1:53', G], ['1:30', '1:34', P]], seed: 11 },
    { id: 2, kind: 'free', name: 'Lakeside trail', date: 'Mon 04 Aug · 18:12', dur: '42m10s', seed: 22 },
    { id: 3, kind: 'route', name: 'Work to Station', date: 'Mon 04 Aug · 07:48', lap: '12m20s', tier: G, rank: [4, 10], q: 'clean', sec: [['4:05', '4:02', Y], ['4:30', '4:36', G], ['3:45', '3:47', G]], seed: 33 },
    { id: 4, kind: 'unmatched', name: 'Tower Square to Home', date: 'Sun 03 Aug · 17:20', dur: '27m45s', seed: 44 },
    { id: 5, kind: 'route', name: 'Morning Loop', date: 'Sat 02 Aug · 09:02', lap: '~5m10s', tier: E, rank: [3, 10], q: 'estimated', sec: [['~1:43', '1:44', E], ['~1:55', '1:53', E], ['~1:32', '1:34', E]], seed: 55 },
    { id: 6, kind: 'route', name: 'Park Circuit', date: 'Fri 01 Aug · 19:05', lap: '8m41s', tier: Y, rank: [7, 12], q: 'clean', sec: [['2:50', '2:46', Y], ['3:02', '2:58', Y], ['2:49', '2:50', G]], seed: 66 },
    { id: 7, kind: 'route', name: 'Morning Loop', date: 'Thu 31 Jul · 08:40', lap: '5m20s', tier: Y, rank: [8, 10], q: 'clean', ignored: true, sec: [['1:46', '1:44', Y], ['1:58', '1:53', Y], ['1:36', '1:34', Y]], seed: 77 },
    { id: 8, kind: 'free', name: 'Forest walk', date: 'Wed 30 Jul · 12:30', dur: '1h05m12s', seed: 88 },
    { id: 9, kind: 'route', name: 'Park Circuit', date: 'Tue 29 Jul · 18:55', lap: 'no lap', tier: 'none', rank: null, q: 'missed', sec: [['2:55', '2:46', Y], ['--', '2:58', 'none'], ['2:51', '2:50', Y]], seed: 99 }
  ];

  function tierVar(t) { return t === P ? 'var(--purple)' : t === G ? 'var(--green)' : t === Y ? 'var(--yellow)' : 'var(--dim)'; }
  function lineCol(t) { return TIER_LINE[t] || '#F5C542'; }
  function sec(s) { var p = String(s).replace('~', '').split(':'); return p.length === 2 ? (+p[0]) * 60 + (+p[1]) : NaN; }
  function fmt(n) { var m = Math.floor(n / 60), s = Math.round(n % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  /* Deterministic fake map. opts: {h, big, sel} sel = sector index to highlight, -1 none */
  function mapSVG(r, opts) {
    var W = 400, H = opts.h, rnd = rng(r.seed * 7919), i, out = [];
    out.push('<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">');
    out.push('<rect width="' + W + '" height="' + H + '" fill="var(--mapbg)"/>');
    out.push('<rect x="' + (rnd() * 250) + '" y="' + (rnd() * H * .5) + '" width="' + (80 + rnd() * 90) + '" height="' + (40 + rnd() * 50) + '" fill="var(--park)"/>');
    out.push('<path d="M0 ' + (H * (.2 + rnd() * .6)) + ' C 120 ' + (H * rnd()) + ' 260 ' + (H * rnd()) + ' ' + W + ' ' + (H * rnd()) + '" stroke="var(--water)" stroke-width="' + (14 + rnd() * 10) + '" fill="none"/>');
    for (i = 0; i < 9; i++) { var x = rnd() * W; out.push('<line x1="' + x + '" y1="0" x2="' + (x + (rnd() - .5) * 40) + '" y2="' + H + '" stroke="var(--roadMinor)" stroke-width="' + (1 + rnd() * 1.2) + '"/>'); }
    for (i = 0; i < 6; i++) { var y = rnd() * H; out.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + (y + (rnd() - .5) * 40) + '" stroke="var(--roadMinor)" stroke-width="' + (1 + rnd() * 1.2) + '"/>'); }
    for (i = 0; i < 3; i++) { var a = rnd() * W, b = rnd() * H; out.push('<line x1="' + (a - 200) + '" y1="' + (b - 100) + '" x2="' + (a + 200) + '" y2="' + (b + 100 * (rnd() * 2 - 1)) + '" stroke="var(--road)" stroke-width="' + (3 + rnd() * 2.5) + '"/>'); }
    var n = 60, pts = [], hd = rnd() * 6.28, px = 0, py = 0, loop = r.kind === 'route', turn = loop ? (rnd() < .5 ? 1 : -1) * 6.28 / n * (.9 + rnd() * .3) : 0;
    for (i = 0; i <= n; i++) { pts.push([px, py]); hd += turn + (rnd() - .5) * (loop ? .35 : .55); px += Math.cos(hd) * 6; py += Math.sin(hd) * 6; }
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    pts.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var m = 34, sc = Math.min((W - 2 * m) / Math.max(1, maxx - minx), (H - 2 * m) / Math.max(1, maxy - miny)), ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = (H - (maxy - miny) * sc) / 2 - miny * sc;
    pts = pts.map(function (p) { return [p[0] * sc + ox, p[1] * sc + oy]; });
    function poly(a, b) { var s = []; for (var k = a; k <= b; k++) s.push(pts[k][0].toFixed(1) + ',' + pts[k][1].toFixed(1)); return s.join(' '); }
    var sw = opts.big ? 6 : 5, sel = opts.sel == null ? -1 : opts.sel;
    out.push('<polyline points="' + poly(0, n) + '" fill="none" stroke="var(--casing)" stroke-width="' + (sw + 3) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + (sel >= 0 ? .35 : .9) + '"/>');
    if (r.kind === 'route' && r.sec) {
      var cuts = [0, 20, 40, 60];
      for (i = 0; i < 3; i++) {
        var dimmed = sel >= 0 && sel !== i;
        out.push('<polyline points="' + poly(cuts[i], cuts[i + 1]) + '" fill="none" stroke="' + lineCol(r.sec[i][2]) + '" stroke-width="' + (sel === i ? sw + 2 : sw) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + (dimmed ? .22 : 1) + '"/>');
      }
    } else {
      out.push('<polyline points="' + poly(0, n) + '" fill="none" stroke="#F5C542" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>');
    }
    out.push('<circle cx="' + pts[0][0] + '" cy="' + pts[0][1] + '" r="7" fill="#fff" stroke="#111" stroke-width="2.5"/>');
    out.push('<circle cx="' + pts[n][0] + '" cy="' + pts[n][1] + '" r="7" fill="#111" stroke="#fff" stroke-width="2.5"/>');
    out.push('</svg>');
    return out.join('');
  }

  function rankText(r) { return r.rank ? 'P' + r.rank[0] + '/' + r.rank[1] : '-'; }
  function lapSec(r) { var mm = /^~?(\d+)m(\d+)s$/.exec(r.lap || ''); return mm ? (+mm[1]) * 60 + (+mm[2]) : 300; }
  function onWay(r) {
    var rnd = rng(r.seed * 31), pos = r.rank ? r.rank[0] : 5, of = r.rank ? r.rank[1] : 8, cur = lapSec(r), rows = [], days = ['Mon 28 Jul', 'Sun 27 Jul', 'Fri 25 Jul', 'Thu 24 Jul', 'Wed 23 Jul', 'Mon 21 Jul', 'Sat 19 Jul', 'Fri 18 Jul', 'Thu 17 Jul', 'Wed 16 Jul'], d = 0, i, tt, ts = [];
    ts[pos - 1] = cur; tt = cur;
    for (i = pos - 2; i >= 0; i--) { tt -= 2 + Math.floor(rnd() * 5); ts[i] = tt; }
    tt = cur;
    for (i = pos; i < of; i++) { tt += 2 + Math.floor(rnd() * 6); ts[i] = tt; }
    for (i = 0; i < of; i++) {
      var today = i === pos - 1;
      rows.push({ pos: 'P' + (i + 1), date: today ? 'today' : days[d++ % days.length], time: fmt(ts[i]), gap: i === 0 ? '0s' : '+' + Math.round(ts[i] - ts[0]) + 's', today: today });
    }
    return rows;
  }

  function init(cfg) {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var inset = cfg.map === 'inset', root = document.getElementById('stage'), openRide = null, savedTop = 0, theme = 'day', rides = RIDES.map(function (r) { return Object.assign({}, r); });
    document.documentElement.setAttribute('data-theme', 'day');
    root.innerHTML = '<div class="cap"><span><b>MOCKUP - not in the app. Fake maps, fake data.</b> Variant ' + cfg.name + '. In the app the card map moves with two fingers only, one finger scrolls; not demoable here.</span><button id="tg">Night</button></div>' +
      '<div class="phone" id="phone"><div class="head"><h1>Activities</h1><div class="sport">Running</div></div><div class="feed" id="feed"></div>' +
      '<div class="tabs">' + ['record', 'activities', 'routes', 'results', 'settings', 'demo'].map(function (t) { return '<div class="tab' + (t === 'activities' ? ' on' : '') + '">' + t + '</div>'; }).join('') + '</div></div>';
    var phone = document.getElementById('phone'), feed = document.getElementById('feed'), menu = null, toastEl = null;
    document.getElementById('tg').onclick = function () { theme = theme === 'day' ? 'night' : 'day'; document.documentElement.setAttribute('data-theme', theme); this.textContent = theme === 'day' ? 'Night' : 'Day'; };

    function toast(s) { if (toastEl) toastEl.remove(); toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.textContent = s; phone.appendChild(toastEl); setTimeout(function () { if (toastEl) toastEl.remove(); }, 1500); }
    function closeMenu() { if (menu) { menu.remove(); menu = null; } }
    function openMenu(btn, r) {
      closeMenu(); menu = document.createElement('div'); menu.className = 'menu';
      var items = [];
      if (openRide) { if (r.kind === 'free') items.push('Not a free activity'); items.push('Export GPX+'); }
      if (r.kind === 'route') items.push(r.ignored ? 'Count in ranking' : 'Ignore in ranking');
      items.push('Delete');
      items.forEach(function (label) {
        var d = document.createElement('div'); d.textContent = label;
        d.onclick = function (e) {
          e.stopPropagation(); closeMenu();
          if (/ranking/.test(label)) { r.ignored = !r.ignored; renderFeed(); if (openRide) showDetail(r, true); } else toast(label + ' (visual only)');
        };
        menu.appendChild(d);
      });
      phone.appendChild(menu);
      var pr = phone.getBoundingClientRect(), br = btn.getBoundingClientRect();
      menu.style.top = (br.bottom - pr.top + 2) + 'px'; menu.style.right = (pr.right - br.right + 6) + 'px';
    }
    document.addEventListener('click', function (e) { if (menu && !menu.contains(e.target)) closeMenu(); });

    function renderFeed() {
      var top = feed.scrollTop;
      feed.innerHTML = rides.map(function (r, i) {
        var route = r.kind === 'route', c = route ? tierVar(r.tier) : 'var(--accentText)', tint = cfg.tint && i % 2 === 1 ? ' tint' : '';
        var h = '<div class="act' + tint + '" data-id="' + r.id + '"><button class="dots" aria-label="menu">&#8943;</button>';
        h += '<div class="row1"><span class="name">' + r.name + (r.kind === 'free' ? '<span class="free">Free</span>' : '') + '</span><span class="date">' + r.date + '</span></div>';
        h += '<div class="hero' + (r.ignored ? ' dim' : '') + '"><span class="lap" style="color:' + c + '">' + (route ? r.lap : r.dur) + '</span>';
        if (route) h += '<span class="herocol"><span class="rank">' + rankText(r) + '</span><span class="qual">' + r.q + (r.ignored ? ' · ignored' : '') + '</span></span>';
        else if (r.kind === 'unmatched') h += '<span class="qual">not saved</span>';
        h += '</div>';
        h += '<div class="map' + (inset ? ' inset' : '') + '" style="height:150px">' + mapSVG(r, { h: 150 }) + '</div>';
        if (route) h += '<div class="strip">' + r.sec.map(function (s, k) { return '<span>S' + (k + 1) + '<b style="color:' + tierVar(s[2]) + '">' + s[0] + '</b></span>'; }).join('') + '</div>';
        return h + '</div>';
      }).join('') + '<div class="spacer"></div>';
      feed.scrollTop = top;
      Array.prototype.forEach.call(feed.querySelectorAll('.act'), function (el) {
        var r = rides.filter(function (x) { return String(x.id) === el.getAttribute('data-id'); })[0];
        el.onclick = function (e) { var db = e.target.closest('.dots'); if (db) { e.stopPropagation(); openMenu(db, r); return; } showDetail(r); };
      });
    }

    function showDetail(r, keep) {
      var old = phone.querySelector('.detail'), keepTop = old ? old.scrollTop : 0, sel = -1;
      if (old) old.remove();
      if (!keep) savedTop = feed.scrollTop;
      openRide = r;
      var route = r.kind === 'route', d = document.createElement('div'); d.className = 'detail';
      function build() {
        var c = route ? tierVar(r.tier) : 'var(--accentText)', h = '';
        h += '<div class="map' + (inset ? ' inset' : '') + '" style="height:320px;' + (inset ? 'margin-top:56px;' : '') + '">' + mapSVG(r, { h: 320, big: true, sel: sel }) + '</div>';
        h += '<button class="fab" style="left:12px" id="bk">&#8249;</button><button class="fab" style="right:12px;font-size:20px" id="mn">&#8943;</button>';
        h += '<div class="pad"><div class="dname">' + r.name + (r.kind === 'free' ? '<span class="free">Free</span>' : '') + '</div><div class="ddate">' + r.date + '</div>';
        h += '<div class="dlap' + (r.ignored ? ' dim' : '') + '" style="color:' + c + '">' + (route ? r.lap : r.dur) + '</div>';
        if (route) h += '<div class="drank">' + (r.rank ? 'P' + r.rank[0] + ' of ' + r.rank[1] + ' · ' : '') + r.q + (r.ignored ? ' · ignored in ranking' : '') + '</div>';
        else h += '<div class="drank">' + (r.kind === 'free' ? 'Free activity · no ranking' : 'Not saved · no ranking') + '</div>';
        h += '<button class="replay">Replay</button></div>';
        if (route) {
          h += '<div class="sec">Sectors</div>';
          r.sec.forEach(function (s, k) {
            var a = sec(s[0]), b = sec(s[1]), g = isNaN(a) ? null : Math.round(a - b), gt = g === null ? '' : (g > 0 ? '+' : g < 0 ? '-' : '') + Math.abs(g) + 's';
            h += '<div class="line click' + (sel === k ? ' sel' : '') + '" data-s="' + k + '"><span class="k">S' + (k + 1) + '</span><span class="v" style="color:' + tierVar(s[2]) + '">' + s[0] + '</span><span class="m">avg ' + s[1] + '</span><span class="g" style="color:' + (g === null ? 'var(--dim)' : g <= 0 ? 'var(--good)' : 'var(--bad)') + '">' + gt + '</span></div>';
          });
          h += '<div class="sec">On this way</div>';
          onWay(r).forEach(function (w) { h += '<div class="line' + (w.today ? ' today' : '') + '"><span class="pos">' + w.pos + '</span><span class="dt">' + w.date + '</span><span class="v" style="width:auto;margin-right:16px">' + w.time + '</span><span class="g" style="color:var(--dim)">' + w.gap + '</span></div>'; });
        }
        if (r.kind === 'unmatched') h += '<div class="sec">Suggestions</div><div class="sugg">Save as free activity<i>&#8250;</i></div><div class="sugg">Make this the reference of a new route<i>&#8250;</i></div>';
        h += '<div class="spacer"></div>';
        d.innerHTML = h;
        d.querySelector('#bk').onclick = function (e) { e.stopPropagation(); closeMenu(); d.remove(); openRide = null; feed.scrollTop = savedTop; };
        d.querySelector('#mn').onclick = function (e) { e.stopPropagation(); openMenu(this, r); };
        Array.prototype.forEach.call(d.querySelectorAll('[data-s]'), function (el) { el.onclick = function () { var k = +el.getAttribute('data-s'); sel = sel === k ? -1 : k; var t = d.scrollTop; build(); d.scrollTop = t; }; });
        Array.prototype.forEach.call(d.querySelectorAll('.sugg,.replay'), function (el) { el.onclick = function () { toast('(visual only)'); }; });
      }
      build(); phone.appendChild(d); d.scrollTop = keepTop;
    }
    renderFeed();
  }
  window.QFPreview = { init: init, mapSVG: mapSVG, RIDES: RIDES };
})();
