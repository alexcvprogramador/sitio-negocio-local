/*
  color.js — contraste entre dos colores, según la fórmula de WCAG 2.x.
  Se carga como window.QRGen.Color y en Node con require().
*/
(function (raiz) {
  "use strict";

  function esHex(s) { return /^#[0-9a-fA-F]{6}$/.test(s); }

  function aRgb(hex) {
    return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); });
  }

  /* Luminancia relativa, de 0 (negro) a 1 (blanco). */
  function luminancia(hex) {
    var c = aRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /* Razón de contraste, de 1 (iguales) a 21 (negro sobre blanco). */
  function contraste(a, b) {
    var la = luminancia(a), lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  var Color = { esHex: esHex, luminancia: luminancia, contraste: contraste };

  if (typeof module === "object" && module.exports) {
    module.exports = Color;
  } else {
    raiz.QRGen = raiz.QRGen || {};
    raiz.QRGen.Color = Color;
  }
})(typeof window !== "undefined" ? window : globalThis);
