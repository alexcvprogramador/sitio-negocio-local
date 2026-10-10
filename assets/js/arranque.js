/* Se ejecuta antes de pintar la página: aplica los colores del negocio (así no hay
   "parpadeo" de colores) y deja lista la pantalla de carga. */
(function () {
  "use strict";
  var html = document.documentElement;
  var N = window.NEGOCIO || {};
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var avisos = [];

  html.classList.add("js");
  if (reducir) html.classList.add("sin-movimiento", "cargado");
  if (N.carga === false) html.classList.add("sin-carga", "cargado");

  /* ---- Colores ---- */
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var BASE = { fondo: "#FBF8FD", tinta: "#2B1346", principal: "#BEE3A6", acento: "#FF5C8A", suave: "#FFE08A" };
  var dado = (N.colores && typeof N.colores === "object") ? N.colores : {};
  var col = {};
  Object.keys(BASE).forEach(function (k) {
    if (typeof dado[k] === "string" && HEX.test(dado[k])) col[k] = dado[k].toUpperCase();
    else {
      col[k] = BASE[k];
      if (dado[k] !== undefined) avisos.push("El color «" + k + "» no es válido (" + String(dado[k]).slice(0, 12) + "). Usa el formato #RRGGBB, por ejemplo #2B1346.");
    }
  });

  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(h) { var n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); }
  function razon(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Prefiere el primer candidato (el color de la marca) mientras se lea bien; si no, el de mayor contraste.
  function mejor(fondo, candidatos) {
    if (razon(candidatos[0], fondo) >= 4.5) return candidatos[0];
    var gana = candidatos[0];
    candidatos.forEach(function (c) { if (razon(c, fondo) > razon(gana, fondo)) gana = c; });
    return gana;
  }
  function mezcla(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), s = "#";
    [16, 8, 0].forEach(function (d) {
      var v = Math.round((x >> d & 255) * t + (y >> d & 255) * (1 - t));
      s += (v < 16 ? "0" : "") + v.toString(16);
    });
    return s.toUpperCase();
  }

  var tinta2 = mezcla(col.tinta, col.fondo, 0.74);
  if (razon(tinta2, col.fondo) < 4.5) tinta2 = col.tinta;
  var derivados = {
    "--sobre-principal": mejor(col.principal, [col.tinta, "#FFFFFF", "#000000"]),
    "--sobre-acento": mejor(col.acento, [col.tinta, "#FFFFFF", "#000000"]),
    "--sobre-suave": mejor(col.suave, [col.tinta, "#FFFFFF", "#000000"]),
    "--sobre-tinta": mejor(col.tinta, [col.fondo, "#FFFFFF", "#000000"]),
    "--tinta-2": tinta2,
    "--linea": mezcla(col.tinta, col.fondo, 0.2)
  };
  if (razon(col.tinta, col.fondo) < 4.5) avisos.push("El color de la tinta casi no se distingue del fondo. Elige uno más oscuro (o más claro) para que el texto se lea.");

  var estilo = html.style;
  Object.keys(col).forEach(function (k) { estilo.setProperty("--" + k, col[k]); });
  Object.keys(derivados).forEach(function (k) { estilo.setProperty(k, derivados[k]); });

  window.__avisosColor = avisos;
  window.__colores = col;

  /* Plan B: si por algún motivo el programa principal no arranca, se muestra todo igual. */
  setTimeout(function () { if (!window.__sitioListo) html.classList.remove("js"); }, 5000);
})();
