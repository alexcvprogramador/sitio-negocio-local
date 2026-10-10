/*
  main.js — la página del generador.
  Lee el formulario, arma el contenido con payload.js, lo codifica con qr.js y lo dibuja.
  Nada sale del navegador y nada se guarda: ni cookies, ni localStorage.
  Todo el DOM se arma con textContent y setAttribute, nunca con innerHTML.
*/
(function () {
  "use strict";

  var G = window.QRGen;
  if (!G || !G.QR || !G.Payload || !G.Color) return;
  var QR = G.QR, Payload = G.Payload, Color = G.Color;

  function $(id) { return document.getElementById(id); }
  var SVG_NS = "http://www.w3.org/2000/svg";

  var TITULOS = {
    enlace: "Escanea y entra",
    whatsapp: "Escríbenos por WhatsApp",
    wifi: "Conéctate al WiFi",
    contacto: "Guarda nuestro contacto",
    correo: "Escríbenos un correo",
    telefono: "Llámanos"
  };

  var el = {
    form: $("formulario"),
    titulo: $("titulo"),
    nivel: $("nivel"),
    margen: $("margen"),
    colorCodigo: $("color-codigo"),
    colorFondo: $("color-fondo"),
    tamano: $("tamano"),
    cartel: $("cartel"),
    cartelTitulo: $("cartel-titulo"),
    ficha: $("ficha"),
    svg: $("qr"),
    fondo: $("qr-fondo"),
    trazo: $("qr-trazo"),
    vacio: $("vacio"),
    vacioTexto: $("vacio-texto"),
    revision: $("revision"),
    contenido: $("contenido"),
    avisoTipo: $("aviso-tipo"),
    anuncio: $("anuncio"),
    png: $("bajar-png"),
    svgBtn: $("bajar-svg"),
    imprimir: $("imprimir")
  };

  var estado = {
    tipo: "enlace",
    tocados: {},
    tituloEditado: false,
    primeraVez: true,
    valido: false,
    ultimoAnuncio: "",
    actual: null // { qr, margen, fg, bg }
  };

  /* ---------- Lectura del formulario ---------- */
  function tipoActual() {
    var r = el.form.querySelector('input[name="tipo"]:checked');
    return r ? r.value : "enlace";
  }

  function valores() {
    var v = {};
    var campos = el.form.querySelectorAll("[data-campo]");
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i];
      v[c.id] = c.type === "checkbox" ? c.checked : c.value;
    }
    return v;
  }

  /* ---------- Mensajes de error junto a cada campo ---------- */
  function limpiarErrores() {
    var errores = el.form.querySelectorAll(".error");
    for (var i = 0; i < errores.length; i++) errores[i].textContent = "";
    var invalidos = el.form.querySelectorAll("[aria-invalid]");
    for (var j = 0; j < invalidos.length; j++) invalidos[j].removeAttribute("aria-invalid");
  }

  function mostrarError(campo, mensaje) {
    var caja = $("err-" + campo), control = $(campo);
    if (caja) caja.textContent = mensaje;
    if (control) control.setAttribute("aria-invalid", "true");
  }

  /* ---------- Dibujo ---------- */
  function mostrarFicha(hayCodigo, mensaje) {
    // el svg no tiene la propiedad .hidden de HTML: se usa el atributo
    if (hayCodigo) el.svg.removeAttribute("hidden"); else el.svg.setAttribute("hidden", "");
    el.vacio.hidden = hayCodigo;
    if (!hayCodigo) el.vacioTexto.textContent = mensaje;
  }

  function dibujar(r, margen, fg, bg) {
    var t = r.size + margen * 2;
    el.svg.setAttribute("viewBox", "0 0 " + t + " " + t);
    el.fondo.setAttribute("width", t);
    el.fondo.setAttribute("height", t);
    el.fondo.setAttribute("fill", bg);
    el.trazo.setAttribute("d", QR.trazo(r.modules, margen));
    el.trazo.setAttribute("fill", fg);
  }

  function marca(estadoItem) {
    var s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS(SVG_NS, "use");
    u.setAttribute("href", estadoItem === "ok" ? "#i-ok" : estadoItem === "aviso" ? "#i-aviso" : "#i-mal");
    s.appendChild(u);
    return s;
  }

  function numero(n) {
    return n.toLocaleString("es-CL", { maximumFractionDigits: 1 });
  }

  /* ---------- Revisión: qué tan fácil será leer el código ---------- */
  function revisar(r, margen, fg, bg) {
    var items = [];
    var ratio = Color.contraste(fg, bg);
    if (Color.luminancia(fg) > Color.luminancia(bg)) {
      items.push({ e: "mal", t: "Colores invertidos", d: "Muchas apps no leen códigos claros sobre fondo oscuro. Usa el código oscuro y el fondo claro." });
    } else if (ratio < 3) {
      items.push({ e: "mal", t: "Contraste muy bajo (" + numero(ratio) + " a 1)", d: "Con tan poca diferencia entre los dos colores, el código no se va a leer." });
    } else if (ratio < 5) {
      items.push({ e: "aviso", t: "Contraste justo (" + numero(ratio) + " a 1)", d: "Puede fallar con poca luz o con el brillo de la pantalla bajo. Oscurece el código o aclara el fondo." });
    } else {
      items.push({ e: "ok", t: "Buen contraste (" + numero(ratio) + " a 1)", d: "El código se distingue bien del fondo." });
    }

    if (margen < 4) {
      items.push({ e: "aviso", t: "Margen corto (" + margen + " cuadritos)", d: "Los lectores necesitan un borde libre de 4 cuadritos alrededor. Si queda pegado a otros dibujos o al borde del papel, puede fallar." });
    } else {
      items.push({ e: "ok", t: "Margen correcto (" + margen + " cuadritos)", d: "Deja ese borde libre: sin textos ni dibujos encima." });
    }

    var lado = r.size + " × " + r.size;
    var cm = Math.max(2, Math.ceil(r.size * 0.05 * 2) / 2);
    var medida = "Impreso, que mida al menos " + numero(cm) + " cm de ancho, sin contar el margen. Así cada cuadrito mide 0,5 mm o más.";
    if (r.version <= 10) {
      items.push({ e: "ok", t: "Código sencillo (" + lado + " cuadritos)", d: medida });
    } else {
      items.push({ e: "aviso", t: "Código denso (" + lado + " cuadritos)", d: "Mientras más contenido, más cuadritos y más difícil de leer chico. Si puedes, acorta el texto o usa un enlace corto. " + medida });
    }
    return items;
  }

  function mostrarRevision(items) {
    while (el.revision.firstChild) el.revision.removeChild(el.revision.firstChild);
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.setAttribute("data-estado", it.e);
      var m = document.createElement("span");
      m.className = "revision__marca";
      m.appendChild(marca(it.e));
      var cuerpo = document.createElement("span");
      cuerpo.className = "revision__texto";
      var t = document.createElement("strong");
      t.textContent = it.t;
      var d = document.createElement("span");
      d.textContent = it.d;
      cuerpo.appendChild(t);
      cuerpo.appendChild(d);
      li.appendChild(m);
      li.appendChild(cuerpo);
      el.revision.appendChild(li);
    });
  }

  function acciones(activas) {
    el.png.disabled = !activas;
    el.svgBtn.disabled = !activas;
    el.imprimir.disabled = !activas;
  }

  function anunciar(texto) {
    if (texto === estado.ultimoAnuncio) return;
    estado.ultimoAnuncio = texto;
    el.anuncio.textContent = texto;
  }

  function sinCodigo(mensaje, campo, error) {
    estado.valido = false;
    estado.actual = null;
    mostrarFicha(false, mensaje);
    mostrarRevision([]);
    el.contenido.textContent = "Nada todavía.";
    el.avisoTipo.hidden = true;
    acciones(false);
    if (campo && error) mostrarError(campo, error);
    anunciar("");
  }

  /* ---------- Actualización principal ---------- */
  function actualizar() {
    limpiarErrores();
    var tipo = tipoActual();
    var margen = parseInt(el.margen.value, 10);
    var fg = el.colorCodigo.value, bg = el.colorFondo.value;

    if (!(margen >= 0 && margen <= 10) || String(margen) !== el.margen.value.trim()) {
      sinCodigo("Corrige el margen para ver el código.", "margen", "Escribe un número entero entre 0 y 10.");
      return;
    }

    var res = Payload.construir(tipo, valores());
    if (!res.ok) {
      var visible = !!estado.tocados[res.campo];
      sinCodigo(visible ? "Corrige el dato indicado para ver el código." : "Completa los datos y aquí aparece tu código.", visible ? res.campo : null, res.error);
      return;
    }

    var r;
    try {
      r = QR.encode(res.texto, { ecc: el.nivel.value });
    } catch (e) {
      if (e && e.message === "demasiado-largo") {
        var max = QR.maxBytes(el.nivel.value).toLocaleString("es-CL");
        sinCodigo("Es demasiado contenido para un código QR (máximo " + max + " caracteres con esta corrección). Acórtalo o baja el nivel de corrección.", null, null);
        if (tipo === "enlace") mostrarError("texto", "Es demasiado largo para un código QR. Acórtalo.");
        return;
      }
      sinCodigo("No se pudo generar el código. Revisa los datos.", null, null);
      return;
    }

    estado.valido = true;
    estado.actual = { qr: r, margen: margen, fg: fg, bg: bg };
    dibujar(r, margen, fg, bg);
    mostrarFicha(true, "");
    el.svg.setAttribute("aria-label", "Código QR de tipo " + res.resumen.toLowerCase());

    if (estado.primeraVez) {
      estado.primeraVez = false;
      el.svg.classList.add("qr--entrada");
    }

    mostrarRevision(revisar(r, margen, fg, bg));
    var vista = res.vista.replace(/\r\n/g, "\n");
    if (vista.length > 400) vista = vista.slice(0, 400) + "…";
    el.contenido.textContent = vista;
    el.avisoTipo.hidden = !res.aviso;
    el.avisoTipo.textContent = res.aviso;
    acciones(true);
    anunciar("Código de tipo " + res.resumen.toLowerCase() + " listo.");
  }

  var pendiente = 0;
  function programar() {
    window.clearTimeout(pendiente);
    pendiente = window.setTimeout(actualizar, 60);
  }

  /* ---------- Título del cartel ---------- */
  function pintarTitulo() {
    var t = el.titulo.value.trim();
    el.cartelTitulo.textContent = t;
    el.cartelTitulo.hidden = !t;
  }

  /* ---------- Cambio de tipo ---------- */
  function cambiarTipo() {
    estado.tipo = tipoActual();
    var grupos = el.form.querySelectorAll(".grupo");
    for (var i = 0; i < grupos.length; i++) grupos[i].hidden = grupos[i].getAttribute("data-tipo") !== estado.tipo;
    if (!estado.tituloEditado) {
      el.titulo.value = TITULOS[estado.tipo] || "";
      pintarTitulo();
    }
    actualizar();
    anunciar("");
  }

  function sincronizarWifi() {
    var sin = $("wifi-seguridad").value === "nopass";
    $("campo-wifi-clave").hidden = sin;
  }

  /* ---------- Descargas ---------- */
  function guardar(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  function bajarPng() {
    var a = estado.actual;
    if (!a) return;
    var total = a.qr.size + a.margen * 2;
    var objetivo = parseInt(el.tamano.value, 10) || 1024;
    var escala = Math.max(1, Math.round(objetivo / total));
    var px = escala * total;
    var lienzo = document.createElement("canvas");
    lienzo.width = px;
    lienzo.height = px;
    var g = lienzo.getContext("2d");
    g.fillStyle = a.bg;
    g.fillRect(0, 0, px, px);
    g.fillStyle = a.fg;
    var m = a.qr.modules;
    for (var y = 0; y < a.qr.size; y++) {
      for (var x = 0; x < a.qr.size;) {
        if (m[y][x]) {
          var ini = x;
          while (x < a.qr.size && m[y][x]) x++;
          g.fillRect((ini + a.margen) * escala, (y + a.margen) * escala, (x - ini) * escala, escala);
        } else x++;
      }
    }
    lienzo.toBlob(function (blob) {
      if (blob) guardar(blob, "codigo-qr-" + px + "px.png");
    }, "image/png");
  }

  function bajarSvg() {
    var a = estado.actual;
    if (!a) return;
    var total = a.qr.size + a.margen * 2;
    var texto = QR.toSvg(a.qr.modules, { margen: a.margen, fg: a.fg, bg: a.bg, tamano: total * 10 });
    guardar(new Blob([texto], { type: "image/svg+xml" }), "codigo-qr.svg");
  }

  /* ---------- Valores recomendados ---------- */
  function restablecer() {
    el.nivel.value = "M";
    el.margen.value = "4";
    el.colorCodigo.value = "#000000";
    el.colorFondo.value = "#ffffff";
    el.tamano.value = "1024";
    actualizar();
  }

  /* ---------- Conexión de eventos ---------- */
  el.form.addEventListener("submit", function (e) { e.preventDefault(); });
  el.form.addEventListener("input", function (e) {
    if (e.target === el.titulo) { estado.tituloEditado = true; pintarTitulo(); return; }
    if (e.target.name === "tipo") return;
    programar();
  });
  el.form.addEventListener("change", function (e) {
    if (e.target.name === "tipo") { cambiarTipo(); return; }
    if (e.target.id === "wifi-seguridad") sincronizarWifi();
    if (e.target === el.titulo) return;
    actualizar();
  });
  el.form.addEventListener("focusout", function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute("data-campo")) {
      estado.tocados[t.id] = true;
      actualizar();
    } else if (t === el.margen) {
      actualizar();
    }
  });

  $("wifi-ver").addEventListener("change", function (e) {
    $("wifi-clave").type = e.target.checked ? "text" : "password";
  });
  $("restablecer").addEventListener("click", restablecer);
  el.png.addEventListener("click", bajarPng);
  el.svgBtn.addEventListener("click", bajarSvg);
  el.imprimir.addEventListener("click", function () { window.print(); });

  el.svg.addEventListener("animationend", function () { el.svg.classList.remove("qr--entrada"); });

  /* En la primera visita el texto de ejemplo queda seleccionado: lo que escribas lo reemplaza. */
  var textoEjemplo = $("texto");
  textoEjemplo.addEventListener("focus", function alEnfocar() {
    if (textoEjemplo.value === "https://example.com") textoEjemplo.select();
    textoEjemplo.removeEventListener("focus", alEnfocar);
  });

  /* ---------- Arranque ---------- */
  sincronizarWifi();
  el.titulo.value = TITULOS[estado.tipo];
  pintarTitulo();
  actualizar();
  window.__generadorListo = true;
})();
