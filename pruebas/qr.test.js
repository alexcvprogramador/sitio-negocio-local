// Pruebas del codificador y de los contenidos. Se ejecutan con:  node --test pruebas/
const test = require("node:test");
const assert = require("node:assert/strict");
const QR = require("../assets/js/qr.js");
const Payload = require("../assets/js/payload.js");
const Color = require("../assets/js/color.js");

/* ---------- Respuestas conocidas (ejemplos de la norma y de tutoriales de referencia) ---------- */
test("«01234567» en versión 1-M: palabras de datos y de corrección de la norma", () => {
  const r = QR.encode("01234567", { ecc: "M", minVersion: 1, maxVersion: 1 });
  const datos = [16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17];
  const ecc = [165, 36, 212, 193, 237, 54, 199, 135, 44, 85];
  assert.equal(r.modo, "numerico");
  assert.deepEqual(r.palabras, datos.concat(ecc));
});

test("«HELLO WORLD» en versión 1-Q: palabras de datos y de corrección", () => {
  const r = QR.encode("HELLO WORLD", { ecc: "Q", minVersion: 1, maxVersion: 1 });
  const datos = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]; // 13 palabras de datos en 1-Q
  const ecc = [168, 72, 22, 82, 217, 54, 156, 0, 46, 15, 180, 122, 16];
  assert.equal(r.modo, "alfanumerico");
  assert.deepEqual(r.palabras, datos.concat(ecc));
});

/* ---------- Capacidades ---------- */
test("capacidad máxima en bytes de la versión 40", () => {
  assert.equal(QR.maxBytes("L"), 2953);
  assert.equal(QR.maxBytes("M"), 2331);
  assert.equal(QR.maxBytes("Q"), 1663);
  assert.equal(QR.maxBytes("H"), 1273);
});

test("el máximo exacto cabe y uno más no", () => {
  for (const n of ["L", "M", "Q", "H"]) {
    assert.equal(QR.encode("a".repeat(QR.maxBytes(n)), { ecc: n }).version, 40);
    assert.throws(() => QR.encode("a".repeat(QR.maxBytes(n) + 1), { ecc: n }), /demasiado-largo/);
  }
});

test("elige la versión mínima que alcanza", () => {
  assert.equal(QR.encode("https://example.com", { ecc: "M" }).version, 2);
  assert.equal(QR.encode("1", { ecc: "L" }).version, 1);
  assert.equal(QR.encode("a".repeat(17), { ecc: "L" }).version, 1);
  assert.equal(QR.encode("a".repeat(18), { ecc: "L" }).version, 2);
});

test("texto vacío o nivel desconocido se rechazan", () => {
  assert.throws(() => QR.encode(""), /vacio/);
  assert.throws(() => QR.encode("a", { ecc: "X" }), /Nivel/);
});

/* ---------- Estructura de la matriz ---------- */
test("lado = 17 + 4 × versión y los tres buscadores están en su sitio", () => {
  for (const v of [1, 2, 7, 10, 25, 40]) {
    const r = QR.encode("a".repeat(v === 1 ? 5 : 1), { minVersion: v, maxVersion: v });
    const n = 17 + 4 * v;
    assert.equal(r.size, n);
    assert.equal(r.modules.length, n);
    for (const [x0, y0] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      for (let d = 0; d < 7; d++) {
        for (const [x, y] of [[x0 + d, y0], [x0 + d, y0 + 6], [x0, y0 + d], [x0 + 6, y0 + d]]) assert.equal(r.modules[y][x], true);
      }
      assert.equal(r.modules[y0 + 3][x0 + 3], true); // centro del buscador
      assert.equal(r.modules[y0 + 1][x0 + 1], false); // anillo claro
    }
    assert.equal(r.modules[n - 8][8], true); // módulo oscuro fijo
    for (let i = 8; i < n - 8; i++) assert.equal(r.modules[6][i], i % 2 === 0); // línea de temporización
  }
});

test("elegir máscara automática da una de 0 a 7 y respetar una pedida", () => {
  const a = QR.encode("https://example.com");
  assert.ok(a.mascara >= 0 && a.mascara <= 7);
  for (let m = 0; m < 8; m++) assert.equal(QR.encode("hola", { mascara: m }).mascara, m);
});

test("el mismo texto da siempre el mismo código", () => {
  const a = QR.encode("Pastelería Casa Maqui ñandú"), b = QR.encode("Pastelería Casa Maqui ñandú");
  assert.deepEqual(a.modules, b.modules);
});

test("detecta el modo más compacto", () => {
  assert.equal(QR.detectarModo("0123456789"), "numerico");
  assert.equal(QR.detectarModo("HOLA MUNDO 123"), "alfanumerico");
  assert.equal(QR.detectarModo("hola"), "bytes");
  assert.equal(QR.detectarModo("ñ"), "bytes");
});

