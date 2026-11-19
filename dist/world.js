/* Original, code-drawn pixel scenery. No external artwork or canvas libraries. */
(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1;
  let height = 1;
  let mode = 'krillion';
  let status = 'ready';
  let progress = 0;
  let targetProgress = 0;
  let mascotX = .5;
  let mascotY = .38;
  let lastFrame = 0;

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const mix = (a, b, t) => a + (b - a) * clamp(t);
  function channels(value) {
    if (value.startsWith('#')) return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
    return value.slice(value.indexOf('(') + 1, value.indexOf(')')).split(',').slice(0, 3).map(Number);
  }
  function color(a, b, t) {
    const x = channels(a), y = channels(b);
    return `rgb(${x.map((n, i) => Math.round(mix(n, y[i], t))).join(',')})`;
  }
  function rect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function polygon(points, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
    ctx.closePath();
    ctx.fill();
  }
  function ellipse(x, y, rx, ry, fill) {
    for (let row = -Math.ceil(ry); row <= ry; row++) {
      const span = rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry)));
      rect(x - span, y + row, span * 2 + 1, 1, fill);
    }
  }
  function ring(x, y, radius, fill) {
    for (let row = -radius; row <= radius; row++) {
      const outer = Math.round(Math.sqrt(Math.max(0, radius * radius - row * row)));
      const inner = Math.round(Math.sqrt(Math.max(0, (radius - 1) ** 2 - row * row)));
      rect(x - outer, y + row, Math.max(1, outer - inner), 1, fill);
      rect(x + inner, y + row, Math.max(1, outer - inner), 1, fill);
    }
  }
  function line(x0, y0, x1, y1, fill) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      rect(x0, y0, 1, 1, fill);
      if (x0 === x1 && y0 === y1) break;
      const e = 2 * error;
      if (e >= dy) { error += dy; x0 += sx; }
      if (e <= dx) { error += dx; y0 += sy; }
    }
  }
  function gradient(top, bottom) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, top); sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }
  const random = n => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function cloud(x, y, size = 1, fill = '#e7f6ef') {
    rect(x, y, 35 * size, 6 * size, fill);
    rect(x + 6 * size, y - 7 * size, 22 * size, 10 * size, fill);
    rect(x + 13 * size, y - 12 * size, 12 * size, 8 * size, fill);
    rect(x - 5 * size, y + 3 * size, 45 * size, 3 * size, fill);
  }
  function pine(x, y, size, palette = ['#174f42', '#21654c', '#347d55']) {
    rect(x - size, y - 13 * size, 2 * size, 16 * size, '#5a5841');
    polygon([[x, y - 39 * size], [x - 11 * size, y - 21 * size], [x - 7 * size, y - 21 * size], [x - 16 * size, y - 8 * size], [x - 10 * size, y - 8 * size], [x - 19 * size, y], [x + 18 * size, y], [x + 9 * size, y - 8 * size], [x + 15 * size, y - 8 * size], [x + 6 * size, y - 21 * size], [x + 10 * size, y - 21 * size]], palette[0]);
    polygon([[x - size, y - 36 * size], [x - 9 * size, y - 22 * size], [x - 5 * size, y - 22 * size], [x - 12 * size, y - 10 * size], [x - 7 * size, y - 10 * size], [x - 16 * size, y - 2 * size], [x - 2 * size, y - 2 * size]], palette[1]);
    rect(x - 7 * size, y - 23 * size, 3 * size, 2 * size, palette[2]);
    rect(x - 11 * size, y - 11 * size, 4 * size, 2 * size, palette[2]);
  }
  function mountain(x, y, size, fill, snow = '#eaf1d7') {
    polygon([[x - size, y], [x - size * .65, y - size * .4], [x - size * .24, y - size * .78], [x, y - size * 1.1], [x + size * .2, y - size * .84], [x + size * .55, y - size * .5], [x + size, y]], fill);
    polygon([[x - size * .24, y - size * .78], [x, y - size * 1.1], [x + size * .2, y - size * .84], [x + size * .33, y - size * .69], [x + size * .11, y - size * .74], [x + size * .05, y - size * .64], [x - size * .04, y - size * .8], [x - size * .16, y - size * .74]], snow);
  }
  function fish(x, y, fill, left = false, scale = 1) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(left ? -scale : scale, scale);
    rect(-4, -2, 8, 4, fill); rect(-2, -3, 4, 1, fill);
    polygon([[-4, 0], [-8, -4], [-8, 4]], fill);
    rect(2, -1, 1, 1, '#d4e8ce');
    ctx.restore();
  }
  function seaweed(x, y, size, time, fill) {
    for (let branch = 0; branch < 4; branch++) {
      const length = 15 + branch * 4;
      const stemX = x + (branch - 1.5) * 4 * size;
      for (let j = 0; j < length; j += 2) {
        const bend = Math.sin(j * .24 + time * .6 + branch) * 2.5 * size;
        rect(stemX + bend, y - j * size, 2 * size, 3 * size, fill);
        if (j % 6 === 0) rect(stemX + bend + (branch % 2 ? 1 : -3) * size, y - j * size, 4 * size, 2 * size, fill);
      }
    }
  }
  function coral(x, y, size, fill) {
    rect(x, y - 14 * size, 3 * size, 14 * size, fill);
    rect(x - 6 * size, y - 11 * size, 7 * size, 3 * size, fill);
    rect(x - 7 * size, y - 19 * size, 3 * size, 10 * size, fill);
    rect(x + 2 * size, y - 8 * size, 8 * size, 3 * size, fill);
    rect(x + 8 * size, y - 17 * size, 3 * size, 12 * size, fill);
    rect(x - 11 * size, y - 20 * size, 7 * size, 2 * size, fill);
    rect(x + 7 * size, y - 22 * size, 3 * size, 7 * size, fill);
  }
  function ledge(x, y, side, size, fill, highlight) {
    const edge = side === 'left' ? x + size : x - size;
    polygon(side === 'left' ? [[0, y - 17], [x + size * .5, y - 17], [x + size * .5, y - 11], [edge, y - 11], [edge, y], [edge - 8, y], [edge - 8, y + 9], [edge - 22, y + 9], [edge - 22, y + 25], [0, y + 42]] : [[width, y - 17], [x - size * .5, y - 17], [x - size * .5, y - 11], [edge, y - 11], [edge, y], [edge + 9, y], [edge + 9, y + 10], [edge + 24, y + 10], [edge + 24, y + 25], [width, y + 42]], fill);
    rect(side === 'left' ? 0 : edge, y - 12, side === 'left' ? edge : width - edge, 3, highlight);
    return edge;
  }
  function jelly(x, y, size, time, fill = '#8dc9db') {
    ellipse(x, y, 7 * size, 5 * size, fill);
    rect(x - 8 * size, y, 16 * size, 3 * size, fill);
    rect(x - 5 * size, y - 3 * size, 3 * size, size, '#d4f2e6');
    for (let leg = 0; leg < 4; leg++) {
      const root = x + (leg - 1.5) * 3 * size;
      for (let j = 2; j < 13; j++) rect(root + Math.sin(time * .9 + j * .45 + leg) * size, y + j * size, size, size, leg % 2 ? '#598fae' : '#85b8c8');
    }
  }

  function fern(x, y, size, flip = 1) {
    const stem = '#80af5d';
    for (let frond = 0; frond < 5; frond++) {
      const angle = -.9 + frond * .45;
      const length = (13 + (2 - Math.abs(2 - frond)) * 4) * size;
      const dx = Math.sin(angle) * length * flip;
      const dy = -Math.cos(angle) * length;
      line(x, y, x + dx, y + dy, stem);
      for (let leaf = 2; leaf < 9; leaf++) {
        const t = leaf / 10;
        const px = x + dx * t, py = y + dy * t;
        const span = (1 - t) * 5 * size;
        line(px, py, px - span, py - size * 2, leaf % 2 ? '#5c964d' : '#a6c766');
        line(px, py, px + span, py - size * 2, leaf % 2 ? '#74a858' : '#8fba5c');
      }
    }
  }

  function forest(shift, time, bankY) {
    const top = height * -.45 + shift;
    if (top > height + 60) return;
    // Three depth layers keep the glade airy while framing it in tall trees.
    const palettes = [
      ['#78aaa0', '#92b5a0', '#98c3a7'],
      ['#738571', '#98a27b', '#5d8266'],
      ['#4a5c49', '#778165', '#9aaa71']
    ];
    for (let layer = 0; layer < 3; layer++) {
      const count = layer === 0 ? 17 : layer === 1 ? 10 : 5;
      for (let i = 0; i < count; i++) {
        const seed = layer * 100 + i;
        let x = (i + .25 + random(seed + 18) * .6) / count * width;
        // The nearest trees leave a generous central flight corridor.
        if (layer === 2 && x > width * .31 && x < width * .68) x += width * .28;
        const trunk = (layer === 0 ? 3 : layer === 1 ? 7 : 13) + random(seed + 81) * (layer + 2);
        const treeTop = top - random(seed + 49) * height * .28;
        const base = bankY + (layer - 1) * 9;
        rect(x, treeTop, trunk, base - treeTop, palettes[layer][0]);
        rect(x + trunk * .18, treeTop, Math.max(1, trunk * .2), base - treeTop, palettes[layer][1]);
        rect(x + trunk * .77, treeTop, Math.max(1, trunk * .23), base - treeTop, layer === 2 ? '#394d3f' : '#668b78');
        for (let bark = 0; bark < 9; bark++) {
          const y = treeTop + random(seed * 19 + bark + 338) * (base - treeTop);
          rect(x + random(seed + bark + 174) * trunk, y, 1 + layer, 4 + random(bark + seed) * 13, palettes[layer][2]);
        }
        const branchY = treeTop + height * (.2 + random(seed + 44) * .4);
        const direction = i % 2 ? -1 : 1;
        const branchEnd = x + direction * (12 + layer * 5);
        polygon([[x, branchY], [branchEnd, branchY - 13], [branchEnd + direction * 5, branchY - 13], [x + trunk, branchY + 6]], palettes[layer][0]);
        if (layer < 2) {
          rect(branchEnd - 8, branchY - 17, 22, 5, '#5e9575');
          rect(branchEnd - 5, branchY - 20, 13, 4, '#80b087');
        }
        if (layer === 2) {
          polygon([[x - 8, base + 1], [x + 3, base - 13], [x + trunk - 2, base - 15], [x + trunk + 11, base + 4]], '#445e45');
          rect(x + 2, base - 29, 3, 18, '#6c8b50');
        }
      }
    }
    // Pixel canopy moves down with the trunks as the balloon clears the glade.
    for (let i = 0; i < 22; i++) {
      const x = (i / 21) * width;
      const y = top + height * .1 + random(i + 714) * 20;
      rect(x - 17, y, 39, 14, '#326e50');
      rect(x - 11, y - 7, 29, 10, '#4c8858');
      rect(x - 7, y - 10, 18, 5, '#77a665');
    }
    // Slanted shafts of warm light, with sparse drifting pollen.
    ctx.globalAlpha = .075;
    for (let i = 0; i < 4; i++) polygon([[width * (.14 + i * .22), top], [width * (.18 + i * .22), top], [width * (.41 + i * .22), bankY], [width * (.28 + i * .22), bankY]], '#faf0bd');
    ctx.globalAlpha = 1;
    for (let i = 0; i < 27; i++) {
      const y = top + height * (.2 + random(i + 385) * .84);
      const x = width * random(i + 662) + Math.sin(time * .2 + i) * 2;
      rect(x, y, i % 5 === 0 ? 2 : 1, 1, i % 2 ? '#d7deb37d' : '#e7ddb54d');
    }
  }

  function drawSky(time) {
    const night = clamp((progress - .48) / .52);
    const dayTop = color('#9fc5ac', '#83cddd', progress / .22);
    const dayBottom = color('#c5d7a7', '#d6ead8', progress / .22);
    gradient(color(dayTop, '#172243', night), color(dayBottom, '#584b73', night));
    if (night > 0) {
      ctx.globalAlpha = night;
      for (let i = 0; i < 85; i++) {
        const x = random(i + 42) * width;
        const y = random(i + 187) * height;
        const glow = i % 13 === 0;
        rect(x, y, glow ? 2 : 1, glow ? 2 : 1, i % 3 ? '#d3e6dc' : '#f1d6a4');
        if (glow) { rect(x - 2, y, 6, 1, '#b6c7d555'); rect(x, y - 2, 1, 6, '#b6c7d555'); }
      }
      ctx.globalAlpha = 1;
    }
    const sunY = height * .19 + progress * height * .24;
    ellipse(width * .81, sunY, 15, 15, night > .6 ? '#eee9c2' : '#f8edb4');
    if (night > .6) ellipse(width * .81 - 6, sunY - 5, 13, 13, color('#83cddd', '#172243', night));

    // Clouds pass below the passenger as the camera ascends.
    for (let i = 0; i < 15; i++) {
      const worldY = (random(i + 66) * 3.8 - 2.4) * height;
      const y = worldY + progress * height * 4.1;
      if (y < -25 || y > height + 20) continue;
      const x = (random(i + 99) * width + Math.sin(time * .035 + i) * 8);
      const fill = color(i % 2 ? '#c4e3df' : '#edf3db', '#6a6886', night);
      cloud(x, y, .8 + random(i + 70), fill);
    }
    const terrainShift = progress * height * 3.8;
    mountain(width * .28, height * .81 + terrainShift * .52, width * .25, '#82b7a7', '#e2e9cf');
    mountain(width * .66, height * .83 + terrainShift * .49, width * .23, '#6ca59a', '#e7edd3');
    mountain(width * .99, height * .91 + terrainShift * .5, width * .26, '#59988a', '#d9e7ca');
    const bankY = height * .68 + terrainShift;
    forest(terrainShift, time, bankY);
    if (bankY < height + 70) {
      polygon([[0, bankY - 8], [width * .12, bankY - 16], [width * .24, bankY - 5], [width * .35, bankY + 10], [width * .5, bankY + 19], [width, bankY + 6], [width, height + terrainShift], [0, height + terrainShift]], '#3d8164');
      polygon([[0, bankY + 27], [width * .22, bankY + 15], [width * .4, bankY + 29], [width * .7, bankY + 10], [width, bankY + 30], [width, height + terrainShift], [0, height + terrainShift]], '#286c54');
      polygon([[width * .09, height + terrainShift], [width * .22, bankY + 48], [width * .43, bankY + 2], [width * .48, bankY + 3], [width * .31, bankY + 61], [width * .23, height + terrainShift]], '#8b8b61');
      polygon([[width * .12, height + terrainShift], [width * .25, bankY + 50], [width * .44, bankY + 4], [width * .46, bankY + 4], [width * .29, bankY + 60], [width * .2, height + terrainShift]], '#b1a47a');
      ellipse(width * .72, bankY + 37, width * .24, height * .105, '#265e59');
      ellipse(width * .72, bankY + 33, width * .23, height * .09, '#4e9eaa');
      for (let i = 0; i < 26; i++) rect(width * (.52 + random(i + 82) * .37), bankY + 15 + random(i + 35) * 39, 3 + random(i) * 8, 1, i % 2 ? '#b3ded080' : '#2d7f9390');
      for (let i = 0; i < 4; i++) {
        const x = width * (.58 + random(i + 546) * .28);
        const y = bankY + 22 + random(i + 753) * 22;
        ellipse(x, y, 5, 2, '#709d58');
        rect(x - 1, y - 1, 4, 1, '#b4c77a');
      }
      // Low shrubs and ferns make the floor feel alive around the pond.
      for (let i = 0; i < 30; i++) {
        const x = (i + .5) / 30 * width;
        const y = bankY - 4 + random(i + 412) * 9;
        rect(x - 6, y, 13, 5, '#2d6b4b');
        rect(x - 4, y - 4, 9, 5, '#4d8853');
        rect(x - 2, y - 6, 4, 3, '#73a25d');
      }
      fern(width * .06, bankY + 69, 1.3);
      fern(width * .17, bankY + 41, .85, -1);
      fern(width * .95, bankY + 75, 1.4, -1);
      fern(width * .88, bankY + 30, .8);
      for (let i = 0; i < 14; i++) {
        const x = random(i + 162) * width;
        const y = bankY + 5 + random(i + 741) * 44;
        if (x > width * .43 && x < width * .92) continue;
        pine(x, y, .65 + random(i + 272) * .75);
      }
      for (let i = 0; i < 18; i++) {
        const x = random(i + 381) * width;
        const y = bankY + 62 + random(i + 88) * 45;
        rect(x, y, 1, 3, '#79ae6c');
        if (i % 3 === 0) { rect(x - 1, y - 1, 3, 1, '#f6cb9c'); rect(x, y - 2, 1, 3, '#f6cb9c'); }
      }
    }
    // The last stretch has broad, quiet bands of aurora and a distant planet.
    if (progress > .8) {
      ctx.globalAlpha = (progress - .8) * 2;
      for (let i = 0; i < 6; i++) {
        const y = height * (.14 + i * .015);
        polygon([[width * .1, y + 17], [width * .3, y], [width * .56, y + 10], [width * .8, y - 7], [width, y + 6], [width, y + 10], [width * .8, y - 2], [width * .56, y + 15], [width * .3, y + 5], [width * .1, y + 22]], i % 2 ? '#81cab0' : '#84a0cc');
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawOcean(time) {
    const deep = clamp(progress * 1.4);
    gradient(color('#3f9aa5', '#06172c', deep), color('#1a6d80', '#0a2238', deep));
    const sceneShift = progress * height * 5.1;
    const surface = height * (status === 'ready' && innerWidth >= 700 ? .43 : .22) - sceneShift;
    if (surface > -10) {
      rect(0, 0, width, surface, '#a5d7d9');
      rect(0, surface - 27, width, 27, '#91cbcd');
      ellipse(width * .78, height * .13 - sceneShift * .3, 13, 13, '#f2e6b4');
      cloud(width * .61, height * .11 - sceneShift * .4, .9, '#d7ece0');
      cloud(width * .15, height * .19 - sceneShift * .4, .65, '#cce7df');
      polygon([[width * .59, surface], [width * .67, surface - 8], [width * .69, surface - 8], [width * .73, surface - 17], [width * .78, surface - 12], [width * .81, surface - 5], [width * .89, surface]], '#477d70');
      polygon([[width * .65, surface], [width * .73, surface - 13], [width * .76, surface - 13], [width * .84, surface]], '#65977b');
      rect(0, surface, width, 3, '#c7e8d9');
      for (let i = 0; i < 18; i++) rect((i * 37 + time * 2) % width, surface + 5 + i % 3 * 5, 13 + i % 4 * 3, 1, '#7dc9c1');
    }
    if (progress < .3) {
      ctx.globalAlpha = (1 - progress / .3) * .07;
      for (let i = 0; i < 5; i++) polygon([[width * (.22 + i * .18), surface + 3], [width * (.27 + i * .18), surface + 3], [width * (.51 + i * .18), height], [width * (.34 + i * .18), height]], '#c6f7d5');
      ctx.globalAlpha = 1;
    }

    // Reef shelves are positioned in the world, then pass upward on descent.
    for (let shelf = 0; shelf < 11; shelf++) {
      const y = height * (.91 + shelf * .51) - sceneShift;
      if (y < -70 || y > height + 85) continue;
      const side = shelf % 2 === 0 ? 'right' : 'left';
      const size = width * (.16 + random(shelf + 24) * .12);
      const edge = ledge(side === 'left' ? 0 : width, y, side, size, color('#24616a', '#0e3042', deep), color('#388177', '#235361', deep));
      const plantX = edge + (side === 'left' ? -15 : 17);
      seaweed(plantX, y - 11, .7 + random(shelf + 1) * .55, time, color('#4b9f87', '#2c6c6c', deep));
      coral(plantX + (side === 'left' ? -23 : 25), y - 11, .7, shelf > 5 ? '#667ca2' : '#bd8a80');
      for (let i = 0; i < 4; i++) rect(edge + (side === 'left' ? -1 : 1) * (12 + i * 8), y + 4 + i % 2 * 8, 3, 2, '#72a9a038');
    }

    for (let i = 0; i < 49; i++) {
      const x = random(i + 109) * width;
      const y = height * (.48 + random(i + 174) * 5.7) - sceneShift;
      if (y < -10 || y > height + 10 || y < surface + 8) continue;
      const drift = motion.matches ? 0 : Math.sin(time * .19 + i) * 7;
      if (i % 9 === 0 && progress > .2) jelly(x + drift, y, .65, time + i, i % 2 ? '#9a95ba' : '#83bec1');
      else fish(x + drift, y, color(i % 2 ? '#5ca49d' : '#c9bb8c', '#477083', deep), i % 2 === 0, .65 + random(i) * .5);
    }
    for (let i = 0; i < 65; i++) {
      const x = random(i + 261) * width;
      const y = (random(i + 234) * height - sceneShift * .3 + height * 10) % height;
      if (y < surface + 8) continue;
      rect(x, y, 1, i % 6 === 0 ? 2 : 1, i % 4 ? '#91c4b51c' : '#b7e6cf45');
    }
    if (progress > .82) {
      const bottom = height * 6.08 - sceneShift;
      polygon([[0, bottom - 17], [width * .13, bottom - 27], [width * .21, bottom - 12], [width * .28, bottom - 12], [width * .31, bottom + 5], [width * .42, bottom + 13], [width * .54, bottom + 6], [width * .62, bottom + 9], [width * .71, bottom - 16], [width * .88, bottom - 31], [width, bottom - 23], [width, height + 50], [0, height + 50]], '#071b2b');
      for (let i = 0; i < 7; i++) coral(width * (.1 + i * .13), bottom - 10 + i % 2 * 10, .6, i % 2 ? '#477d82' : '#6d729c');
    }
  }

  function krill(x, y, time, diving) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const size = width < 220 ? .6 : .7;
    ctx.scale(size, size);
    if (!diving) {
      const balloonColors = [['#db747b', '#efa29a'], ['#e6be65', '#f5db91'], ['#65aebd', '#9ad2cd']];
      const balloons = [[-15, -43, 9, 12], [0, -55, 11, 14], [16, -42, 9, 12]];
      balloons.forEach(([bx, by, rx, ry], i) => {
        const sway = motion.matches ? 0 : Math.sin(time * .7 + i) * 1.5;
        line(bx + sway, by + ry, i - 1, -3, '#5b666a');
        ellipse(bx + sway, by, rx, ry, balloonColors[i][0]);
        rect(bx - 4 + sway, by - 7, 3, 5, balloonColors[i][1]);
        rect(bx - 1 + sway, by + ry, 3, 3, balloonColors[i][0]);
      });
    } else {
      ellipse(2, -1, 20, 17, '#bce7d21a');
      ring(2, -1, 19, '#a9ded1');
      rect(-9, -13, 4, 2, '#e8f5dc');
      rect(-12, -10, 2, 4, '#c6efdc');
      rect(-3, 17, 13, 3, '#cfb06e');
      for (let i = 0; i < 3; i++) {
        const bubbleY = -25 - i * 13 - (motion.matches ? 0 : (time * 5) % 13);
        ring(-8 + i % 2 * 8, bubbleY, i % 2 ? 2 : 3, '#a2cfc0');
      }
    }
    // A little coral-pink shrimp with a pale belly, tail, feelers and feet.
    rect(-11, -4, 19, 8, '#d87d86');
    rect(-6, -7, 17, 4, '#e99a9d');
    rect(6, -6, 10, 9, '#efa4a0');
    rect(-8, 3, 18, 3, '#e6a79f');
    rect(-12, -2, 4, 4, '#bf677b');
    rect(-17, -5, 5, 4, '#e59399');
    rect(-17, 2, 5, 4, '#cd7b8b');
    rect(-21, -7, 4, 3, '#edafb0');
    rect(-21, 5, 4, 3, '#edafb0');
    rect(12, -5, 3, 3, '#263f4b');
    rect(14, -5, 1, 1, '#fff4dc');
    rect(-7, -4, 2, 6, '#bf7080');
    rect(-1, -5, 2, 7, '#bf7080');
    for (let i = 0; i < 5; i++) {
      const step = motion.matches ? 0 : Math.sin(time * 2 + i) > 0 ? 1 : 0;
      rect(-7 + i * 4, 6, 1, 4 + step, '#e6a79f');
      rect(-9 + i * 4, 9 + step, 3, 1, '#e6a79f');
    }
    line(14, -7, 20, -12, '#f2b9ae');
    line(20, -12, 25, -12, '#f2b9ae');
    line(15, -3, 23, -6, '#f2b9ae');
    ctx.restore();
  }

  function resize() {
    const scale = innerWidth < 650 ? 2.5 : 3;
    width = Math.ceil(innerWidth / scale);
    height = Math.ceil(innerHeight / scale);
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'pixelated';
  }
  function frame(timestamp) {
    requestAnimationFrame(frame);
    if (timestamp - lastFrame < (motion.matches ? 100 : 1000 / 30)) return;
    lastFrame = timestamp;
    progress = motion.matches ? targetProgress : mix(progress, targetProgress, .045);
    const resting = status === 'ready';
    const targetX = .5;
    const targetY = resting ? innerWidth < 700 ? .25 : .38 : mode === 'noillirk' ? .46 : .43;
    mascotX = motion.matches ? targetX : mix(mascotX, targetX, .07);
    mascotY = motion.matches ? targetY : mix(mascotY, targetY, .07);
    const time = motion.matches ? 0 : timestamp / 1000;
    if (mode === 'noillirk') drawSky(time); else drawOcean(time);
    const bob = motion.matches ? 0 : Math.sin(time * 1.4) * 2;
    krill(width * mascotX, height * mascotY + bob, time, mode === 'krillion');
    // Soft pixel vignette leaves room for the menu without dimming the world.
    const vignette = ctx.createLinearGradient(0, 0, width, 0);
    vignette.addColorStop(0, mode === 'krillion' ? '#031b2b44' : '#183e3c08');
    vignette.addColorStop(.55, 'transparent');
    vignette.addColorStop(1, '#071c3018');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }
  window.KrillionWorld = {
    setMode(value) { mode = value === 'noillirk' ? 'noillirk' : 'krillion'; },
    setProgress(score) { targetProgress = clamp(Number(score) / 700 || 0); },
    setState(value) { status = value || 'ready'; }
  };
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
