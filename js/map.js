/* Draws the 10 cities as dots on a simple outline of the lower 48 states. No map tiles, no network. */
(function () {
  'use strict';
  var host = document.getElementById('map');
  if (!host) return;

  // [lon, lat], clockwise from the northwest corner. Simplified; the Great Lakes are drawn as land.
  var OUTLINE = [
    [-124.7, 48.4], [-123.3, 49.0], [-95.2, 49.0], [-94.6, 48.7], [-93.4, 48.6], [-92.0, 48.3], [-90.8, 48.1],
    [-89.6, 48.0], [-92.1, 46.8], [-90.8, 46.9], [-88.0, 47.4], [-87.4, 46.5], [-85.0, 46.75], [-84.4, 46.5],
    [-84.7, 45.9], [-83.4, 45.1], [-82.9, 44.05], [-82.45, 43.0], [-83.1, 42.2], [-83.4, 41.7], [-81.7, 41.5],
    [-79.0, 42.85], [-79.05, 43.25], [-77.5, 43.3], [-76.2, 43.55], [-76.3, 44.1], [-75.0, 44.95], [-71.5, 45.0],
    [-70.9, 45.3], [-70.0, 46.7], [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.05], [-67.8, 45.7], [-67.0, 44.8],
    [-68.5, 44.3], [-70.2, 43.6], [-70.7, 42.9], [-70.8, 42.4], [-70.0, 41.8], [-71.5, 41.4], [-73.7, 40.9],
    [-74.0, 40.5], [-74.1, 39.8], [-74.9, 38.9], [-75.1, 38.4], [-75.9, 37.1], [-75.5, 35.3], [-77.0, 34.5],
    [-78.0, 33.9], [-79.2, 33.2], [-80.9, 32.0], [-81.3, 30.6], [-80.5, 28.5], [-80.1, 26.8], [-80.4, 25.2],
    [-81.1, 25.1], [-81.8, 26.1], [-82.7, 27.7], [-82.8, 29.1], [-84.0, 30.1], [-85.3, 29.7], [-86.5, 30.4],
    [-88.0, 30.3], [-89.4, 30.2], [-89.2, 29.1], [-90.5, 29.1], [-92.0, 29.6], [-93.8, 29.7], [-94.8, 29.3],
    [-96.5, 28.3], [-97.4, 27.3], [-97.2, 25.95], [-99.1, 26.4], [-99.5, 27.5], [-100.5, 28.7], [-101.4, 29.8],
    [-102.4, 29.8], [-103.1, 29.0], [-104.5, 29.6], [-104.7, 30.2], [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.3],
    [-111.1, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-117.3, 33.1], [-118.5, 34.0], [-119.5, 34.4], [-120.6, 34.5],
    [-121.9, 36.6], [-122.5, 37.8], [-123.7, 38.9], [-124.3, 40.4], [-124.2, 41.9], [-124.5, 42.8], [-124.0, 44.6],
    [-123.9, 46.2], [-124.1, 47.0]
  ];

  // label offsets chosen so the close pairs (Seattle/Portland, Austin/Houston, NYC/Boston) do not overlap
  var CITIES = [
    { n: 'Vancouver', lon: -123.12, lat: 49.28, dx: 9, dy: -5 },
    { n: 'Seattle', lon: -122.33, lat: 47.61, dx: 10, dy: 3 },
    { n: 'Portland', lon: -122.68, lat: 45.52, dx: 10, dy: 10 },
    { n: 'San Francisco', lon: -122.42, lat: 37.77, dx: 9, dy: 4 },
    { n: 'Los Angeles', lon: -118.24, lat: 34.05, dx: 9, dy: 4 },
    { n: 'Austin', lon: -97.74, lat: 30.27, dx: -9, dy: 4, end: true },
    { n: 'Houston', lon: -95.37, lat: 29.76, dx: 9, dy: 14 },
    { n: 'Chicago', lon: -87.63, lat: 41.88, dx: -9, dy: -6, end: true },
    { n: 'New York City', lon: -74.01, lat: 40.71, dx: 9, dy: 12 },
    { n: 'Boston', lon: -71.06, lat: 42.36, dx: 9, dy: -6 }
  ];

  var LON0 = -127, LAT1 = 51, KY = 11, KX = KY * Math.cos(38 * Math.PI / 180);
  function X(lon) { return (lon - LON0) * KX; }
  function Y(lat) { return (LAT1 - lat) * KY; }
  var W = Math.ceil(X(-64)), H = Math.ceil(Y(24));

  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Map of the 10 cities visited: ' + CITIES.map(function (c) { return c.n; }).join(', ') });
  svg.appendChild(s('path', {
    d: 'M' + OUTLINE.map(function (p) { return X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('L') + 'Z',
    class: 'land'
  }));
  CITIES.forEach(function (c) {
    var x = X(c.lon), y = Y(c.lat);
    svg.appendChild(s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.6, class: 'dot' }));
    svg.appendChild(s('text', { x: (x + c.dx).toFixed(1), y: (y + c.dy).toFixed(1), class: 'city', 'text-anchor': c.end ? 'end' : 'start' }, c.n));
  });
  host.appendChild(svg);
})();