/* ---------- SVG ---------- */
test("toSvg arma un SVG con el margen pedido y rechaza colores raros", () => {
  const r = QR.encode("hola");
  const svg = QR.toSvg(r.modules, { margen: 2, fg: "#112233", bg: "#FFFFFF" });
  assert.match(svg, /viewBox="0 0 25 25"/);
  assert.match(svg, /fill="#112233"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.throws(() => QR.toSvg(r.modules, { fg: "red" }), /Color inválido/);
  assert.throws(() => QR.toSvg(r.modules, { fg: '#000000" onload="x' }), /Color inválido/);
});

/* ---------- Contenidos ---------- */
test("enlace: completa https, respeta http y trata lo demás como texto", () => {
  assert.equal(Payload.construir("enlace", { texto: "www.ejemplo.cl" }).texto, "https://www.ejemplo.cl");
  assert.equal(Payload.construir("enlace", { texto: "http://ejemplo.cl/a?b=1" }).texto, "http://ejemplo.cl/a?b=1");
  assert.equal(Payload.construir("enlace", { texto: "Hola mundo" }).resumen, "Texto");
  assert.equal(Payload.construir("enlace", { texto: "javascript:alert(1)" }).resumen, "Texto");
  assert.equal(Payload.construir("enlace", { texto: "  " }).ok, false);
});

test("WhatsApp: normaliza el número y codifica el mensaje", () => {
  const r = Payload.construir("whatsapp", { "wa-numero": "+56 (9) 1234-5678", "wa-mensaje": "Hola, ¿tienen tortas?" });
  assert.equal(r.texto, "https://wa.me/56912345678?text=Hola%2C%20%C2%BFtienen%20tortas%3F");
  assert.equal(Payload.construir("whatsapp", { "wa-numero": "912345678" }).texto, "https://wa.me/56912345678");
  assert.equal(Payload.construir("whatsapp", { "wa-numero": "0056912345678" }).texto, "https://wa.me/56912345678");
  assert.equal(Payload.construir("whatsapp", { "wa-numero": "123" }).ok, false);
  assert.equal(Payload.construir("whatsapp", { "wa-numero": "abc" }).ok, false);
  assert.equal(Payload.construir("whatsapp", { "wa-numero": "" }).ok, false);
});

test("WiFi: escapa \\ ; , : y comillas, y oculta la clave en la vista", () => {
  const r = Payload.construir("wifi", { "wifi-nombre": "Mi;red", "wifi-clave": 'a;b,c:d"e\\f12', "wifi-seguridad": "WPA", "wifi-oculta": true });
  assert.equal(r.texto, 'WIFI:T:WPA;S:Mi\\;red;P:a\\;b\\,c\\:d\\"e\\\\f12;H:true;;');
  assert.ok(!r.vista.includes("a\;b"));
  assert.ok(r.vista.includes("••••"));
  assert.equal(Payload.construir("wifi", { "wifi-nombre": "Abierta", "wifi-seguridad": "nopass" }).texto, "WIFI:T:nopass;S:Abierta;;");
  assert.equal(Payload.construir("wifi", { "wifi-nombre": "X", "wifi-clave": "corta", "wifi-seguridad": "WPA" }).ok, false);
  assert.equal(Payload.construir("wifi", { "wifi-nombre": "x".repeat(33), "wifi-clave": "12345678", "wifi-seguridad": "WPA" }).ok, false);
  assert.equal(Payload.construir("wifi", { "wifi-nombre": "X", "wifi-clave": "12345", "wifi-seguridad": "WEP" }).ok, true);
});

test("contacto: arma una vCard 3.0 y escapa comas y punto y coma", () => {
  const r = Payload.construir("contacto", { "c-nombre": "Ana", "c-apellido": "Pérez", "c-empresa": "A, B; C", "c-tel": "+56 9 8765 4321", "c-correo": "ana@ejemplo.cl", "c-web": "ejemplo.cl" });
  assert.equal(r.texto, "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Pérez;Ana;;;\r\nFN:Ana Pérez\r\nORG:A\\, B\\; C\r\nTEL;TYPE=CELL:+56987654321\r\nEMAIL:ana@ejemplo.cl\r\nURL:https://ejemplo.cl\r\nEND:VCARD");
  assert.equal(Payload.construir("contacto", {}).ok, false);
  assert.equal(Payload.construir("contacto", { "c-nombre": "Ana", "c-correo": "malo" }).ok, false);
  assert.equal(Payload.construir("contacto", { "c-empresa": "Solo Empresa" }).ok, true);
});

test("correo y teléfono", () => {
  assert.equal(Payload.construir("correo", { "m-correo": "a@b.cl", "m-asunto": "Hola mundo", "m-cuerpo": "x & y" }).texto, "mailto:a@b.cl?subject=Hola%20mundo&body=x%20%26%20y");
  assert.equal(Payload.construir("correo", { "m-correo": "a@b.cl" }).texto, "mailto:a@b.cl");
  assert.equal(Payload.construir("correo", { "m-correo": "a b@c.cl" }).ok, false);
  assert.equal(Payload.construir("telefono", { "t-numero": "9 8765 4321" }).texto, "tel:+56987654321");
  assert.equal(Payload.construir("telefono", { "t-numero": "+1 415 555 0101" }).texto, "tel:+14155550101");
  assert.equal(Payload.construir("telefono", { "t-numero": "x" }).ok, false);
  assert.equal(Payload.construir("desconocido", {}).ok, false);
});

/* ---------- Color ---------- */
test("contraste WCAG: negro/blanco = 21, iguales = 1, #767676 sobre blanco ≈ 4,54", () => {
  assert.equal(Math.round(Color.contraste("#000000", "#ffffff") * 100) / 100, 21);
  assert.equal(Color.contraste("#336699", "#336699"), 1);
  assert.equal(Math.round(Color.contraste("#767676", "#ffffff") * 100) / 100, 4.54);
  assert.ok(Color.esHex("#a1B2c3"));
  assert.ok(!Color.esHex("a1b2c3"));
  assert.ok(!Color.esHex("#fff"));
});
