/* QuiltCalc - shared quilting math. Same conventions as QuiltCraft Pro:
   1/4" seam allowance, fractions to nearest 1/8", yardage rounded UP to 1/8 yd.
   Works in the browser (window.QC) and in Node (require). */
(function (root) {
  "use strict";
  var EPS = 1e-9;
  var EIGHTHS = { 0: "", 1: "1/8", 2: "1/4", 3: "3/8", 4: "1/2", 5: "5/8", 6: "3/4", 7: "7/8" };

  /* Inches -> text to nearest 1/8", e.g. 17.5 -> 17 1/2" */
  function frac(x) {
    if (!isFinite(x)) return "";
    var w = Math.floor(x + EPS), r = Math.round((x - w) * 8);
    if (r === 8) { w++; r = 0; }
    var m = EIGHTHS[r];
    return (w ? w : "") + (w && m ? " " : "") + (m || (!w ? "0" : "")) + '"';
  }
  /* Round inches UP to the next 1/8" */
  function up8(x) { return Math.ceil(x * 8 - EPS) / 8; }
  /* Inches of fabric -> yards rounded UP to 1/8 yd */
  function yd(inches) { return Math.ceil(inches / 36 * 8 - EPS) / 8; }
  function ydTxt(y) {
    var w = Math.floor(y + EPS), r = Math.round((y - w) * 8);
    if (r === 8) { w++; r = 0; }
    var m = EIGHTHS[r];
    return (w ? w + (m ? " " : "") : "") + (m || (w ? "" : "0")) + " yd";
  }
  /* Yards -> meters, rounded UP to 0.1 m (what you'd ask for at a metric shop) */
  function meters(y) { return Math.ceil(y * 0.9144 * 10 - EPS) / 10; }
  function mTxt(y) { return meters(y).toFixed(1) + " m"; }

  /* Parse quilter input: "2 1/2", "2-1/2", "7/8", "2.5", 2.5 */
  function parseIn(v) {
    if (typeof v === "number") return v;
    var s = String(v || "").replace(/["”″]|in(ches)?/gi, "").trim().replace(",", ".");
    if (!s) return NaN;
    var m = s.match(/^(\d+(?:\.\d+)?)?(?:[\s-]+)?(?:(\d+)\/(\d+))?$/);
    if (!m || (!m[1] && !m[2])) return NaN;
    var n = m[1] ? parseFloat(m[1]) : 0;
    if (m[2]) { if (+m[3] === 0) return NaN; n += +m[2] / +m[3]; }
    return n;
  }

  /* ---------- Binding ---------- */
  function binding(o) {
    var W = o.width, H = o.height, sw = o.stripWidth || 2.5, wof = o.wof || 42, extra = o.extra == null ? 15 : o.extra;
    var perimeter = 2 * (W + H), length = perimeter + extra;
    var strips = Math.ceil(length / wof - EPS);
    var inches = strips * sw, yards = yd(inches);
    return { perimeter: perimeter, length: length, strips: strips, inches: inches, yards: yards, meters: meters(yards) };
  }

  /* ---------- Backing ---------- */
  /* Panels needed to cover `need` inches when joined with 1/2" seams (1/4" each side). */
  function panelsFor(need, fabricWidth, seam) {
    seam = seam == null ? 0.5 : seam;
    if (need <= fabricWidth + EPS) return 1;
    return Math.ceil((need - seam) / (fabricWidth - seam) - EPS);
  }
  function backing(o) {
    var ov = o.overhang == null ? 4 : o.overhang, fw = o.fabricWidth || 42;
    var X = o.width + 2 * ov, Y = o.height + 2 * ov;
    // A: panels side by side across the quilt width (seams run vertically), each panel Y long
    var a = { seams: "vertical", panels: panelsFor(X, fw), length: Y };
    // B: panels stacked down the quilt length (seams run horizontally), each panel X long
    var b = { seams: "horizontal", panels: panelsFor(Y, fw), length: X };
    [a, b].forEach(function (p) { p.inches = p.panels * p.length; p.yards = yd(p.inches); p.meters = meters(p.yards); });
    var best = a.inches <= b.inches ? a : b;
    return { backW: X, backH: Y, vertical: a, horizontal: b, best: best, other: best === a ? b : a };
  }

  /* ---------- Borders (butted corners) ----------
     Enter the quilt top's current (unfinished) size. Each border adds 2x its finished width.
     Strip length to cut = 2*(W+H) + 4*finished + 10" safety, same as QuiltCraft Pro. */
  function border(W, H, finished, wof) {
    var cut = finished + 0.5, length = 2 * (W + H) + 4 * finished + 10;
    var strips = Math.ceil(length / wof - EPS), inches = strips * cut, yards = yd(inches);
    return { finished: finished, cutWidth: cut, sideLength: H, topLength: W + 2 * finished,
      length: length, strips: strips, inches: inches, yards: yards, meters: meters(yards),
      newW: W + 2 * finished, newH: H + 2 * finished };
  }
  function borders(o) {
    var wof = o.wof || 42, out = [], W = o.width, H = o.height;
    (o.widths || []).forEach(function (f) {
      if (!(f > 0)) return;
      var r = border(W, H, f, wof); out.push(r); W = r.newW; H = r.newH;
    });
    return { borders: out, finalW: W, finalH: H };
  }

  /* ---------- HST / QST / Flying geese ---------- */
  function hst(finished, trim) {
    var t = trim || 0, F = finished;
    return {
      unfinished: F + 0.5,
      twoAtATime: F + 0.875 + t,                       // finished + 7/8"
      fourAtATimeExact: (F + 0.875) * Math.SQRT2,      // (finished + 7/8") x 1.414
      fourAtATime: up8((F + 0.875) * Math.SQRT2) + t,  // rounded up to 1/8"
      eightAtATime: 2 * (F + 0.875) + t,               // (finished + 7/8") x 2
      qst: F + 1.25 + t                                // finished + 1 1/4"
    };
  }
  /* squares of EACH fabric needed for n units. QST (hourglass): one square of each fabric -> 2 units */
  function hstSquares(n) { return { two: Math.ceil(n / 2), four: Math.ceil(n / 4), eight: Math.ceil(n / 8), qst: Math.ceil(n / 2) }; }
  /* No-waste flying geese (4 at a time): 1 large square + 4 small squares make 4 geese */
  function flyingGeese(finishedW, finishedH, trim) {
    var t = trim || 0;
    return { large: finishedW + 1.25 + t, small: finishedH + 0.875 + t, unfinishedW: finishedW + 0.5, unfinishedH: finishedH + 0.5 };
  }

  /* ---------- Pieces from width of fabric (same packing as QuiltCraft Pro) ---------- */
  function pack(a, b, n, W) {
    var opts = [];
    if (a <= W + EPS) { var p1 = Math.floor(W / a + EPS); opts.push({ sw: b, per: p1, strips: Math.ceil(n / p1) }); }
    if (b <= W + EPS) { var p2 = Math.floor(W / b + EPS); opts.push({ sw: a, per: p2, strips: Math.ceil(n / p2) }); }
    if (!opts.length) return { sw: a, per: 1, strips: n, len: n * a, tooWide: true };
    opts.forEach(function (o) { o.len = o.strips * o.sw; });
    return opts.sort(function (x, y) { return x.len - y.len; })[0];
  }
  function pieces(o) {
    var wof = o.wof || 42, margin = o.margin || 0;
    var pk = pack(o.a, o.b, o.qty, wof);
    var inches = pk.len, yards = yd(inches * (1 + margin / 100));
    return { stripWidth: pk.sw, perStrip: pk.per, strips: pk.strips, inches: inches, yards: yards, meters: meters(yards), tooWide: !!pk.tooWide };
  }

  /* ---------- Quilt size from mattress ---------- */
  function quiltSize(o) {
    return { width: o.mattressW + 2 * o.drop, length: o.mattressL + o.drop + (o.tuck || 0) };
  }

  var QC = { frac: frac, up8: up8, yd: yd, ydTxt: ydTxt, meters: meters, mTxt: mTxt, parseIn: parseIn,
    binding: binding, backing: backing, panelsFor: panelsFor, border: border, borders: borders,
    hst: hst, hstSquares: hstSquares, flyingGeese: flyingGeese, pack: pack, pieces: pieces, quiltSize: quiltSize };
  if (typeof module !== "undefined" && module.exports) module.exports = QC; else root.QC = QC;
})(this);
