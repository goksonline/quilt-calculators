/* QuiltCalc page wiring. Each calculator page has <body data-page="...">. */
(function () {
  "use strict";
  var QC = window.QC, F = QC.frac;
  function $(id) { return document.getElementById(id); }
  function num(id) { var el = $(id); return el ? QC.parseIn(el.value) : NaN; }
  function pos(x) { return isFinite(x) && x > 0; }
  function yy(y) { return "<b>" + QC.ydTxt(y) + "</b> <span class=\"m\">(" + QC.mTxt(y) + ")</span>"; }
  function stat(label, value) { return "<div class=\"stat\"><span>" + label + "</span><strong>" + value + "</strong></div>"; }
  function err(msg) { return "<p class=\"err\">" + msg + "</p>"; }
  function s(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  function out(html) { $("result").innerHTML = html; }

  var pages = {
    binding: function () {
      var W = num("qw"), H = num("qh"), sw = num("sw"), wof = num("wof"), ex = num("extra");
      if (!pos(W) || !pos(H) || !pos(sw) || !pos(wof) || !(ex >= 0)) return out(err("Enter the quilt size, strip width and width of fabric."));
      var r = QC.binding({ width: W, height: H, stripWidth: sw, wof: wof, extra: ex });
      out("<div class=\"stats\">" + stat("Strips to cut", r.strips + " &times; " + F(sw)) + stat("Binding fabric", yy(r.yards)) + "</div>" +
        "<ul class=\"det\"><li>Perimeter: 2 &times; (" + F(W) + " + " + F(H) + ") = <b>" + F(r.perimeter) + "</b></li>" +
        "<li>Plus " + F(ex) + " for joins and the final overlap = <b>" + F(r.length) + "</b> of binding</li>" +
        "<li>" + F(r.length) + " &divide; " + F(wof) + " WOF = " + (r.length / wof).toFixed(2) + " &rarr; round up to <b>" + s(r.strips, "strip") + "</b></li>" +
        "<li>" + r.strips + " &times; " + F(sw) + " = " + F(r.inches) + " of fabric &rarr; rounded up to " + QC.ydTxt(r.yards) + "</li></ul>");
    },
    backing: function () {
      var W = num("qw"), H = num("qh"), ov = num("ov"), a = num("fw1"), b = num("fw2");
      if (!pos(W) || !pos(H) || !(ov >= 0) || !pos(a) || !pos(b)) return out(err("Enter the quilt size, overhang and fabric widths."));
      function card(fw) {
        var k = QC.backing({ width: W, height: H, overhang: ov, fabricWidth: fw }), p = k.best, o = k.other;
        var lay = p.panels === 1 ? "1 piece, no seams" : p.panels + " panels, " + (p.panels - 1) + " " + p.seams + " seam" + (p.panels > 2 ? "s" : "");
        return "<div class=\"card\"><h3>" + F(fw) + " wide fabric</h3>" + stat("Buy", yy(p.yards)) +
          "<ul class=\"det\"><li>Backing must be <b>" + F(k.backW) + " &times; " + F(k.backH) + "</b></li>" +
          "<li>Best layout: <b>" + lay + "</b></li><li>Cut " + s(p.panels, "panel") + " " + F(p.length) + " long (" + F(p.inches) + " total)</li>" +
          "<li class=\"alt\">Other way: " + s(o.panels, "panel") + " &times; " + F(o.length) + " = " + QC.ydTxt(o.yards) + " (" + (o.panels === 1 ? "fabric turned, no seams" : o.seams + " seams") + ")</li></ul></div>";
      }
      out("<div class=\"cards2\">" + card(a) + card(b) + "</div>");
    },
    borders: function () {
      var W = num("qw"), H = num("qh"), b1 = num("b1"), b2 = num("b2"), wof = num("wof");
      if (!pos(W) || !pos(H) || !pos(wof) || !pos(b1)) return out(err("Enter the quilt top size, at least one border width and WOF."));
      var r = QC.borders({ width: W, height: H, widths: [b1, pos(b2) ? b2 : 0], wof: wof });
      var html = "", names = ["Border 1 (inner)", "Border 2 (outer)"];
      r.borders.forEach(function (b, i) {
        html += "<div class=\"card\"><h3>" + (r.borders.length > 1 ? names[i] : "Border") + ": " + F(b.finished) + " finished</h3>" +
          "<div class=\"stats\">" + stat("Cut", s(b.strips, "strip") + " &times; " + F(b.cutWidth)) + stat("Fabric", yy(b.yards)) + "</div>" +
          "<ul class=\"det\"><li>Side borders: 2 &times; " + F(b.sideLength) + " long, sew on first</li>" +
          "<li>Top &amp; bottom: 2 &times; " + F(b.topLength) + " long</li>" +
          "<li>Strip length needed: " + F(b.length) + " &divide; " + F(wof) + " &rarr; " + b.strips + " strips</li></ul></div>";
      });
      html += "<p class=\"final\">Quilt top after borders: <b>" + F(r.finalW) + " &times; " + F(r.finalH) + "</b> (" + F(r.finalW - 0.5) + " &times; " + F(r.finalH - 0.5) + " finished)</p>";
      out(html);
    },
    hst: function () {
      var f = num("fin"), n = Math.round(num("qty")), t = $("trim").checked ? 0.25 : 0;
      if (!pos(f)) return out(err("Enter the finished size of the unit."));
      var h = QC.hst(f, t), q = QC.hstSquares(pos(n) ? n : 0), hasN = pos(n);
      function row(m, cut, sq, per) { return "<tr><td>" + m + "</td><td class=\"n\"><b>" + F(cut) + "</b></td><td class=\"n\">" + per + "</td><td class=\"n\">" + (hasN ? sq : "&ndash;") + "</td></tr>"; }
      var html = "<p class=\"final\">Trim each unit to <b>" + F(h.unfinished) + "</b> (" + F(f) + " finished)</p>" +
        "<div class=\"tw\"><table><thead><tr><th>Method</th><th class=\"n\">Cut squares</th><th class=\"n\">Units per pair</th><th class=\"n\">Squares of each fabric" + (hasN ? " for " + n : "") + "</th></tr></thead><tbody>" +
        row("HST 2-at-a-time", h.twoAtATime, q.two, 2) + row("HST 4-at-a-time", h.fourAtATime, q.four, 4) +
        row("HST 8-at-a-time", h.eightAtATime, q.eight, 8) + row("QST / hourglass", h.qst, q.qst, 2) + "</tbody></table></div>" +
        (t ? "" : "<p class=\"note\">4-at-a-time exact size is " + h.fourAtATimeExact.toFixed(3) + "&Prime;, shown rounded up to the next 1/8&Prime;.</p>");
      var gw = num("gw"), gh = num("gh"), gn = Math.round(num("gqty"));
      if (pos(gw) && pos(gh)) {
        var g = QC.flyingGeese(gw, gh, t), sets = pos(gn) ? Math.ceil(gn / 4) : 0;
        html += "<h3>Flying geese, no-waste method (" + F(gw) + " &times; " + F(gh) + " finished)</h3><div class=\"stats\">" +
          stat("Large square (goose)", F(g.large)) + stat("Small squares (sky)", F(g.small)) + "</div>" +
          "<ul class=\"det\"><li>1 large + 4 small squares make 4 geese; trim to " + F(g.unfinishedW) + " &times; " + F(g.unfinishedH) + "</li>" +
          (sets ? "<li>For " + gn + " geese: <b>" + s(sets, "large square") + "</b> and <b>" + (sets * 4) + " small squares</b></li>" : "") + "</ul>";
      }
      out(html);
    },
    yardage: function () {
      var a = num("pw"), b = num("ph"), n = Math.round(num("qty")), wof = num("wof"), mg = num("margin");
      if (!pos(a) || !pos(b) || !pos(n) || !pos(wof)) return out(err("Enter the piece size, how many you need and WOF."));
      if (!(mg >= 0)) mg = 0;
      var add = $("fin").checked ? 0.5 : 0; a += add; b += add;
      var r = QC.pieces({ a: a, b: b, qty: n, wof: wof, margin: mg });
      if (r.tooWide) return out(err("That piece is wider than your fabric in both directions - cut it lengthwise from yardage instead."));
      var shape = a === b ? F(a) + " squares" : F(Math.min(a, b)) + " &times; " + F(Math.max(a, b)) + " rectangles";
      out("<div class=\"stats\">" + stat("Cut", s(r.strips, "strip") + " &times; " + F(r.stripWidth)) + stat("Fabric", yy(r.yards)) + "</div>" +
        "<ul class=\"det\"><li>" + n + " " + shape + (add ? " (cut size, seam allowance added)" : "") + "</li>" +
        "<li><b>" + r.perStrip + " pieces</b> fit across one " + F(wof) + " strip</li>" +
        "<li>" + n + " &divide; " + r.perStrip + " = " + (n / r.perStrip).toFixed(2) + " &rarr; " + s(r.strips, "strip") + " &times; " + F(r.stripWidth) + " = " + F(r.inches) + "</li>" +
        (mg ? "<li>Plus " + mg + "% extra = " + F(r.inches * (1 + mg / 100)) + "</li>" : "") +
        "<li>Rounded up to " + QC.ydTxt(r.yards) + "</li></ul>");
    },
    sizes: function () {
      var mw = num("mw"), ml = num("ml"), d = num("drop"), t = num("tuck");
      if (!pos(mw) || !pos(ml) || !(d >= 0)) return out(err("Enter the mattress size and drop."));
      var r = QC.quiltSize({ mattressW: mw, mattressL: ml, drop: d, tuck: t >= 0 ? t : 0 });
      out("<div class=\"stats\">" + stat("Finished quilt", F(r.width) + " &times; " + F(r.length)) + stat("In cm", Math.round(r.width * 2.54) + " &times; " + Math.round(r.length * 2.54)) + "</div>" +
        "<ul class=\"det\"><li>Width: " + F(mw) + " + 2 &times; " + F(d) + " drop</li><li>Length: " + F(ml) + " + " + F(d) + " drop at the foot" + (t > 0 ? " + " + F(t) + " pillow tuck" : "") + "</li></ul>");
    }
  };

  var page = document.body.getAttribute("data-page"), fn = pages[page];
  if (!fn) return;
  var form = $("calc");
  if (page === "sizes") {
    $("preset").addEventListener("change", function () {
      var v = this.value.split("x"); if (v.length === 2) { $("mw").value = v[0]; $("ml").value = v[1]; fn(); }
    });
  }
  form.addEventListener("input", fn);
  form.addEventListener("change", fn);
  form.addEventListener("submit", function (e) { e.preventDefault(); fn(); });
  fn();
})();
