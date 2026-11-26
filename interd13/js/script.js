/* =========================================================
   목차
   00. 공통 (화면 배율, 버튼 효과, 유틸)
   01. 씬 1-1  눈 깜빡임
   02. 씬 1-2 ~ 1-10  sticky 스토리
   03. 씬 2  계란 / 저울 / 접시 / 그래프 (sticky)
   04. 씬 3  단백질 목표량 계산
   05. 씬 4  냉장고 드래그 앤 드롭
   06. 씬 5  평가 팝업
   ========================================================= */
(function () {
  'use strict';

  var DATA = window.APP_DATA;

  /* =======================================================
     00. 공통
     ======================================================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function rng(seed) {                       // 항상 같은 배치가 나오도록 시드 난수 사용
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var scale = 1;
  function updateScale() {                   // 1920x1080 디자인을 화면에 맞게 줄이거나 늘림
    scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--scale', scale);
  }
  updateScale();
  window.addEventListener('resize', function () { updateScale(); onScroll(); settleSnap(); });

  // 모든 버튼 : 눌렀을 때 살짝 작아졌다 커지는 효과
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.btn') : null;
    if (!b) return;
    b.classList.remove('is-press');
    void b.offsetWidth;
    b.classList.add('is-press');
  });

  // sticky 섹션에서 지금 몇 번째 단계인지 계산
  function stickyStep(section, steps) {
    var r = section.getBoundingClientRect();
    var stepPx = window.innerHeight * 0.55;
    return clamp(Math.round(-r.top / stepPx), 0, steps - 1);
  }
  function eggImg(type) {
    var img = new Image();
    img.src = 'assets/img/scene2/egg-' + type + '.svg';
    img.alt = '';
    img.draggable = false;
    return img;
  }


  /* =======================================================
     01. 씬 1-1  고단백 씨 눈 깜빡임 (프로필 1 ↔ 2)
     ======================================================= */
  (function blink() {
    var img = $('#introCharacter');
    var open = 'assets/img/scene1/profile-1.png';
    var closed = 'assets/img/scene1/profile-2.png';
    var pre = new Image(); pre.src = closed;
    function loop() {
      setTimeout(function () {
        img.src = closed;
        setTimeout(function () {
          img.src = open;
          if (Math.random() < 0.25) {        // 가끔 두 번 연속 깜빡
            setTimeout(function () { img.src = closed; setTimeout(function () { img.src = open; }, 120); }, 180);
          }
          loop();
        }, 130);
      }, 2200 + Math.random() * 2000);
    }
    loop();
  })();


  /* =======================================================
     02. 씬 1-2 ~ 1-10  하루 일과
     ======================================================= */
  var storySection = $('#scene1-story');
  var storyFrame = $('#storyFrame');
  var stories = $$('.story', storyFrame);
  var timeHeader = $('#timeHeader');
  var timeBtns = $$('.time-btn', storyFrame);
  var lastBubbles = $$('.last-bubble', storyFrame);
  var eggRise = $('#eggRise');
  var intro = $('#intro');
  var STORY_STEPS = 13;            // 0 = 1-1,  1~8 = 1-2~1-9,  9~11 = 1-10 말풍선,  12 = 계란
  var storyStep = -1;

  // 1-10 에서 올라오는 계란
  (function buildRiseEggs() {
    var rand = rng(7);
    DATA.eggs10.forEach(function (e) {
      var d = document.createElement('div');
      d.className = 'rise-egg';
      d.style.setProperty('--x', (e[0] - 15) + 'px');
      d.style.setProperty('--y', (e[1] - 20) + 'px');
            d.style.setProperty('--d', (rand() * 0.7).toFixed(2) + 's');
      d.appendChild(eggImg(e[2]));
      eggRise.appendChild(d);
    });
  })();

  function setStoryStep(step) {
    if (step === storyStep) return;
    storyStep = step;
    storyFrame.setAttribute('data-step', step);
    var idx = step === 0 ? -1 : (step <= 8 ? step - 1 : 8);
    intro.classList.toggle('is-out', step > 0);
    stories.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
    timeHeader.classList.toggle('is-visible', step >= 1 && step <= 8);
    timeBtns.forEach(function (b, i) { b.classList.toggle('is-current', step === i + 1); });
    lastBubbles.forEach(function (b, i) { b.classList.toggle('is-on', step >= 9 + i); });
    eggRise.classList.toggle('is-on', step >= 12);
  }

  // 시간 버튼 : 눌러서 바로 그 장면으로 이동
  timeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.getAttribute('data-story'), 10);
      jumpToStep(storySection, i + 1);
    });
  });


  /* =======================================================
     03. 씬 2  현대인의 단백질 섭취 현황
     ======================================================= */
  var scene2 = $('#scene2');
  var s2Frame = $('#scene2Frame');
  var eggLayer = $('#eggLayer');
  var scaleDisplay = $('#scaleDisplay');
  var S2_STEPS = 13;
  var s2Stage = -1;

  /* ---- 접시 위에 쌓이는 계란 모양 (아래 줄부터 위로) ---- */
  function pileLayout(rows, dx, dy, seed) {
    var rand = rng(seed), out = [];
    rows.forEach(function (count, r) {
      for (var i = 0; i < count; i++) {
        out.push({
          x: (i - (count - 1) / 2) * dx + (rand() - 0.5) * 12 + (r % 2 ? dx * 0.18 : -dx * 0.12),
          y: -r * dy + (rand() - 0.5) * 10,
          r: (rand() - 0.5) * 80,
          row: r
        });
      }
    });
    return out;
  }
  var PILE_AVG    = pileLayout([11, 10, 9, 8, 8, 7, 6, 5, 3, 2, 1], 24, 23.5, 11);   // 70개 (평균 70.7g)
  var PILE_MALE   = pileLayout([13, 12, 11, 10, 9, 8, 7, 6, 4, 2, 1], 23.5, 24.5, 23); // 83개 (남성 83.6g)
  var PILE_FEMALE = pileLayout([10, 9, 8, 7, 7, 6, 5, 4, 2, 1, 1], 22.5, 19.4, 37);    // 60개 (여성 59.9g)

  /* ---- 계란 요소 만들기 ---- */
  var eggs = [];
  (function buildEggs() {
    var rand = rng(2024);
    var field = DATA.eggs96;
    var order = shuffle(field.map(function (_, i) { return i; }), rand);
    var pileSet = {};
    order.slice(0, 70).forEach(function (fi, p) { pileSet[fi] = p; });

    function add(kind, x, y, type, extra) {
      var el = document.createElement('div');
      el.className = 'egg';
      el.style.setProperty('--fd', (2.4 + rand() * 2.0).toFixed(2) + 's');
      el.style.setProperty('--fo', (-rand() * 4).toFixed(2) + 's');
      el.appendChild(eggImg(type));
      eggLayer.appendChild(el);
      var o = { el: el, kind: kind, bx: x, by: y, br: 0, z: 1 + Math.floor(rand() * 8) };
      for (var k in extra) o[k] = extra[k];
      eggs.push(o);
      return o;
    }
    // 시안의 계란 96개 (이 중 70개가 접시로 모임)
    field.forEach(function (e, i) {
      if (pileSet[i] !== undefined) add('pile', e[0], e[1], e[2], { p: pileSet[i] });
      else add('gone', e[0], e[1], e[2]);
    });
    // 화면 비율이 달라도 빈틈이 없도록 바깥쪽에도 계란을 깔아 둠 (접시로는 모이지 않음)
    var extras = [];
    var tries = 0;
    while (extras.length < 90 && tries < 4000) {
      tries++;
      var x, y;
      if (rand() < 0.5) { x = rand() < 0.5 ? -60 - rand() * 420 : 1980 + rand() * 420; y = -200 + rand() * 1480; }
      else { x = -60 + rand() * 2040; y = rand() < 0.5 ? -200 + rand() * 170 : 1110 + rand() * 170; }
      var ok = extras.every(function (q) { return Math.hypot(q[0] - x, q[1] - y) > 95; });
      if (ok) extras.push([x, y]);
    }
    extras.forEach(function (q) { add('gone', q[0], q[1], 1 + Math.floor(rand() * 4)); });
    // 남성 접시에 더 올라가는 계란 13개, 여성 접시 계란 60개
    for (var m = 70; m < 83; m++) add('maleExtra', 0, 0, 1 + Math.floor(rand() * 4), { p: m });
    for (var f = 0; f < 60; f++) add('female', 0, 0, 1 + Math.floor(rand() * 4), { p: f });
  })();

  function putEgg(o, x, y, r, opacity, dur, delay, odelay, z) {
    var s = o.el.style;
    s.setProperty('--x', (x - 15) + 'px');
    s.setProperty('--y', (y - 20.5) + 'px');
    s.setProperty('--r', r + 'deg');
    s.setProperty('--o', opacity);
    s.setProperty('--dur', dur + 's');
    s.setProperty('--d', delay + 's');
    s.setProperty('--od', (odelay || 0) + 's');
    s.zIndex = z;
  }

  // 단계별 계란 위치 (뒤로 스크롤해도 같은 상태로 돌아옴)
  var PLATE_TOP = { avg: 633, low: 738, up: 471 };
  var AVG_X = 960, MALE_X = 706, FEMALE_X = 1237;
  var seedRand = rng(99);
  var randomTimes = eggs.map(function () { return [seedRand(), seedRand(), seedRand()]; });

  // 2-1-2 : 저울(+접시)이 놓일 자리. 이 안에 있는 계란은 저울이 나타날 때 바깥으로 살짝 밀려남
  var KEEP_OUT = { l: 706, r: 1214, t: 600, b: 890 };   // 저울 + 접시 + 계란 반 개 크기의 여유
  var pushed = null;
  function computePushed() {
    var pos = [], active = [], i, j2, n = eggs.length, EX = 38, EY = 50;   // 계란 하나가 차지하는 가로/세로 간격
    var movers = [];
    eggs.forEach(function (o, k) {
      var field = o.kind === 'pile' || o.kind === 'gone';
      pos.push([o.bx, o.by]); active.push(false);
      if (field) movers.push(k);
    });
    function pushOutOfRect(k) {
      var x = pos[k][0], y = pos[k][1];
      if (x > KEEP_OUT.l && x < KEEP_OUT.r && y > KEEP_OUT.t && y < KEEP_OUT.b) {
        var d = [x - KEEP_OUT.l, KEEP_OUT.r - x, y - KEEP_OUT.t, KEEP_OUT.b - y], m = Math.min.apply(null, d);
        if (m === d[0]) x = KEEP_OUT.l; else if (m === d[1]) x = KEEP_OUT.r;
        else if (m === d[2]) y = KEEP_OUT.t; else y = KEEP_OUT.b;
        pos[k] = [x, y]; active[k] = true;
      }
    }
    movers.forEach(pushOutOfRect);
    for (var it = 0; it < 120; it++) {                  // 겹치는 계란끼리 서로 밀어냄
      var moved = false;
      for (i = 0; i < movers.length; i++) {
        for (j2 = i + 1; j2 < movers.length; j2++) {
          var a1 = movers[i], b1 = movers[j2];
          if (!active[a1] && !active[b1]) continue;     // 원래 시안 배치는 건드리지 않음
          var dx = pos[b1][0] - pos[a1][0], dy = pos[b1][1] - pos[a1][1];
          var q = (dx * dx) / (EX * EX) + (dy * dy) / (EY * EY);
          if (q < 1) {
            if (q < 1e-6) { dx = 1; dy = 0; q = 1e-6; }
            var s = (1 / Math.sqrt(q) - 1) / 2 + 0.02;
            pos[a1] = [pos[a1][0] - dx * s, pos[a1][1] - dy * s];
            pos[b1] = [pos[b1][0] + dx * s, pos[b1][1] + dy * s];
            active[a1] = active[b1] = true; moved = true;
          }
        }
      }
      movers.forEach(pushOutOfRect);
      if (!moved) break;
    }
    return pos;
  }
  function pushedPos(o) {
    if (!pushed) pushed = computePushed();
    return pushed[eggs.indexOf(o)];
  }
  // 접시에 올라가는 계란이 아래 줄부터 예쁘게 쌓이도록 줄마다 시간 차를 줌
  function rowDelay(row, rt) { return row * 0.14 + rt * 0.1; }

  function layoutEggs(stage) {
    eggs.forEach(function (o, i) {
      var rt = randomTimes[i];
      var piled = false;
      if (o.kind === 'pile') {
        if (stage === 0) {
          putEgg(o, o.bx, o.by, o.br, 1, 1.2, 0, 0, o.z);
        } else if (stage === 1) {
          var pp = pushedPos(o);
          putEgg(o, pp[0], pp[1], o.br, 1, 1.1, rt[2] * 0.2, 0, o.z);
        } else if (stage === 2) {
          var L = PILE_AVG[o.p];
          putEgg(o, AVG_X + L.x, PLATE_TOP.avg + 31 + L.y, L.r, 1, 1.0 + rt[0] * 0.3, rowDelay(L.row, rt[1]), 0, 20 + L.row);
          piled = true;
        } else if (stage === 3) {
          var L3 = PILE_AVG[o.p];
          putEgg(o, AVG_X + L3.x, PLATE_TOP.low + 31 + L3.y, L3.r, 1, 0.9, 0, 0, 20 + L3.row);
          piled = true;
        } else if (stage === 4) {
          var M = PILE_MALE[o.p];
          putEgg(o, MALE_X + M.x, PLATE_TOP.low + 31 + M.y, M.r, 1, 1.0, rowDelay(M.row, rt[1]) * 0.6, 0, 20 + M.row);
          piled = true;
        } else if (stage === 5) {
          var M5 = PILE_MALE[o.p];
          putEgg(o, MALE_X + M5.x, PLATE_TOP.up + 31 + M5.y, M5.r, 1, 0.9, 0, 0, 20 + M5.row);
          piled = true;
        } else {
          var M6 = PILE_MALE[o.p];
          putEgg(o, MALE_X + M6.x, PLATE_TOP.up + 31 + M6.y - 30, M6.r, 0, 0.7, 0, 0, 20 + M6.row);
          piled = true;
        }
      } else if (o.kind === 'gone') {
        // 접시로 가지 않는 계란은 접시가 채워지면 사라짐
        if (stage === 1) { var pg = pushedPos(o); putEgg(o, pg[0], pg[1], o.br, 1, 1.1, rt[2] * 0.2, 0, o.z); }
        else putEgg(o, o.bx, o.by, o.br, stage === 0 ? 1 : 0, 1.2, 0, stage === 0 ? 0 : 0.2 + rt[2] * 0.9, o.z);
      } else if (o.kind === 'maleExtra') {
        var Me = PILE_MALE[o.p];
        if (stage < 4) putEgg(o, MALE_X + Me.x, PLATE_TOP.low + 31 + Me.y - 160, Me.r, 0, 0.6, 0, 0, 20 + Me.row);
        else if (stage === 4) putEgg(o, MALE_X + Me.x, PLATE_TOP.low + 31 + Me.y, Me.r, 1, 0.9, 0.5 + rowDelay(Me.row, rt[1]) * 0.6, 0.5 + rowDelay(Me.row, rt[1]) * 0.6, 20 + Me.row);
        else if (stage === 5) putEgg(o, MALE_X + Me.x, PLATE_TOP.up + 31 + Me.y, Me.r, 1, 0.9, 0, 0, 20 + Me.row);
        else putEgg(o, MALE_X + Me.x, PLATE_TOP.up + 31 + Me.y - 30, Me.r, 0, 0.7, 0, 0, 20 + Me.row);
        piled = true;
      } else if (o.kind === 'female') {
        var F = PILE_FEMALE[o.p];
        if (stage < 4) putEgg(o, AVG_X, PLATE_TOP.low + 31, F.r, 0, 0.6, 0, 0, 20 + F.row);
        else if (stage === 4) putEgg(o, FEMALE_X + F.x, PLATE_TOP.low + 31 + F.y, F.r, 1, 1.0, 0.1 + rowDelay(F.row, rt[1]) * 0.7, 0.1 + rowDelay(F.row, rt[1]) * 0.7, 20 + F.row);
        else if (stage === 5) putEgg(o, FEMALE_X + F.x, PLATE_TOP.up + 31 + F.y, F.r, 1, 0.9, 0, 0, 20 + F.row);
        else putEgg(o, FEMALE_X + F.x, PLATE_TOP.up + 31 + F.y - 30, F.r, 0, 0.7, 0, 0, 20 + F.row);
        piled = true;
      }
      o.el.classList.toggle('is-piled', piled);
    });
  }

  /* ---- 저울 숫자 (0 → 70.7) ---- */
  var counterVal = 0, counterRAF = 0, counterTimer = 0;
  function runCounter(to, dur, wait) {
    cancelAnimationFrame(counterRAF);
    clearTimeout(counterTimer);
    var from = counterVal;
    counterTimer = setTimeout(function () {
      var t0 = performance.now();
      (function frame(t) {
        var k = clamp((t - t0) / (dur * 1000), 0, 1);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        counterVal = from + (to - from) * e;
        scaleDisplay.textContent = counterVal.toFixed(1) + 'g';
        if (k < 1) counterRAF = requestAnimationFrame(frame);
        else {                                           // 다 올라갔을 때 70.7g 가 두 번 깜빡
          scaleDisplay.classList.remove('is-blink'); void scaleDisplay.offsetWidth;
          scaleDisplay.classList.add('is-blink');
        }
      })(t0);
    }, wait * 1000);
  }
  function updateCounter(stage, prev) {
    if (stage <= 1) {
      cancelAnimationFrame(counterRAF); clearTimeout(counterTimer);
      counterVal = 0; scaleDisplay.textContent = ''; scaleDisplay.classList.remove('is-blink');
    } else if (stage === 2 && prev <= 1) {
      counterVal = 0; scaleDisplay.textContent = '0.0g';
      runCounter(70.7, 2.4, 0.25);
    } else {
      cancelAnimationFrame(counterRAF); clearTimeout(counterTimer);
      counterVal = 70.7; scaleDisplay.textContent = '70.7g'; scaleDisplay.classList.remove('is-blink');
    }
  }

  /* ---- 끼니별 막대그래프 (2-3-2) ---- */
  (function buildMealChart() {
    var host = $('#mealChart');
    var names = ['아침', '점심', '저녁', '간식'];
    var sets = [
      { cls: 'male',   x: [452, 541, 629, 718],     v: [17.4, 32.6, 38.4, 11.6] },
      { cls: 'female', x: [1164, 1253, 1341, 1430], v: [19.1, 32.4, 34.8, 13.7] }
    ];
    var base = document.createElement('div');
    base.className = 'meal-chart__base';
    host.appendChild(base);
    sets.forEach(function (s) {
      s.x.forEach(function (x, i) {
        var bar = document.createElement('div');
        bar.className = 'meal-bar meal-bar--' + s.cls;
        bar.style.left = x + 'px';
        bar.style.setProperty('--h', (s.v[i] * 6.0) + 'px');
        bar.style.setProperty('--bd', (0.6 + i * 0.12) + 's');
        host.appendChild(bar);
        var n = document.createElement('span');
        n.className = 'meal-bar__name'; n.style.left = x + 'px'; n.textContent = names[i];
        host.appendChild(n);
        var p = document.createElement('span');
        p.className = 'meal-bar__pct'; p.style.left = x + 'px'; p.textContent = s.v[i].toFixed(1) + '%';
        host.appendChild(p);
      });
    });
  })();

  /* ---- 연령별 꺾은선 그래프 (2-4) ---- */
  var lineChart = $('#lineChart');
  var NS = 'http://www.w3.org/2000/svg';
  var LC = {
    cats: ['20대 미만', '20대', '30대', '40대', '50대', '60대', '70대 이상'],
    male: {
      intake:  { v: [78.5, 90.3, 88.1, 82.4, 74.1, 66.2, 54.6], pos: 'aaaaaaa' },
      fulfil:  { v: [70, 75, 75, 70, 65, 55, 45],               pos: 'bbbbbbb' }
    },
    female: {
      intake:  { v: [65, 63.5, 60.8, 58.9, 54.2, 48.1, 39.8],   pos: 'baabbaa' },
      fulfil:  { v: [70, 55, 60, 60, 55, 45, 35],               pos: 'abbaabb' }
    }
  };
  function svgEl(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  (function buildLineChart() {
    var X0 = 151, DX = 132, Y0 = 416, UNIT = 3.45;
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = Y0 - v * UNIT;
      lineChart.appendChild(svgEl('line', { x1: 150, x2: 943, y1: y, y2: y, 'class': 'lc-grid' }));
      lineChart.appendChild(svgEl('text', { x: 79, y: y + 5, 'class': 'lc-axis-label' }, v));
    });
    LC.cats.forEach(function (c, i) {
      lineChart.appendChild(svgEl('text', { x: X0 + DX * i, y: 437, 'class': 'lc-cat-label' }, c));
    });
    lineChart.appendChild(svgEl('line', { x1: 80, x2: 110, y1: 478, y2: 478, 'class': 'lc-line lc-line--red', style: 'stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3' }));
    lineChart.appendChild(svgEl('text', { x: 118, y: 482, 'class': 'lc-legend' }, '일평균 단백질 섭취량 (g)'));
    lineChart.appendChild(svgEl('line', { x1: 80, x2: 110, y1: 497, y2: 497, 'class': 'lc-line lc-line--purple', style: 'stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3' }));
    lineChart.appendChild(svgEl('text', { x: 118, y: 501, 'class': 'lc-legend' }, '일평균 필요 단백질 섭취량 충족률 (%)'));

    ['male', 'female'].forEach(function (g) {
      var set = svgEl('g', { 'class': 'lc-set lc-set--' + g });
      [['intake', 'red'], ['fulfil', 'purple']].forEach(function (pair) {
        var s = LC[g][pair[0]], col = pair[1];
        var pts = s.v.map(function (v, i) { return [X0 + DX * i, Y0 - v * UNIT]; });
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        set.appendChild(svgEl('path', { d: d, 'class': 'lc-line lc-line--' + col }));
        pts.forEach(function (p, i) {
          var delay = (0.15 + (i / 6) * 1.25).toFixed(2) + 's';
          var c = svgEl('circle', { cx: p[0], cy: p[1], r: 6, 'class': 'lc-dot lc-dot--' + col });
          c.style.setProperty('--pd', delay);
          var up = s.pos.charAt(i) === 'a';
          var t = svgEl('text', { x: p[0], y: up ? p[1] - 15 : p[1] + 26, 'class': 'lc-value lc-value--' + col }, s.v[i]);
          t.style.setProperty('--pd', delay);
          set.appendChild(c); set.appendChild(t);
        });
      });
      lineChart.appendChild(set);
    });
    // 선의 길이를 구해 둠 (그려지는 효과에 사용)
    $$('.lc-set .lc-line', lineChart).forEach(function (p) {
      p.style.setProperty('--len', p.getTotalLength ? Math.ceil(p.getTotalLength()) + 2 : 1200);
    });
  })();

  var chartGender = 'male';
  function drawChart(gender) {
    chartGender = gender;
    s2Frame.setAttribute('data-chart', gender);
    $$('.lc-set', lineChart).forEach(function (g) { g.classList.remove('is-drawing'); });
    void lineChart.getBoundingClientRect();
    var g = $('.lc-set--' + gender, lineChart);
    // 한 프레임 뒤에 시작해야 매번 처음부터 다시 그려짐
    requestAnimationFrame(function () { requestAnimationFrame(function () { g.classList.add('is-drawing'); }); });
  }
  $('#personMale').addEventListener('click', function () { if (s2Stage === 9 || s2Stage === 10) drawChart('male'); });
  $('#personFemale').addEventListener('click', function () { if (s2Stage === 9 || s2Stage === 10) drawChart('female'); });
  s2Frame.setAttribute('data-chart', 'male');

  /* ---- 단계 전환 ---- */
  function setStage2(stage) {
    if (stage === s2Stage) return;
    var prev = s2Stage;
    s2Stage = stage;
    s2Frame.setAttribute('data-stage', stage);
    layoutEggs(stage);
    updateCounter(stage, prev);
    if (stage >= 9 && stage <= 10 && (prev < 9 || prev > 10)) drawChart(chartGender);
    if (stage !== 9) $$('.lc-set', lineChart).forEach(function (g) { if (stage < 9) g.classList.remove('is-drawing'); });
    $('#personMale').tabIndex = (stage === 9 || stage === 10) ? 0 : -1;
    $('#personFemale').tabIndex = (stage === 9 || stage === 10) ? 0 : -1;
  }
  layoutEggs(0);


  /* =======================================================
     04. 씬 3  단백질 목표량 계산
     ======================================================= */
  var scene3 = $('#scene3');
  var scene4 = $('#scene4');
  var calc = { gender: null, age: null, weight: null };
  var goal = null;

  // 연령·성별 기준 단백질량(g)
  var BASE_PROTEIN = {
    male:   { 20: 65, 30: 65, 40: 65, 50: 60, 60: 60, 70: 60 },
    female: { 20: 55, 30: 50, 40: 50, 50: 50, 60: 50, 70: 50 }
  };
  function calcGoal(gender, age, weight) {
    var need;
    if (gender === 'male' && weight < 50) need = weight + 10;         // 50kg 미만 남성 : 체중 + 10
    else if (gender === 'female' && weight < 45) need = weight + 8;   // 45kg 미만 여성 : 체중 + 8
    else need = Math.max(weight * 1.0, BASE_PROTEIN[gender][age]);
    return Math.ceil(need / 5) * 5;
  }

  function bindPills(wrapId, key) {
    $$('.pill', $(wrapId)).forEach(function (pill) {
      pill.addEventListener('click', function () {
        $$('.pill', $(wrapId)).forEach(function (p) { p.classList.remove('is-selected'); });
        pill.classList.add('is-selected');
        calc[key] = pill.getAttribute('data-value');
        updateGoal();
      });
    });
  }
  bindPills('#genderOptions', 'gender');
  bindPills('#ageOptions', 'age');

  // 체중 선택 (30 ~ 150kg)
  (function buildWeight() {
    var list = $('#weightList'), box = $('#weightSelect'), valueEl = $('#weightValue');
    for (var w = 30; w <= 150; w++) {
      var li = document.createElement('li');
      li.textContent = w; li.setAttribute('role', 'option'); li.setAttribute('data-w', w);
      list.appendChild(li);
    }
    $('#weightButton').addEventListener('click', function (e) {
      e.stopPropagation();
      box.classList.toggle('is-open');
      if (box.classList.contains('is-open')) {
        var sel = $('.is-selected', list);
        if (sel) list.scrollTop = sel.offsetTop - 36;
      }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li) return;
      $$('li', list).forEach(function (x) { x.classList.remove('is-selected'); });
      li.classList.add('is-selected');
      valueEl.textContent = li.getAttribute('data-w');
      calc.weight = parseInt(li.getAttribute('data-w'), 10);
      box.classList.remove('is-open');
      updateGoal();
    });
    document.addEventListener('click', function () { box.classList.remove('is-open'); });
  })();

  var recalcTimer = 0;
  function updateGoal() {
    if (!calc.gender || !calc.age || !calc.weight) return;
    var next = calcGoal(calc.gender, parseInt(calc.age, 10), calc.weight);
    var card = $('#calcResult');
    var was = goal;
    goal = next;
    $('#goalBoxValue').textContent = goal + 'g';
    if (was !== null && was !== next) {              // 값이 바뀌면 문구가 흐려졌다가 새 값과 함께 다시 등장
      card.classList.add('is-recalc');
      clearTimeout(recalcTimer);
      recalcTimer = setTimeout(function () {
        $('#goalText').textContent = goal + 'g';
        card.classList.remove('is-recalc');
      }, 200);
    } else {
      $('#goalText').textContent = goal + 'g';
    }
    card.classList.add('is-done');
    scene3.classList.add('is-done');
    scene4.hidden = false;                 // 목표량이 정해지면 다음 씬이 아래에 이어짐
    updateFinish();
  }

  $('#goMealBtn').addEventListener('click', function () { goToSection(scene4, 1100); });
  $('#hintScene2').addEventListener('click', function () { stepNav(1); });

  /* 1-1 : 고단백 씨 뒤로 지나가는 음식 (식사류·디저트류) — 크기·간격 일정, 왼쪽 → 오른쪽 */
  (function buildFoodParade() {
    var track = $('#foodParadeTrack');
    var list = DATA.foods.filter(function (f) { return f.cat === 'meal' || f.cat === 'dessert'; });
    var GAP = 360, SCALE = 2.38, MAXW = 200, MAXH = 120, CY = 725;
    var setW = list.length * GAP;
    function add(f, i, off) {
      var k = Math.min(SCALE, MAXW / f.w, MAXH / f.h);
      var w = f.w * k, h = f.h * k;
      var d = document.createElement('div');
      d.className = 'food-parade__item';
      d.style.left = (off + i * GAP + (GAP - w) / 2) + 'px';
      d.style.top = (CY - h / 2) + 'px';
      d.style.width = w + 'px'; d.style.height = h + 'px';
      d.innerHTML = '<img src="assets/img/food/' + f.id + '.svg" alt="" draggable="false">';
      track.appendChild(d);
    }
    for (var r = 0; r < 2; r++) list.forEach(function (f, i) { add(f, i, r * setW); });
    for (var r2 = 2; r2 * setW < 1920 + setW; r2++) list.forEach(function (f, i) { add(f, i, r2 * setW); });
    track.style.setProperty('--set-w', setW + 'px');
    track.style.left = (-setW) + 'px';
    track.style.setProperty('--parade-dur', (setW / 36) + 's');   // 약 36px/초
  })();


  /* =======================================================
     05. 씬 4  냉장고 : 클릭 / 드래그 앤 드롭
     ======================================================= */
  var stage4 = $('#scene4Stage');
  var itemsLayer = $('#fridgeItems');
  var infoShelf = $('#infoShelf');
  var finishBtn = $('#finishBtn');
  var PLATE_LEFT = [310, 684, 1058], PLATE_TOP_Y = 832, PLATE_W = 341, PLATE_H = 122;
  var plates = [[], [], []];             // 접시마다 담긴 음식 id (최대 2개)
  var foodMap = {};
  var shelfList = [];                    // 오른쪽 정보 칸 (최신이 위, 최대 3개)
  var SLOT_TOP = [0, 173, 358];

  DATA.foodLabels.forEach(function (l) {
    var s = document.createElement('span');
    s.textContent = l.text; s.style.left = l.x + 'px'; s.style.top = l.y + 'px';
    $('#fridgeLabels').appendChild(s);
  });

  DATA.foods.forEach(function (f) {
    var el = document.createElement('div');
    el.className = 'food';
    el.style.width = f.w + 'px'; el.style.height = f.h + 'px';
    el.setAttribute('data-id', f.id);
    var img = new Image(); img.src = 'assets/img/food/' + f.id + '.svg'; img.alt = f.name; img.draggable = false;
    el.appendChild(img);
    itemsLayer.appendChild(el);
    foodMap[f.id] = { data: f, el: el, x: f.x, y: f.y, plate: -1 };
    moveFood(foodMap[f.id], f.x, f.y);
    attachDrag(foodMap[f.id]);
  });

  function moveFood(F, x, y) {
    F.x = x; F.y = y;
    F.el.style.transform = 'translate(' + (x - F.data.w / 2) + 'px,' + (y - F.data.h / 2) + 'px)';
  }
  function pointerToStage(e) {
    var r = stage4.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (r.width / 1920), y: (e.clientY - r.top) / (r.height / 1080) };
  }
  function plateAt(x, y) {                // 놓은 위치에 있는 접시 번호 (없으면 -1)
    for (var i = 0; i < 3; i++) {
      if (x > PLATE_LEFT[i] - 30 && x < PLATE_LEFT[i] + PLATE_W + 30 && y > PLATE_TOP_Y - 60 && y < PLATE_TOP_Y + PLATE_H + 50) return i;
    }
    return -1;
  }
  function inFridge(x, y) { return x > 280 && x < 1430 && y > 91 && y < 801; }

  function layoutPlate(i) {
    var list = plates[i], cx = PLATE_LEFT[i] + PLATE_W / 2, cy = PLATE_TOP_Y + 50;
    list.forEach(function (id, k) {
      var F = foodMap[id];
      var x = list.length === 1 ? cx : cx + (k === 0 ? -48 : 48);
      F.el.classList.add('is-on-plate');
      moveFood(F, x, cy - F.data.h / 2 + 22);
    });
  }
  function sendHome(F) {
    F.el.classList.remove('is-on-plate');
    moveFood(F, F.data.x, F.data.y);
  }

  function attachDrag(F) {
    var start = null, dragging = false, offset = null, from = null;
    F.el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      F.el.setPointerCapture(e.pointerId);
      var p = pointerToStage(e);
      start = p; dragging = false;
      offset = { x: F.x - p.x, y: F.y - p.y };
      from = { x: F.x, y: F.y, plate: F.plate };
    });
    F.el.addEventListener('pointermove', function (e) {
      if (!start) return;
      var p = pointerToStage(e);
      if (!dragging && Math.hypot(p.x - start.x, p.y - start.y) > 5) {
        dragging = true; F.el.classList.add('is-dragging');
      }
      if (dragging) moveFood(F, p.x + offset.x, p.y + offset.y);
    });
    function end(e) {
      if (!start) return;
      var p = pointerToStage(e);
      var wasDrag = dragging;
      start = null; dragging = false;
      F.el.classList.remove('is-dragging');
      if (!wasDrag) {                                         // 클릭만 한 경우 : 정보 보기
        showInfo(F.data.id);
        if (F.plate >= 0) {                                   // 접시 위 음식을 클릭하면 냉장고로 되돌아감
          var pi = F.plate;
          plates[pi].splice(plates[pi].indexOf(F.data.id), 1);
          F.plate = -1;
          layoutPlate(pi);
          sendHome(F);
          updateFinish();
        }
        return;
      }

      var target = plateAt(p.x, p.y);
      if (target >= 0 && (plates[target].length < 2 || F.plate === target)) {
        if (F.plate >= 0) plates[F.plate].splice(plates[F.plate].indexOf(F.data.id), 1);
        var old = F.plate;
        if (plates[target].indexOf(F.data.id) < 0) plates[target].push(F.data.id);
        F.plate = target;
        layoutPlate(target);
        if (old >= 0 && old !== target) layoutPlate(old);
        showInfo(F.data.id);
      } else if (F.plate >= 0 && inFridge(p.x, p.y)) {          // 접시에서 꺼내 냉장고에 되돌려 놓기
        plates[F.plate].splice(plates[F.plate].indexOf(F.data.id), 1);
        var oldPlate = F.plate; F.plate = -1;
        layoutPlate(oldPlate);
        sendHome(F);
      } else if (F.plate >= 0) {
        layoutPlate(F.plate);                                   // 제자리로
      } else {
        sendHome(F);                                            // 담을 수 없으면 냉장고로 복귀
      }
      updateFinish();
    }
    F.el.addEventListener('pointerup', end);
    F.el.addEventListener('pointercancel', end);
  }

  // 오른쪽 정보 칸 : 새로 클릭/드롭한 음식이 맨 위로, 기존 음식은 아래로 밀림
  function showInfo(id) {
    shelfList = shelfList.filter(function (x) { return x !== id; });
    shelfList.unshift(id);
    shelfList = shelfList.slice(0, 3);
    $$('.info-slot', infoShelf).forEach(function (s) { s.remove(); });
    shelfList.forEach(function (fid, i) {
      var d = foodMap[fid].data;
      var slot = document.createElement('div');
      slot.className = 'info-slot';
      slot.style.top = SLOT_TOP[i] + 'px';
      slot.style.height = (i === 1 ? 179 : 167) + 'px';
      var img = new Image(); img.src = 'assets/img/food/' + d.id + '.svg'; img.alt = '';
      img.style.top = (50 - d.h / 2 + 5) + 'px';
      img.style.width = d.w + 'px'; img.style.height = d.h + 'px';
      var name = document.createElement('p'); name.className = 'info-slot__name'; name.textContent = d.name; name.style.top = '96px';
      var g = document.createElement('p'); g.className = 'info-slot__gram'; g.textContent = d.gram + 'g'; g.style.top = '122px';
      slot.appendChild(img); slot.appendChild(name); slot.appendChild(g);
      infoShelf.appendChild(slot);
    });
  }

  function platedSum() {
    var sum = 0;
    plates.forEach(function (l) { l.forEach(function (id) { sum += foodMap[id].data.gram; }); });
    return sum;
  }
  function updateFinish() {
    var any = plates.some(function (l) { return l.length > 0; });
    finishBtn.disabled = !(any && goal !== null);
  }

  // 도움말 말풍선
  var helpBtn = $('#helpBtn'), helpBubble = $('#helpBubble');
  helpBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = helpBubble.classList.toggle('is-open');
    helpBtn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', function () {
    helpBubble.classList.remove('is-open'); helpBtn.setAttribute('aria-expanded', 'false');
  });


  /* =======================================================
     06. 씬 5  평가 팝업
     ======================================================= */
  var overlay = $('#resultOverlay');
  var popup = $('#resultPopup');
  var LEVELS = {
    1: { title: '어라…\n머리카락이 왜 이렇게\n많이 빠지지?!', img: [241, 265, 471, 333] },
    2: { title: '몸이 좀 으슬으슬하네…\n감기몸살인가?',       img: [297, 209, 365, 400] },
    3: { title: '오늘도\n어떻게든 버텼다!',                   img: [326, 204, 340, 404] },
    4: { title: '기운이\n남아도는구나!!!!!',                  img: [298, 204, 377, 401] }
  };

  function levelOf(diff) {                 // diff = 필요량 - 섭취량
    if (diff >= 15) return 1;              // 15g 이상 부족  : 매우 부족
    if (diff >= 5) return 2;               // 5g 이상 15g 미만 부족 : 부족
    if (diff >= 1) return 3;               // 1g 이상 5g 미만 부족  : 부족
    return 4;                              // 필요량 이상 : 충분
  }

  function openResult() {
    var sum = platedSum();
    var diff = goal - sum;
    var lv = levelOf(diff);
    var cfg = LEVELS[lv];

    popup.setAttribute('data-level', lv);
    $('#resultTitle').textContent = cfg.title;
    var il = $('#resultIllust');
    il.src = 'assets/img/scene5/result-' + lv + '.png';
    il.style.left = (cfg.img[0] - 9) + 'px'; il.style.top = (cfg.img[1] + 5) + 'px';
    il.style.width = cfg.img[2] + 'px'; il.style.height = cfg.img[3] + 'px';
    il.style.transform = 'none';
    $('#resultScore').textContent = sum + '/' + goal + 'g';
    $('#resultDesc').innerHTML = diff > 0
      ? '필요 섭취량보다 <b>' + diff + 'g</b> 부족하게 먹었어요'
      : '필요 섭취량을 충족했어요';

    // 게이지 : 0 ~ 100g (필요량이 커지면 눈금도 늘어남)
    var max = Math.max(100, Math.ceil((goal + 20) / 10) * 10);
    var bad = (goal - 15) / max * 100, ok = goal / max * 100;
    var zones = $$('.gauge__zone');
    zones[0].style.width = Math.max(0, bad) + '%';
    zones[1].style.width = (ok - Math.max(0, bad)) + '%';
    zones[2].style.width = (100 - ok) + '%';
    $('#gaugeMax').textContent = max;
    var pin = $('#gaugePin');
    pin.style.transition = 'none'; pin.style.left = '0%';
    void pin.offsetWidth;
    pin.style.transition = '';
    overlayOpen = true;
    overlay.classList.add('is-open');        // 아래에서 위로 올라오고, 그 뒤에 버튼이 나타남
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { pin.style.left = clamp(sum / max * 100, 0, 100) + '%'; });
  }
  function closeResult() {
    overlayOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  finishBtn.addEventListener('click', function () { if (!finishBtn.disabled) openResult(); });

  // 접시를 모두 비우고 냉장고로 되돌림
  function resetMeal() {
    Object.keys(foodMap).forEach(function (id) {
      var F = foodMap[id]; F.plate = -1; sendHome(F);
    });
    plates = [[], [], []];
    shelfList = [];
    $$('.info-slot', infoShelf).forEach(function (s) { s.remove(); });
    updateFinish();
  }

  // 식사 다시 하기 : 팝업을 닫고 씬 4 를 처음 상태로
  $('#retryBtn').addEventListener('click', function () {
    closeResult();
    setTimeout(resetMeal, 350);
  });

  // 처음으로 : 장면 4개 길이만큼만 깔끔하게 올라가고, 값의 초기화는 화면 밖에서 처리
  var rewinding = false;
  $('#restartBtn').addEventListener('click', function () {
    if (rewinding) return;
    rewinding = true;
    closeResult();
    setTimeout(function () {
      // 1) 안 보이는 곳(씬 1~3)을 먼저 처음 상태로 되돌림
      calc = { gender: null, age: null, weight: null };
      goal = null;
      $$('.pill').forEach(function (x) { x.classList.remove('is-selected'); });
      $$('#weightList li').forEach(function (x) { x.classList.remove('is-selected'); });
      $('#weightValue').textContent = '';
      $('#calcResult').classList.remove('is-done', 'is-recalc');
      scene3.classList.remove('is-done');
      setStoryStep(0);
      // 2) 스크롤 구간을 접어서 씬 4개가 딱 4화면 길이가 되게 함 (현재 보이는 화면은 그대로)
      document.body.classList.add('is-rewinding');
      void document.body.offsetHeight;
      window.scrollTo(0, Math.round(pageTop(scene4)));
      // 3) 4화면만큼 위로 부드럽게 올라감
      animateScroll(0, 1700, function () {
        document.body.classList.remove('is-rewinding');
        window.scrollTo(0, 0);
        resetMeal();
        scene4.hidden = true;
        rewinding = false;
        onScroll();
      });
    }, 350);
  });


  /* =======================================================
     스크롤 : 한 번에 한 장면씩, 장면 사이에 걸치지 않게 멈춤
     ======================================================= */
  var overlayOpen = false;
  var animating = false, lockUntil = 0, lastStepT = 0, scrollRAF = 0;
  var STEP_LOCK = 900;                     // 한 장면에 최소한 머무는 시간(ms)

  function pageTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  function locked() { return animating || performance.now() < lockUntil; }

  // 멈출 수 있는 위치 목록 (sticky 장면의 단계 + 씬 3 + 씬 4)
  function snapPoints() {
    var stepPx = window.innerHeight * 0.55, pts = [], k;
    var t1 = pageTop(storySection), t2 = pageTop(scene2);
    for (k = 0; k < STORY_STEPS; k++) pts.push({ y: Math.round(t1 + k * stepPx), sec: 's1' });
    for (k = 0; k < S2_STEPS; k++)    pts.push({ y: Math.round(t2 + k * stepPx), sec: 's2' });
    pts.push({ y: Math.round(pageTop(scene3)), sec: 's3' });
    if (!scene4.hidden) pts.push({ y: Math.round(pageTop(scene4)), sec: 's4' });
    return pts;
  }
  function nearestIndex(pts) {
    var y = window.pageYOffset, best = 0, d = Infinity;
    pts.forEach(function (p, i) { var dd = Math.abs(p.y - y); if (dd < d) { d = dd; best = i; } });
    return best;
  }
  function animateScroll(to, dur, done) {
    cancelAnimationFrame(scrollRAF);
    var from = window.pageYOffset, t0 = performance.now();
    animating = true;
    (function frame(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, from + (to - from) * e);
      if (k < 1) scrollRAF = requestAnimationFrame(frame);
      else { animating = false; lockUntil = performance.now() + 250; if (done) done(); }
    })(t0);
  }
  function goToSection(el, dur) { animateScroll(Math.round(pageTop(el)), dur || 1100); }
  function jumpToStep(section, k) {
    window.scrollTo(0, Math.round(pageTop(section) + k * window.innerHeight * 0.55));
    lockUntil = performance.now() + 500;
  }
  function stepNav(dir) {
    var pts = snapPoints(), cur = nearestIndex(pts), nxt = clamp(cur + dir, 0, pts.length - 1);
    if (nxt === cur) return;
    lastStepT = performance.now();
    if (pts[cur].sec === pts[nxt].sec) {     // 같은 sticky 장면 안 : 화면은 그대로, 내용만 바뀜
      window.scrollTo(0, pts[nxt].y);
      lockUntil = lastStepT + STEP_LOCK;
    } else {                                 // 씬과 씬 사이 : 페이지 전체가 한 번에 부드럽게 넘어감
      animateScroll(pts[nxt].y, 1100);
    }
  }
  function settleSnap() {                    // 스크롤바 등으로 중간에 멈췄을 때 가장 가까운 장면으로
    if (animating || overlayOpen) return;
    var pts = snapPoints(), p = pts[nearestIndex(pts)];
    if (Math.abs(window.pageYOffset - p.y) > 3) animateScroll(p.y, 600);
  }

  var lastWheelT = 0, lastWheelAbs = 0;
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;                                  // 확대/축소는 그대로
    if (e.target.closest && e.target.closest('.weight-select__list')) return;   // 체중 목록은 자체 스크롤
    e.preventDefault();
    if (overlayOpen) return;
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    var abs = Math.abs(dy), now = performance.now();
    var gap = now - lastWheelT, prevAbs = lastWheelAbs;
    lastWheelT = now; lastWheelAbs = abs;
    if (abs < 4 || locked()) return;
    // 새 스크롤 동작일 때만 한 장면 이동 (트랙패드 관성 스크롤은 무시)
    if (gap > 140 || abs > prevAbs * 1.6 || now - lastStepT > 1500) stepNav(dy > 0 ? 1 : -1);
  }, { passive: false });

  var touchY = null;
  window.addEventListener('touchstart', function (e) {
    touchY = (e.target.closest && e.target.closest('.food')) ? null : e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.target.closest && e.target.closest('.weight-select__list')) return;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    if (touchY === null) return;
    var dy = touchY - e.changedTouches[0].clientY; touchY = null;
    if (Math.abs(dy) > 45 && !overlayOpen && !locked()) stepNav(dy > 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (overlayOpen || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); if (!locked()) stepNav(1); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); if (!locked()) stepNav(-1); }
    else if (k === 'Home') { e.preventDefault(); if (!locked()) animateScroll(0, 1400); }
  });

  var settleTimer = 0;
  window.addEventListener('scroll', function () {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleSnap, 160);
  }, { passive: true });


  /* =======================================================
     스크롤 연결
     ======================================================= */
  var ticking = false;
  function onScroll() {
    ticking = false;
    if (rewinding) return;
    setStoryStep(stickyStep(storySection, STORY_STEPS));
    setStage2(stickyStep(scene2, S2_STEPS));
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // 새로고침해도 맨 위에서 시작
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
})();
