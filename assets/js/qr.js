/*
  qr.js — codificador de códigos QR (Modelo 2, versiones 1 a 40).
  Escrito desde cero siguiendo ISO/IEC 18004. No usa librerías.

  Se carga en el navegador como window.QRGen.QR y en Node con require().

    var r = QR.encode("https://ejemplo.cl", { ecc: "M" });
    r.modules[y][x]   → true si el cuadrito es oscuro
    r.size            → lado, en cuadritos (sin margen)
    r.version         → 1 a 40
*/
(function (raiz) {
  "use strict";

  /* ---------- Tablas (ISO/IEC 18004, tabla 9) ----------
     Índices: [nivel][versión]. La posición 0 no se usa. */
  var NIVELES = ["L", "M", "Q", "H"];
  var BITS_FORMATO = { L: 1, M: 0, Q: 3, H: 2 };

  var ECC_POR_BLOQUE = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var NUM_BLOQUES = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  var ALFANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  var INDICADOR_MODO = { numerico: 1, alfanumerico: 2, bytes: 4 };
  var BITS_CONTEO = { numerico: [10, 12, 14], alfanumerico: [9, 11, 13], bytes: [8, 16, 16] };

  /* ---------- Utilidades ---------- */
  function anadirBits(lista, valor, largo) {
    for (var i = largo - 1; i >= 0; i--) lista.push((valor >>> i) & 1);
  }
  function nivelValido(ecc) {
    var i = NIVELES.indexOf(ecc);
    if (i < 0) throw new RangeError("Nivel de corrección desconocido: " + ecc);
    return i;
  }
  function tramoVersion(v) { return v <= 9 ? 0 : v <= 26 ? 1 : 2; }

  function utf8(texto) {
    if (typeof TextEncoder !== "undefined") return Array.prototype.slice.call(new TextEncoder().encode(texto));
    var cod = unescape(encodeURIComponent(texto)), out = [];
    for (var i = 0; i < cod.length; i++) out.push(cod.charCodeAt(i));
    return out;
  }

  function detectarModo(texto) {
    if (/^[0-9]*$/.test(texto)) return "numerico";
    for (var i = 0; i < texto.length; i++) if (ALFANUM.indexOf(texto.charAt(i)) < 0) return "bytes";
    return "alfanumerico";
  }

  /* Devuelve los bits de datos del texto y la cantidad que va en el contador. */
  function segmento(texto, modo) {
    var bits = [], i;
    if (modo === "numerico") {
      for (i = 0; i < texto.length;) {
        var n = Math.min(3, texto.length - i);
        anadirBits(bits, parseInt(texto.substr(i, n), 10), n * 3 + 1);
        i += n;
      }
      return { bits: bits, conteo: texto.length };
    }
    if (modo === "alfanumerico") {
      for (i = 0; i + 1 < texto.length; i += 2)
        anadirBits(bits, ALFANUM.indexOf(texto.charAt(i)) * 45 + ALFANUM.indexOf(texto.charAt(i + 1)), 11);
      if (i < texto.length) anadirBits(bits, ALFANUM.indexOf(texto.charAt(i)), 6);
      return { bits: bits, conteo: texto.length };
    }
    var bytes = utf8(texto);
    for (i = 0; i < bytes.length; i++) anadirBits(bits, bytes[i], 8);
    return { bits: bits, conteo: bytes.length };
  }

  /* ---------- Capacidad ---------- */
  function modulosDeDatos(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function palabrasDeDatos(ver, nivel) {
    return Math.floor(modulosDeDatos(ver) / 8) - ECC_POR_BLOQUE[nivel][ver] * NUM_BLOQUES[nivel][ver];
  }

  /* Cantidad máxima de bytes (modo bytes) en la versión 40 para un nivel. */
  function maxBytes(ecc) {
    var nivel = nivelValido(ecc);
    return Math.floor((palabrasDeDatos(40, nivel) * 8 - 4 - BITS_CONTEO.bytes[2]) / 8);
  }

  /* ---------- Reed–Solomon sobre GF(256), polinomio 0x11D ---------- */
  function multGF(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function divisorRS(grado) {
    var r = [], i, j;
    for (i = 0; i < grado - 1; i++) r.push(0);
    r.push(1);
    var raizAlfa = 1;
    for (i = 0; i < grado; i++) {
      for (j = 0; j < r.length; j++) {
        r[j] = multGF(r[j], raizAlfa);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      raizAlfa = multGF(raizAlfa, 2);
    }
    return r;
  }
  function restoRS(datos, divisor) {
    var r = divisor.map(function () { return 0; });
    datos.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      divisor.forEach(function (c, i) { r[i] ^= multGF(c, f); });
    });
    return r;
  }

  /* Reparte los datos en bloques, calcula la corrección de cada uno y los intercala. */
  function conCorreccion(datos, ver, nivel) {
    var nBloques = NUM_BLOQUES[nivel][ver];
    var eccBloque = ECC_POR_BLOQUE[nivel][ver];
    var total = Math.floor(modulosDeDatos(ver) / 8);
    var nCortos = nBloques - (total % nBloques);
    var largoCorto = Math.floor(total / nBloques);
    var divisor = divisorRS(eccBloque);
    var bloques = [], i, j, k = 0;
    for (i = 0; i < nBloques; i++) {
      var largo = largoCorto - eccBloque + (i < nCortos ? 0 : 1);
      var dat = datos.slice(k, k + largo);
      k += largo;
      var ecc = restoRS(dat, divisor);
      if (i < nCortos) dat.push(0); // relleno solo para alinear al intercalar
      bloques.push(dat.concat(ecc));
    }
    var salida = [];
    for (i = 0; i < bloques[0].length; i++)
      for (j = 0; j < nBloques; j++)
        if (i !== largoCorto - eccBloque || j >= nCortos) salida.push(bloques[j][i]);
    return salida;
  }

  /* ---------- Matriz ---------- */
  function Matriz(ver) {
    this.size = ver * 4 + 17;
    this.m = [];
    this.fn = [];
    for (var y = 0; y < this.size; y++) {
      var a = [], b = [];
      for (var x = 0; x < this.size; x++) { a.push(false); b.push(false); }
      this.m.push(a);
      this.fn.push(b);
    }
  }
  Matriz.prototype.poner = function (x, y, oscuro) {
    this.m[y][x] = oscuro;
    this.fn[y][x] = true;
  };

  function posicionesAlineacion(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var paso = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    var r = [6];
    for (var pos = ver * 4 + 10; r.length < n; pos -= paso) r.splice(1, 0, pos);
    return r;
  }

  function dibujarBusqueda(mx, cx, cy) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var x = cx + dx, y = cy + dy;
        if (x < 0 || x >= mx.size || y < 0 || y >= mx.size) continue;
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        mx.poner(x, y, d !== 2 && d !== 4);
      }
    }
  }
  function dibujarAlineacion(mx, cx, cy) {
    for (var dy = -2; dy <= 2; dy++)
      for (var dx = -2; dx <= 2; dx++)
        mx.poner(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  function dibujarFormato(mx, nivel, mascara) {
    var datos = (BITS_FORMATO[NIVELES[nivel]] << 3) | mascara;
    var r = datos, i;
    for (i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bits = ((datos << 10) | r) ^ 0x5412;
    var s = mx.size;
    function b(n) { return ((bits >>> n) & 1) !== 0; }
    for (i = 0; i <= 5; i++) mx.poner(8, i, b(i));
    mx.poner(8, 7, b(6));
    mx.poner(8, 8, b(7));
    mx.poner(7, 8, b(8));
    for (i = 9; i < 15; i++) mx.poner(14 - i, 8, b(i));
    for (i = 0; i < 8; i++) mx.poner(s - 1 - i, 8, b(i));
    for (i = 8; i < 15; i++) mx.poner(8, s - 15 + i, b(i));
    mx.poner(8, s - 8, true); // módulo oscuro fijo
  }

  function dibujarVersion(mx, ver) {
    if (ver < 7) return;
    var r = ver, i;
    for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    var bits = (ver << 12) | r;
    for (i = 0; i < 18; i++) {
      var oscuro = ((bits >>> i) & 1) !== 0;
      var a = mx.size - 11 + (i % 3), b = Math.floor(i / 3);
      mx.poner(a, b, oscuro);
      mx.poner(b, a, oscuro);
    }
  }

  function dibujarFuncion(mx, ver, nivel) {
    var s = mx.size, i, j;
    for (i = 0; i < s; i++) {
      mx.poner(6, i, i % 2 === 0);
      mx.poner(i, 6, i % 2 === 0);
    }
    dibujarBusqueda(mx, 3, 3);
    dibujarBusqueda(mx, s - 4, 3);
    dibujarBusqueda(mx, 3, s - 4);
    var pos = posicionesAlineacion(ver), n = pos.length;
    for (i = 0; i < n; i++)
      for (j = 0; j < n; j++)
        if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)))
          dibujarAlineacion(mx, pos[i], pos[j]);
    dibujarFormato(mx, nivel, 0); // reserva el sitio; se vuelve a escribir con la máscara elegida
    dibujarVersion(mx, ver);
  }

  function colocarPalabras(mx, palabras) {
    var s = mx.size, i = 0, derecha, vert, j;
    for (derecha = s - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) derecha = 5;
      for (vert = 0; vert < s; vert++) {
        for (j = 0; j < 2; j++) {
          var x = derecha - j;
          var arriba = ((derecha + 1) & 2) === 0;
          var y = arriba ? s - 1 - vert : vert;
          if (!mx.fn[y][x] && i < palabras.length * 8) {
            mx.m[y][x] = ((palabras[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  var MASCARAS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  function aplicarMascara(mx, mascara) {
    var f = MASCARAS[mascara];
    for (var y = 0; y < mx.size; y++)
      for (var x = 0; x < mx.size; x++)
        if (!mx.fn[y][x] && f(x, y)) mx.m[y][x] = !mx.m[y][x];
  }

  var PATRON_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  var PATRON_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  function coincide(linea, desde, patron) {
    for (var i = 0; i < 11; i++) if (linea[desde + i] !== patron[i]) return false;
    return true;
  }

  /* Penalización de la máscara según la norma (reglas N1 a N4). */
  function penalizacion(m, s) {
    var p = 0, a, b, dir, run, linea;
    for (dir = 0; dir < 2; dir++) {
      for (a = 0; a < s; a++) {
        linea = [];
        for (b = 0; b < s; b++) linea.push((dir === 0 ? m[a][b] : m[b][a]) ? 1 : 0);
        run = 1;
        for (b = 1; b < s; b++) {
          if (linea[b] === linea[b - 1]) run++;
          else { if (run >= 5) p += run - 2; run = 1; }
        }
        if (run >= 5) p += run - 2;
        for (b = 0; b <= s - 11; b++)
          if (coincide(linea, b, PATRON_A) || coincide(linea, b, PATRON_B)) p += 40;
      }
    }
    var oscuros = 0, y, x;
    for (y = 0; y < s; y++) {
      for (x = 0; x < s; x++) {
        if (m[y][x]) oscuros++;
        if (y + 1 < s && x + 1 < s && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
    }
    var total = s * s;
    p += (Math.ceil(Math.abs(oscuros * 20 - total * 10) / total) - 1) * 10;
    return p;
  }

  /* ---------- API ---------- */
  /*
    opciones:
      ecc         "L" | "M" | "Q" | "H"   (por defecto "M")
      minVersion  1 a 40                   (por defecto 1)
      maxVersion  1 a 40                   (por defecto 40)
      mascara     0 a 7, o -1 para elegir la mejor (por defecto -1)
      modo        "numerico" | "alfanumerico" | "bytes" | null para elegirlo solo
  */
  function encode(texto, opciones) {
    opciones = opciones || {};
    if (typeof texto !== "string" || texto.length === 0) throw new RangeError("vacio");
    var ecc = opciones.ecc || "M";
    var nivel = nivelValido(ecc);
    var minV = opciones.minVersion || 1, maxV = opciones.maxVersion || 40;
    var mascara = opciones.mascara === undefined ? -1 : opciones.mascara;
    var modo = opciones.modo || detectarModo(texto);
    if (modo === "numerico" && !/^[0-9]*$/.test(texto)) throw new RangeError("modo-incompatible");
    if (modo === "alfanumerico" && detectarModo(texto) === "bytes") throw new RangeError("modo-incompatible");

    var seg = segmento(texto, modo);
    var ver, capacidad;
    for (ver = minV; ; ver++) {
      capacidad = palabrasDeDatos(ver, nivel) * 8;
      var usados = 4 + BITS_CONTEO[modo][tramoVersion(ver)] + seg.bits.length;
      if (usados <= capacidad && seg.conteo < (1 << BITS_CONTEO[modo][tramoVersion(ver)])) break;
      if (ver >= maxV) throw new RangeError("demasiado-largo");
    }

    var bits = [];
    anadirBits(bits, INDICADOR_MODO[modo], 4);
    anadirBits(bits, seg.conteo, BITS_CONTEO[modo][tramoVersion(ver)]);
    for (var i = 0; i < seg.bits.length; i++) bits.push(seg.bits[i]);
    anadirBits(bits, 0, Math.min(4, capacidad - bits.length));
    anadirBits(bits, 0, (8 - (bits.length % 8)) % 8);
    for (var relleno = 0xEC; bits.length < capacidad; relleno ^= 0xEC ^ 0x11) anadirBits(bits, relleno, 8);
    var datos = [];
    for (i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[i + k];
      datos.push(byte);
    }

    var palabras = conCorreccion(datos, ver, nivel);
    var mx = new Matriz(ver);
    dibujarFuncion(mx, ver, nivel);
    colocarPalabras(mx, palabras);

    if (mascara < 0) {
      var mejor = Infinity;
      for (var t = 0; t < 8; t++) {
        aplicarMascara(mx, t);
        dibujarFormato(mx, nivel, t);
        var pena = penalizacion(mx.m, mx.size);
        if (pena < mejor) { mejor = pena; mascara = t; }
        aplicarMascara(mx, t); // deshacer
      }
    }
    aplicarMascara(mx, mascara);
    dibujarFormato(mx, nivel, mascara);

    return {
      version: ver,
      ecc: ecc,
      mascara: mascara,
      modo: modo,
      size: mx.size,
      modules: mx.m,
      bytesUsados: modo === "bytes" ? seg.conteo : null,
      capacidadBits: capacidad,
      palabras: palabras // datos + corrección, ya intercalados (para pruebas)
    };
  }

  /* ---------- Salida vectorial ---------- */
  /* Un solo trazo: una barra por cada tramo oscuro de cada fila. */
  function trazo(modules, margen) {
    var d = [], n = modules.length;
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n;) {
        if (modules[y][x]) {
          var ini = x;
          while (x < n && modules[y][x]) x++;
          d.push("M" + (ini + margen) + " " + (y + margen) + "h" + (x - ini) + "v1h-" + (x - ini) + "z");
        } else x++;
      }
    }
    return d.join("");
  }

  function colorHex(c) {
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw new RangeError("Color inválido: " + c);
    return c.toLowerCase();
  }

  function toSvg(modules, opciones) {
    opciones = opciones || {};
    var margen = opciones.margen === undefined ? 4 : opciones.margen;
    var fg = colorHex(opciones.fg || "#000000"), bg = colorHex(opciones.bg || "#ffffff");
    var t = modules.length + margen * 2;
    var medida = opciones.tamano ? ' width="' + opciones.tamano + '" height="' + opciones.tamano + '"' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg"' + medida + ' viewBox="0 0 ' + t + " " + t + '" shape-rendering="crispEdges">' +
      '<rect width="' + t + '" height="' + t + '" fill="' + bg + '"/>' +
      '<path fill="' + fg + '" d="' + trazo(modules, margen) + '"/></svg>';
  }

  var QR = {
    encode: encode,
    toSvg: toSvg,
    trazo: trazo,
    maxBytes: maxBytes,
    detectarModo: detectarModo,
    NIVELES: NIVELES
  };

  if (typeof module === "object" && module.exports) {
    module.exports = QR;
  } else {
    raiz.QRGen = raiz.QRGen || {};
    raiz.QRGen.QR = QR;
  }
})(typeof window !== "undefined" ? window : globalThis);
