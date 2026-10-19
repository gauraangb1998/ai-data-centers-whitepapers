(function () {
  'use strict';

  var DATA = null, IDEAS = null, stage = 'all', onlyP2 = false;

  // The frameworks, as each paper states them. Part I's wording is its definition of
  // each layer; Part II's is what that layer looked like on retesting.
  var FRAMEWORKS = [
    {
      part: 'Part I', date: 'April 2026', shape: 'stack',
      head: '4 layers of flexibility',
      items: [
        {
          name: 'Flexible Compute',
          what: 'Shifting or slowing workloads to reduce demand during grid stress.',
          more: 'I argued that platforms selling this software would struggle, because hyperscalers would have built the same tools in-house. Part II showed me that was an overgeneralization.'
        },
        {
          name: 'Flexible Facilities',
          what: 'Deploying on-site utility scale batteries that allow a data center to island from the main grid during peak stress events.',
          more: 'Aligned and Calibrant had just announced a first-of-its-kind on-site battery project to unlock utility power for a data center, which is the template the layer rests on.'
        },
        {
          name: 'Facility Orchestration',
          what: 'Internally coordinating cooling systems, power backup, and computing workloads to maximize existing infrastructure.',
          more: 'The US grid runs at a load factor of only 40 to 60% on an average day, and data centers ask for power assuming every server runs flat out while the backup generator fails. Utilities permit that worst case, so headroom gets reserved that will almost never be used.'
        },
        {
          name: 'Flexible Offsets',
          what: 'Financing off site capacity by aggregating distributed energy resources across both residential networks and large commercial and industrial facilities.',
          more: 'Brian Janous, formerly Microsoft’s energy executive, calls the economics here the watt-bit spread. An AI data center can earn $10 to 12 million per megawatt a year, which makes paying for capacity somewhere else cheap next to waiting in a queue.'
        }
      ],
      foot: 'Ends with 4 white spaces'
    },
    {
      part: 'Part II', date: 'June 2026', shape: 'stack',
      head: 'The same 4 layers, retested, plus a 5th',
      items: [
        {
          name: 'Flexible Compute',
          what: 'Not all hyperscalers possess flexible compute capabilities.',
          more: 'Google built its workload shifting 5 years ago to meet its own carbon goals, and it owns both the data centers and the models that run in them. Up to 90% of Amazon’s operations run external customer workloads under uptime contracts, so curtailing them is a breach and there was never a reason to build it. Emerald AI is finding traction with neoclouds instead. Capping power for GPUs is another route.'
        },
        {
          name: 'Flexible Facilities',
          what: 'AI training micro-spikes originate at individual racks, making rack-level batteries a solution. For grid curtailment, a campus-wide battery suffices.',
          more: 'A campus battery cuts grid imports at the meter, verifiably, without touching anyone’s workloads. That asks a utility to trust a meter rather than a software promise. Both approaches are needed.'
        },
        {
          name: 'Facility Orchestration',
          what: 'Platforms like Hammerhead AI unlock stranded power capacity without new builds or grid upgrades.',
          more: 'Stranded capacity is the megawatts that already exist inside a data center but sit unusable because the site was provisioned for its peak. Orchestration software is also becoming the way into flexible compute, so the 2 layers are converging.'
        },
        {
          name: 'Flexible Offsets',
          what: 'Voltus is pioneering bring your own capacity models with virtual power plants, focused on commercial and industrial assets.',
          more: 'Resilience.energy is pursuing the same model through residential portfolios, and each approach has its tradeoffs. Pooling capacity this way still does not solve congestion on the local lines, which is the constraint that put the data center in a queue to begin with.'
        },
        {
          name: 'Community Approval',
          what: 'Social license to operate is fast becoming the most expensive constraint for data center developers, perhaps ahead of speed-to-power.',
          more: 'An institutional investor told me community buy-in is now the biggest priority for data centers. xAI’s Memphis supercomputer, which skipped the interconnection queue by running mobile gas generators, came up again and again as the cautionary tale. The counterweight is money: officials from Santa Clara said their 60 data centers provide $41 million a year, which funds 14% of the city general fund. Waste heat and community upgrades are the levers developers have.'
        }
      ],
      added: 'Community Approval',
      foot: 'Ends with 12 startup ideas'
    },
    {
      part: 'Part III', date: 'October 2026', shape: 'flow',
      head: '4 stages of a data center project',
      note: 'I was oversimplifying with the layers, so I sorted the ideas by project stage.',
      foot: 'Ends with 19 startup ideas'
    }
  ];

  var BANDS = [
    { key: 'top', label: 'My top picks' },
    { key: 'promising', label: 'Promising' },
    { key: 'conditional', label: 'Depends on something the founder cannot control' },
    { key: 'weak', label: 'Weak, or already served' }
  ];

  function $(s, r) { return (r || document).querySelector(s); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) {
      n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    });
    return n;
  }

  // A "[name](url)" pair in the data becomes a link; the rest stays plain text.
  function linkify(str) {
    var frag = document.createDocumentFragment();
    var re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
      frag.appendChild(el('a', { href: m[2], target: '_blank', rel: 'noopener', text: m[1] }));
      last = re.lastIndex;
    }
    if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
    return frag;
  }

  function renderFrameworks() {
    var grid = $('#framework-grid');
    grid.textContent = '';
    FRAMEWORKS.forEach(function (f) {
      var col = el('div', { class: 'fw' });
      col.appendChild(el('p', { class: 'fw-part', text: f.part }));
      col.appendChild(el('p', { class: 'fw-date', text: f.date }));
      col.appendChild(el('p', { class: 'fw-head', text: f.head }));
      if (f.shape === 'stack') {
        var stack = el('div', { class: 'fw-stack' });
        f.items.forEach(function (row) {
          var isNew = f.added === row.name;
          var d = el('details', { class: 'fw-item' + (isNew ? ' is-new' : '') });
          var sum = el('summary', {}, [el('span', { class: 'fw-name', text: row.name })]);
          if (isNew) sum.appendChild(el('span', { class: 'tag-new', text: 'added' }));
          d.appendChild(sum);
          d.appendChild(el('p', { class: 'fw-why', text: row.what }));
          if (row.more) d.appendChild(el('p', { class: 'fw-more', text: row.more }));
          stack.appendChild(d);
        });
        col.appendChild(stack);
      } else {
        var flow = el('div', { class: 'fw-flow' });
        IDEAS.stages.forEach(function (s, n) {
          var mine = IDEAS.ideas.filter(function (i) { return i.stage === s.num; });
          var d = el('details', { class: 'fw-item' });
          var sum = el('summary', {}, [
            el('span', { class: 'fw-step', text: String(n + 1) }),
            el('span', { class: 'fw-name', text: s.name }),
            el('span', { class: 'fw-count', text: mine.length + (mine.length === 1 ? ' idea' : ' ideas') })
          ]);
          d.appendChild(sum);
          if (s.message) d.appendChild(el('p', { class: 'fw-why', text: s.message }));
          var ul = el('ul', { class: 'fw-ideas' });
          mine.forEach(function (i) {
            var li = el('li', {});
            var a = el('button', { type: 'button', class: 'linkish', text: i.num + ' ' + i.name });
            a.addEventListener('click', function () { openIdea(i.num); });
            li.appendChild(a);
            ul.appendChild(li);
          });
          d.appendChild(ul);
          flow.appendChild(d);
        });
        col.appendChild(flow);
        if (f.note) col.appendChild(el('p', { class: 'fw-note', text: f.note }));
      }
      col.appendChild(el('p', { class: 'fw-foot', text: f.foot }));
      grid.appendChild(col);
    });
  }

  function openIdea(num) {
    if (window.__showTab) window.__showTab('ideas');
    stage = 'all';
    onlyP2 = false;
    var cb = $('#only-p2');
    if (cb) cb.checked = false;
    renderStageTabs();
    renderBoard();
    var d = document.getElementById('idea-' + num);
    if (!d) return;
    d.open = true;
    var motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.scrollIntoView({ behavior: motion ? 'auto' : 'smooth', block: 'center' });
    var s = $('summary', d);
    if (s) s.focus({ preventScroll: true });
  }

  function renderStageTabs() {
    var tabs = $('#stage-tabs');
    tabs.textContent = '';
    var all = [{ num: 'all', name: 'All stages' }].concat(IDEAS.stages.map(function (s) {
      return { num: s.num, name: s.name };
    }));
    all.forEach(function (s) {
      var b = el('button', { type: 'button', 'aria-pressed': String(s.num === stage), text: s.name });
      b.addEventListener('click', function () { stage = s.num; renderStageTabs(); renderBoard(); });
      tabs.appendChild(b);
    });
  }

  function ideaCard(i) {
    var d = el('details', { class: 'idea band-' + i.band, id: 'idea-' + i.num });
    var sum = el('summary', { tabindex: '0' });
    var head = el('div', { class: 'idea-head' }, [
      el('span', { class: 'num', text: i.num }),
      el('span', { class: 'name', text: i.name })
    ]);
    if (i.from_part2) head.appendChild(el('span', { class: 'tag-p2', text: 'from Part II' }));
    sum.appendChild(head);
    sum.appendChild(el('p', { class: 'verdict', text: i.view }));
    d.appendChild(sum);

    var body = el('div', { class: 'idea-body' });
    var dl = el('dl');
    [['Problem', i.problem], ['What it does', i.does], ['What could kill it', i.kill]].forEach(function (r) {
      if (!r[1]) return;
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', { text: r[1] }));
    });
    if (i.companies) {
      dl.appendChild(el('dt', { text: 'Existing companies' }));
      dl.appendChild(el('dd', {}, [linkify(i.companies)]));
    }
    body.appendChild(dl);
    body.appendChild(el('p', {}, [
      el('a', { class: 'open', href: i.url, target: '_blank', rel: 'noopener',
                text: 'Read Section ' + i.num + ' in Part III →' })
    ]));
    d.appendChild(body);
    return d;
  }

  function renderBoard() {
    var board = $('#board');
    board.textContent = '';
    var list = IDEAS.ideas.filter(function (i) {
      return (stage === 'all' || i.stage === stage) && (!onlyP2 || i.from_part2);
    });
    if (!list.length) {
      board.appendChild(el('p', { class: 'hint', text: 'No ideas match that filter.' }));
      return;
    }
    BANDS.forEach(function (b) {
      var inBand = list.filter(function (i) { return i.band === b.key; });
      if (!inBand.length) return;
      var sec = el('section', { class: 'band band-' + b.key });
      sec.appendChild(el('h3', {}, [
        el('span', { class: 'band-dot' }),
        b.label,
        el('span', { class: 'band-count', text: String(inBand.length) })
      ]));
      var items = el('div', { class: 'band-items' });
      inBand.forEach(function (i) { items.appendChild(ideaCard(i)); });
      sec.appendChild(items);
      board.appendChild(sec);
    });
  }

  function renderContents() {
    document.querySelectorAll('.toc').forEach(function (t) {
      var paper = Number(t.getAttribute('data-paper')), ol = $('ol', t);
      DATA.sections.filter(function (s) { return s.paper === paper && s.level <= 2; })
        .forEach(function (s) {
          var a = el('a', { href: s.url, target: '_blank', rel: 'noopener',
                            text: ((s.num ? s.num + ' ' : '') + s.title).trim() });
          ol.appendChild(el('li', { class: s.level === 1 ? 'l1' : 'l2' }, [a]));
        });
    });
  }

  /* ------------------------------------------------ tabs */

  function setupTabs() {
    var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function show(key, focus) {
      tabs.forEach(function (t) {
        var on = t.id === 'tab-' + key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById('panel-' + t.id.slice(4));
        if (panel) panel.hidden = !on;
        if (on && focus) t.focus();
      });
      if (history.replaceState) {
        history.replaceState(null, '', '#' + key);
      }
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t.id.slice(4)); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) {
          e.preventDefault();
          show(tabs[(i + d + tabs.length) % tabs.length].id.slice(4), true);
        } else if (e.key === 'Home') {
          e.preventDefault(); show(tabs[0].id.slice(4), true);
        } else if (e.key === 'End') {
          e.preventDefault(); show(tabs[tabs.length - 1].id.slice(4), true);
        }
      });
    });

    var fromHash = (location.hash || '').slice(1);
    if (fromHash && document.getElementById('tab-' + fromHash)) show(fromHash);
    window.__showTab = show;
  }

  function load(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([load('data/sections.json'), load('data/ideas.json')]).then(function (res) {
    DATA = res[0];
    IDEAS = res[1];
    renderFrameworks();
    renderStageTabs();
    renderBoard();
    renderContents();
    setupTabs();
    var cb = $('#only-p2');
    cb.addEventListener('change', function () { onlyP2 = cb.checked; renderBoard(); });
    window.__ready = true;
  }).catch(function (e) {
    var g = $('#framework-grid');
    if (g) g.appendChild(el('p', { class: 'hint', text: 'Could not load the data. Reload the page to try again.' }));
    console.error(e);
  });
}());
