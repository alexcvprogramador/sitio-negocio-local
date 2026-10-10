/* Arma la página a partir de assets/js/datos.js.
   Reglas de seguridad de este archivo:
   · Todo texto entra con textContent, nunca como HTML.
   · Todo dato se valida antes de usarse (números, colores, rutas, direcciones).
   · Los enlaces se construyen con partes ya validadas. */
(function () {
  "use strict";

  var raw = window.NEGOCIO || {};
  var avisos = (window.__avisosColor || []).slice();
  var html = document.documentElement;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function molde(id) { return document.getElementById(id).content.firstElementChild.cloneNode(true); }
  function aviso(t) { avisos.push(t); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function limpiar(s) { return String(s).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/ {2,}/g, " ").trim(); }

  /* ------------------------------------------------------------------ */
  /* 1. Validación de los datos                                          */
  /* ------------------------------------------------------------------ */
  function txt(v, max, defecto, ruta, obligatorio) {
    if (v === undefined || v === null || v === "") {
      if (obligatorio) aviso("Falta «" + ruta + "» en datos.js.");
      return defecto;
    }
    if (typeof v !== "string") { aviso("«" + ruta + "» debe ir entre comillas."); return defecto; }
    var s = limpiar(v);
    if (s.length > max) { aviso("«" + ruta + "» es muy largo (máximo " + max + " letras). Se recortó."); s = s.slice(0, max).trim(); }
    return s;
  }

  var ICONOS = ["torta", "rebanada", "cupcake", "galleta", "pan", "berlin", "alfajor", "taza", "caja", "bolsa", "tijera", "llave", "martillo", "engranaje", "estrella", "etiqueta"];
  function icono(v, ruta) {
    if (ICONOS.indexOf(v) >= 0) return v;
    if (v !== undefined && v !== "") aviso("El ícono «" + String(v).slice(0, 20) + "» de " + ruta + " no existe. Opciones: " + ICONOS.join(", ") + ".");
    return "etiqueta";
  }
  var RUTA_IMG = /^assets\/img\/[A-Za-z0-9_.\-]+\.(webp|jpg|jpeg|png|avif|gif)$/i;
  function imagen(v, ruta) {
    if (!v) return "";
    if (typeof v === "string" && RUTA_IMG.test(v)) return v;
    aviso("La foto de " + ruta + " debe estar en assets/img y llamarse así: assets/img/nombre.webp (también .jpg o .png).");
    return "";
  }
  function urlHttps(v, ruta) {
    if (!v) return "";
    try { var u = new URL(String(v)); if (u.protocol === "https:") return u.href; } catch (e) { /* cae al aviso */ }
    aviso("«" + ruta + "» debe ser una dirección que empiece con https://");
    return "";
  }

  var DIAS = [["lunes", "Lunes", "Monday"], ["martes", "Martes", "Tuesday"], ["miercoles", "Miércoles", "Wednesday"], ["jueves", "Jueves", "Thursday"],
              ["viernes", "Viernes", "Friday"], ["sabado", "Sábado", "Saturday"], ["domingo", "Domingo", "Sunday"]];

  function tramos(lista, dia) {
    var out = [];
    if (lista === undefined) return out;
    if (!Array.isArray(lista)) { aviso("El horario de " + dia + " debe ser una lista, por ejemplo [\"09:00-19:00\"] o [] si cierra."); return out; }
    lista.forEach(function (t) {
      var m = typeof t === "string" ? /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(t.replace(/\s/g, "")) : null;
      if (!m) { aviso("El tramo «" + String(t).slice(0, 14) + "» de " + dia + " no sirve. Escríbelo así: \"09:00-19:00\"."); return; }
      var h1 = +m[1], m1 = +m[2], h2 = +m[3], m2 = +m[4];
      if (h1 > 23 || m1 > 59 || h2 > 24 || m2 > 59 || (h2 === 24 && m2 !== 0)) { aviso("El tramo «" + t + "» de " + dia + " tiene una hora que no existe."); return; }
      var a = h1 * 60 + m1, b = h2 * 60 + m2;
      if (b <= a) { aviso("El tramo «" + t + "» de " + dia + " termina antes de empezar. Si pasa de medianoche, divídelo en dos días."); return; }
      out.push([a, b]);
    });
    out.sort(function (x, y) { return x[0] - y[0]; });
    var unido = [];
    out.forEach(function (r) {
      var u = unido[unido.length - 1];
      if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]); else unido.push([r[0], r[1]]);
    });
    return unido;
  }

  var N = {};
  N.demo = raw.demo === true;
  N.nombre = txt(raw.nombre, 40, "Mi negocio", "nombre", true);
  N.rubro = txt(raw.rubro, 60, "", "rubro");
  N.ciudad = txt(raw.ciudad, 40, "", "ciudad");
  N.titular = txt(raw.titular, 110, N.nombre, "titular");
  N.bajada = txt(raw.bajada, 240, "", "bajada");
  N.notaCatalogo = txt(raw.notaCatalogo, 200, "", "notaCatalogo");
  N.notaHorario = txt(raw.notaHorario, 200, "", "notaHorario");
  N.direccion = txt(raw.direccion, 120, "", "direccion");
  N.referencia = txt(raw.referencia, 140, "", "referencia");
  N.mapa = txt(raw.mapa, 140, N.direccion || N.ciudad, "mapa");

  var portada = (raw.portada && typeof raw.portada === "object") ? raw.portada : {};
  N.portadaIconos = [0, 1, 2].map(function (i) { return icono((portada.iconos || [])[i] || ["torta", "rebanada", "cupcake"][i], "la portada"); });
  N.portadaFoto = imagen(portada.foto, "la portada");
  N.portadaFotoAlt = txt(portada.fotoAlt, 140, "", "portada.fotoAlt");

  var wa = String(raw.whatsapp === undefined ? "" : raw.whatsapp).replace(/[\s+()\-]/g, "");
  if (/^9\d{8}$/.test(wa)) wa = "56" + wa;
  if (wa && !/^\d{8,15}$/.test(wa)) { aviso("El WhatsApp debe tener solo números, con código de país y sin el +. Ejemplo: 56912345678."); wa = ""; }
  if (!wa) aviso("Falta el número de WhatsApp: sin él no funcionan los botones de pedido.");
  N.whatsapp = wa;

  var correo = typeof raw.correo === "string" ? raw.correo.trim() : "";
  if (correo && !/^[^\s@<>"'`]+@[^\s@<>"'`]+\.[A-Za-z]{2,}$/.test(correo)) { aviso("El correo no parece válido."); correo = ""; }
  N.correo = correo.slice(0, 80);
  var ig = typeof raw.instagram === "string" ? raw.instagram.trim().replace(/^@/, "") : "";
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) { aviso("El usuario de Instagram solo puede tener letras, números, punto y guion bajo."); ig = ""; }
  N.instagram = ig;
  var fb = typeof raw.facebook === "string" ? raw.facebook.trim() : "";
  if (fb && !/^[A-Za-z0-9.\-]{3,60}$/.test(fb)) { aviso("El nombre de la página de Facebook no es válido (solo letras, números, punto y guion)."); fb = ""; }
  N.facebook = fb;

  var zona = typeof raw.zonaHoraria === "string" ? raw.zonaHoraria : "America/Santiago";
  try { new Intl.DateTimeFormat("en-US", { timeZone: zona }); } catch (e) { aviso("La zona horaria «" + zona.slice(0, 30) + "» no existe. Se usa America/Santiago."); zona = "America/Santiago"; }
  N.zona = zona;
  var hr = (raw.horario && typeof raw.horario === "object") ? raw.horario : {};
  N.horario = DIAS.map(function (d) { return tramos(hr[d[0]], d[1]); });
  N.hayHorario = N.horario.some(function (d) { return d.length > 0; });
  if (!N.hayHorario) aviso("No hay ningún horario cargado: el letrero dirá que no hay horario.");

  N.puntos = (Array.isArray(raw.puntos) ? raw.puntos : []).slice(0, 3).map(function (p, i) {
    return { titulo: txt(p && p.titulo, 40, "", "puntos[" + (i + 1) + "].titulo"), texto: txt(p && p.texto, 80, "", "puntos[" + (i + 1) + "].texto") };
  }).filter(function (p) { return p.titulo; });

  var cats = [];
  (Array.isArray(raw.categorias) ? raw.categorias : []).slice(0, 12).forEach(function (c, i) {
    var id = txt(c && c.id, 30, "", "categorias[" + (i + 1) + "].id");
    var nombre = txt(c && c.nombre, 40, "", "categorias[" + (i + 1) + "].nombre");
    if (id && nombre) cats.push({ id: id, nombre: nombre, n: 0 });
    else aviso("La categoría " + (i + 1) + " necesita id y nombre.");
  });

  var usados = {};
  var prods = [];
  (Array.isArray(raw.productos) ? raw.productos : []).slice(0, 200).forEach(function (p, i) {
    var ruta = "el producto " + (i + 1);
    if (!p || typeof p !== "object") { aviso("El producto " + (i + 1) + " está mal escrito."); return; }
    var nombre = txt(p.nombre, 70, "", ruta + " (nombre)", true);
    if (!nombre) return;
    var id = norm(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "p" + i;
    if (usados[id]) id += "-" + i;
    usados[id] = true;
    var cat = null;
    cats.forEach(function (c) { if (c.id === p.categoria) cat = c; });
    if (!cat) {
      aviso("«" + nombre + "»: su categoría «" + String(p.categoria).slice(0, 20) + "» no está en la lista de categorías. Quedó en «Otros».");
      cat = cats.filter(function (c) { return c.id === "otros"; })[0];
      if (!cat) { cat = { id: "otros", nombre: "Otros", n: 0 }; cats.push(cat); }
    }
    var precio = null;
    if (p.precio !== undefined && p.precio !== null && p.precio !== "" && p.precio !== 0) {
      if (typeof p.precio === "number" && isFinite(p.precio) && p.precio > 0 && p.precio < 1e8) precio = Math.round(p.precio);
      else aviso("El precio de «" + nombre + "» debe ser un número sin $ ni puntos (por ejemplo 12900).");
    }
    cat.n++;
    prods.push({
      id: id, cat: cat, nombre: nombre, desc: txt(p.descripcion, 160, "", ruta + " (descripcion)"), precio: precio, desde: p.desde === true,
      unidad: txt(p.unidad, 20, "", ruta + " (unidad)"), etiqueta: txt(p.etiqueta, 18, "", ruta + " (etiqueta)"),
      icono: icono(p.icono, "«" + nombre + "»"), foto: imagen(p.foto, "«" + nombre + "»")
    });
  });
  if (!prods.length) aviso("No hay productos en el catálogo.");
  cats = cats.filter(function (c) { return c.n > 0; });

  N.entrega = (Array.isArray(raw.entrega) ? raw.entrega : []).slice(0, 4).map(function (e) { return txt(e, 40, "", "entrega"); }).filter(Boolean);
  N.pasos = (Array.isArray(raw.pasos) ? raw.pasos : []).slice(0, 4).map(function (p, i) {
    return { titulo: txt(p && p.titulo, 50, "", "pasos[" + (i + 1) + "].titulo"), texto: txt(p && p.texto, 200, "", "pasos[" + (i + 1) + "].texto") };
  }).filter(function (p) { return p.titulo; });
  N.preguntas = (Array.isArray(raw.preguntas) ? raw.preguntas : []).slice(0, 12).map(function (p, i) {
    return { p: txt(p && p.pregunta, 120, "", "preguntas[" + (i + 1) + "].pregunta"), r: txt(p && p.respuesta, 500, "", "preguntas[" + (i + 1) + "].respuesta") };
  }).filter(function (p) { return p.p && p.r; });
  var cr = (raw.creditos && typeof raw.creditos === "object") ? raw.creditos : {};
  N.creditos = { texto: txt(cr.texto, 120, "", "creditos.texto"), enlace: urlHttps(cr.enlace, "creditos.enlace") };
  var TIPOS = ["LocalBusiness", "Bakery", "Restaurant", "CafeOrCoffeeShop", "HairSalon", "BeautySalon", "AutoRepair", "HardwareStore", "Store"];
  N.tipo = TIPOS.indexOf(raw.tipoNegocio) >= 0 ? raw.tipoNegocio : "LocalBusiness";

  /* ------------------------------------------------------------------ */
  /* 2. Utilidades                                                       */
  /* ------------------------------------------------------------------ */
  var fmtPesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  function clp(n) { return fmtPesos.format(n); }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }
  function telVisible(d) { var m = /^56(9)(\d{4})(\d{4})$/.exec(d); return m ? "+56 9 " + m[2] + " " + m[3] : "+" + d; }
  function waUrl(texto) { return "https://wa.me/" + N.whatsapp + "?text=" + encodeURIComponent(texto); }
  function siglas(nombre) {
    var libres = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, y: 1, e: 1 };
    var pal = nombre.split(" ").filter(function (w) { return w && !libres[norm(w)]; });
    if (!pal.length) return nombre.charAt(0).toUpperCase();
    if (pal.length === 1) return pal[0].charAt(0).toUpperCase();
    return (pal[0].charAt(0) + pal[1].charAt(0)).toUpperCase();
  }
  N.siglas = siglas(N.nombre);
  N.msgConsulta = "Hola " + N.nombre + ", vi su sitio web y quiero hacer una consulta.";
  N.msgPedido = "Hola " + N.nombre + ", quiero hacer este pedido:";

  function usar(svg, id) { svg.querySelector("use").setAttribute("href", "#i-" + id); }

  /* ------------------------------------------------------------------ */
  /* 3. Textos fijos, título y portada                                   */
  /* ------------------------------------------------------------------ */
  $$("[data-campo]").forEach(function (el) {
    var c = el.getAttribute("data-campo");
    var v = N[c];
    if (typeof v !== "string") return;
    el.textContent = v;
    if (!v && (c === "rubro" || c === "referencia" || c === "notaCatalogo" || c === "notaHorario" || c === "direccion" || c === "bajada")) el.hidden = true;
  });
  document.title = N.nombre + (N.rubro ? ", " + N.rubro.toLowerCase() : "") + (N.ciudad ? " en " + N.ciudad : "");
  var meta = $('meta[name="description"]');
  if (meta && (N.bajada || N.titular)) meta.setAttribute("content", N.bajada || N.titular);
  var tema = $('meta[name="theme-color"]');
  if (tema && window.__colores) tema.setAttribute("content", window.__colores.principal);
  if (N.demo) {
    $("#franja-demo").hidden = false;
    var robots = document.createElement("meta");
    robots.name = "robots"; robots.content = "noindex";
    document.head.appendChild(robots);
  }
  var pieRubro = $(".pie__rubro");
  if (!N.rubro && !N.ciudad) pieRubro.hidden = true;
  else if (!N.rubro || !N.ciudad) pieRubro.textContent = N.rubro || N.ciudad;

  var arte = $("#portada-arte");
  if (N.portadaFoto) {
    var img = document.createElement("img");
    img.className = "portada__foto";
    img.src = N.portadaFoto; img.alt = N.portadaFotoAlt; img.width = 900; img.height = 900; img.decoding = "async";
    arte.textContent = "";
    arte.appendChild(img);
    if (N.portadaFotoAlt) arte.removeAttribute("aria-hidden");
  } else {
    $$(".disco .ico", arte).forEach(function (svg, i) { usar(svg, N.portadaIconos[i]); });
  }

  var waLinks = $$("[data-whatsapp]");
  waLinks.forEach(function (a) { if (N.whatsapp) { a.setAttribute("href", waUrl(N.msgConsulta)); a.hidden = false; } });

  var puntos = $("#puntos");
  N.puntos.forEach(function (p) {
    var li = molde("t-punto");
    $(".punto__titulo", li).textContent = p.titulo;
    if (p.texto) $(".punto__texto", li).textContent = p.texto; else $(".punto__texto", li).remove();
    puntos.appendChild(li);
  });
  if (!N.puntos.length) puntos.hidden = true;

  /* ------------------------------------------------------------------ */
  /* 4. Catálogo                                                         */
  /* ------------------------------------------------------------------ */
  var lista = $("#lista"), filtrosEl = $("#filtros"), buscador = $("#buscador"), buscar = $("#buscar"), conteo = $("#conteo"), vacio = $("#vacio");
  var filtroCat = "", textoBusca = "";
  var porId = {};

  cats.forEach(function (c, ci) {
    var g = molde("t-grupo");
    g.setAttribute("data-cat", c.id);
    $(".grupo__titulo", g).textContent = c.nombre;
    var ul = $(".carta", g);
    prods.filter(function (p) { return p.cat === c; }).forEach(function (p) {
      var li = molde("t-producto");
      li.classList.add("plato--c" + (ci % 4));
      li.setAttribute("data-id", p.id);
      $(".plato__nombre", li).textContent = p.nombre;
      if (p.desc) $(".plato__desc", li).textContent = p.desc; else $(".plato__desc", li).remove();
      var precio = $(".plato__precio", li);
      if (p.precio === null) precio.textContent = "Consultar";
      else {
        precio.textContent = (p.desde ? "desde " : "") + clp(p.precio);
        if (p.unidad) { var u = document.createElement("small"); u.textContent = p.unidad; precio.appendChild(u); }
      }
      if (p.etiqueta) { var et = $(".plato__etiqueta", li); et.textContent = p.etiqueta; et.hidden = false; }
      var cont = $(".plato__imagen", li);
      if (p.foto) {
        var im = document.createElement("img");
        im.src = p.foto; im.alt = ""; im.width = 96; im.height = 96; im.loading = "lazy"; im.decoding = "async";
        cont.textContent = ""; cont.appendChild(im);
      } else usar($(".ico", cont), p.icono);
      $(".cantidad__mas", li).setAttribute("aria-label", "Sumar " + p.nombre + " a la caja");
      $(".cantidad__menos", li).setAttribute("aria-label", "Quitar uno de " + p.nombre);
      p.el = li; porId[p.id] = p;
      ul.appendChild(li);
    });
    c.el = g;
    lista.appendChild(g);
  });

  if (cats.length > 1) {
    var todos = molde("t-filtro"); todos.textContent = "Todo"; todos.setAttribute("data-cat", ""); todos.setAttribute("aria-pressed", "true");
    filtrosEl.appendChild(todos);
    cats.forEach(function (c) { var b = molde("t-filtro"); b.textContent = c.nombre; b.setAttribute("data-cat", c.id); filtrosEl.appendChild(b); });
  } else filtrosEl.hidden = true;
  if (prods.length > 10) buscador.hidden = false;
  if (filtrosEl.hidden && buscador.hidden) $("#herramientas").hidden = true;
  if (!prods.length) { $("#catalogo .envoltura").appendChild(vacio); }

  function aplicarFiltros() {
    var q = norm(textoBusca), visibles = 0;
    prods.forEach(function (p) {
      var ok = (!filtroCat || p.cat.id === filtroCat) && (!q || norm(p.nombre + " " + p.desc + " " + p.etiqueta).indexOf(q) >= 0);
      p.el.hidden = !ok;
      if (ok) visibles++;
    });
    cats.forEach(function (c) { c.el.hidden = !prods.some(function (p) { return p.cat === c && !p.el.hidden; }); });
    vacio.hidden = visibles > 0 || !prods.length;
    conteo.textContent = (filtroCat || q) ? (visibles === 1 ? "Se muestra 1 producto." : "Se muestran " + visibles + " productos.") : "";
  }
  filtrosEl.addEventListener("click", function (e) {
    var b = e.target.closest(".filtro"); if (!b) return;
    filtroCat = b.getAttribute("data-cat");
    $$(".filtro", filtrosEl).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    aplicarFiltros();
  });
  buscar.addEventListener("input", function () { textoBusca = buscar.value.slice(0, 40); aplicarFiltros(); });

  /* ------------------------------------------------------------------ */
  /* 5. Caja (pedido)                                                    */
  /* ------------------------------------------------------------------ */
  var caja = {};
  var CLAVE = "negocio-caja-v1";
  try {
    var guardada = JSON.parse(sessionStorage.getItem(CLAVE) || "{}");
    Object.keys(guardada).forEach(function (id) {
      var n = guardada[id];
      if (porId[id] && typeof n === "number" && n >= 1 && n <= 99 && n === Math.floor(n)) caja[id] = n;
    });
  } catch (e) { /* sin almacenamiento: la caja vive solo mientras la página está abierta */ }

  var dlg = $("#caja"), barra = $("#barra-caja"), flotante = $("#flotante"), enviar = $("#caja-enviar"), listaCaja = $("#caja-lista");
  var anuncio = document.createElement("p");
  anuncio.className = "solo-lector"; anuncio.setAttribute("role", "status");
  document.body.appendChild(anuncio);

  function items() { return prods.filter(function (p) { return caja[p.id]; }); }
  function cantidadTotal() { return items().reduce(function (s, p) { return s + caja[p.id]; }, 0); }
  function totalPesos() { return items().reduce(function (s, p) { return s + (p.precio ? p.precio * caja[p.id] : 0); }, 0); }
  function porCotizar() { return items().some(function (p) { return !p.precio; }); }

  function mensajePedido() {
    var L = [N.msgPedido];
    items().forEach(function (p) {
      L.push("• " + caja[p.id] + " × " + p.nombre + (p.precio ? " (" + clp(p.precio * caja[p.id]) + ")" : " (precio por confirmar)"));
    });
    L.push("");
    L.push("Total: " + clp(totalPesos()) + (porCotizar() ? " más los productos por confirmar" : ""));
    var nombre = limpiar($("#c-nombre").value).slice(0, 40), cuando = limpiar($("#c-cuando").value).slice(0, 60);
    var sel = $('input[name="entrega"]:checked');
    if (nombre) L.push("Nombre: " + nombre);
    if (cuando) L.push("Para: " + cuando);
    if (sel) L.push("Entrega: " + sel.value);
    return L.join("\n");
  }

  function pintarCaja() {
    var cant = cantidadTotal();
    prods.forEach(function (p) {
      var c = $(".cantidad", p.el), n = caja[p.id] || 0;
      c.setAttribute("data-vacio", n ? "false" : "true");
      $(".cantidad__valor", c).textContent = n;
    });
    barra.hidden = cant === 0;
    flotante.hidden = cant > 0 || !N.whatsapp;
    html.classList.toggle("con-barra", cant > 0);
    $("#barra-cant").textContent = cant === 1 ? "1 producto en tu caja" : cant + " productos en tu caja";
    $("#barra-total").textContent = clp(totalPesos()) + (porCotizar() ? " y más" : "");

    listaCaja.textContent = "";
    items().forEach(function (p) {
      var li = molde("t-linea");
      li.setAttribute("data-id", p.id);
      $(".linea__nombre", li).textContent = p.nombre;
      $(".linea__precio", li).textContent = p.precio ? clp(p.precio) + " c/u, " + clp(p.precio * caja[p.id]) : "Precio por confirmar";
      $(".cantidad__valor", li).textContent = caja[p.id];
      $(".cantidad__mas", li).setAttribute("aria-label", "Sumar uno de " + p.nombre);
      $(".cantidad__menos", li).setAttribute("aria-label", "Quitar uno de " + p.nombre);
      listaCaja.appendChild(li);
    });
    $("#caja-vacia").hidden = cant > 0;
    $("#caja-datos").hidden = cant === 0;
    $("#caja-vaciar").hidden = cant === 0;
    $("#caja-total").textContent = clp(totalPesos());
    var nota = "";
    if (!N.whatsapp) nota = "Falta el número de WhatsApp del negocio (datos.js).";
    else if (porCotizar()) nota = "Hay productos sin precio. Te confirmamos el total por WhatsApp.";
    $("#caja-nota").textContent = nota;
    var activo = cant > 0 && !!N.whatsapp;
    enviar.setAttribute("aria-disabled", activo ? "false" : "true");
    if (activo) enviar.setAttribute("href", waUrl(mensajePedido())); else enviar.removeAttribute("href");
    try { sessionStorage.setItem(CLAVE, JSON.stringify(caja)); } catch (e) { /* sin almacenamiento */ }
  }

  function cambiar(id, delta) {
    var p = porId[id]; if (!p) return;
    var n = Math.max(0, Math.min(99, (caja[id] || 0) + delta));
    if (n) caja[id] = n; else delete caja[id];
    pintarCaja();
    if (delta > 0) { barra.removeAttribute("data-pulso"); void barra.offsetWidth; barra.setAttribute("data-pulso", "true"); }
    anuncio.textContent = (delta > 0 ? "Sumaste " : "Quitaste ") + p.nombre + ". En tu caja: " + cantidadTotal() + (cantidadTotal() === 1 ? " producto." : " productos.");
  }
  function clickCantidad(e) {
    var b = e.target.closest("button"); if (!b) return;
    var fila = b.closest("[data-id]"); if (!fila) return;
    if (b.classList.contains("cantidad__mas")) cambiar(fila.getAttribute("data-id"), 1);
    else if (b.classList.contains("cantidad__menos")) cambiar(fila.getAttribute("data-id"), -1);
  }
  lista.addEventListener("click", clickCantidad);
  listaCaja.addEventListener("click", clickCantidad);

  var entregaEl = $("#c-entrega");
  N.entrega.forEach(function (t, i) {
    var o = molde("t-opcion");
    var inp = $("input", o); inp.value = t; if (i === 0) inp.checked = true;
    $("span", o).textContent = t;
    entregaEl.appendChild(o);
  });
  if (!N.entrega.length) entregaEl.hidden = true;
  ["#c-nombre", "#c-cuando"].forEach(function (s) { $(s).addEventListener("input", pintarCaja); });
  entregaEl.addEventListener("change", pintarCaja);

  function abrirCaja() {
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function cerrarCaja() { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  barra.addEventListener("click", abrirCaja);
  $("#caja-cerrar").addEventListener("click", cerrarCaja);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrarCaja(); });
  $("#caja-vaciar").addEventListener("click", function () { caja = {}; pintarCaja(); anuncio.textContent = "Vaciaste tu caja."; });
  enviar.addEventListener("click", function (e) { if (enviar.getAttribute("aria-disabled") === "true") e.preventDefault(); });

  /* ------------------------------------------------------------------ */
  /* 6. Cómo pedir, preguntas, horarios, ubicación, contacto             */
  /* ------------------------------------------------------------------ */
  var pasosEl = $("#pasos");
  N.pasos.forEach(function (p) {
    var li = molde("t-paso");
    $(".paso__titulo", li).textContent = p.titulo;
    if (p.texto) $(".paso__texto", li).textContent = p.texto; else $(".paso__texto", li).remove();
    pasosEl.appendChild(li);
  });
  if (!N.pasos.length) $("#pedir").hidden = true;

  var pregEl = $("#preguntas-lista");
  N.preguntas.forEach(function (p) {
    var d = molde("t-pregunta");
    $(".pregunta__texto", d).textContent = p.p;
    $(".pregunta__respuesta", d).textContent = p.r;
    pregEl.appendChild(d);
  });
  if (!N.preguntas.length) $("#preguntas").hidden = true;

  var filas = [];
  var tabla = $("#tabla-horario");
  DIAS.forEach(function (d, i) {
    var tr = molde("t-dia");
    $("th", tr).textContent = d[1];
    $("td", tr).textContent = N.horario[i].length ? N.horario[i].map(function (r) { return hhmm(r[0]) + " a " + hhmm(r[1]); }).join(" y ") : "Cerrado";
    tabla.appendChild(tr);
    filas.push(tr);
  });
  if (!N.hayHorario) $(".tabla-horario").hidden = true;

  function ahora() {
    var partes = new Intl.DateTimeFormat("en-US", { timeZone: N.zona, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    var nombre = "", h = 0, m = 0;
    partes.forEach(function (p) {
      if (p.type === "weekday") nombre = p.value;
      if (p.type === "hour") h = (+p.value) % 24;
      if (p.type === "minute") m = +p.value;
    });
    var dia = 0;
    DIAS.forEach(function (d, i) { if (d[2] === nombre) dia = i; });
    return { dia: dia, min: h * 60 + m };
  }
  function cierre(dia, fin) {
    // Si un tramo termina a las 24:00 y el día siguiente abre a las 00:00, el cierre real es más tarde.
    var d = dia, f = fin, vueltas = 0;
    while (f === 1440 && vueltas < 7) {
      d = (d + 1) % 7; vueltas++;
      var sig = N.horario[d][0];
      if (sig && sig[0] === 0) f = sig[1]; else break;
    }
    return f;
  }
  function estado() {
    if (!N.hayHorario) return { abierto: false, corto: "Cerrado", detalle: "sin horario cargado", largo: "Todavía no hay un horario cargado.", dia: 0 };
    var a = ahora(), hoy = N.horario[a.dia], i, r;
    for (i = 0; i < hoy.length; i++) {
      r = hoy[i];
      if (a.min >= r[0] && a.min < r[1]) {
        var hasta = hhmm(cierre(a.dia, r[1]));
        return { abierto: true, corto: "Abierto", detalle: "hasta las " + hasta, largo: "Estamos abiertos ahora, hasta las " + hasta + ".", dia: a.dia };
      }
    }
    var cuando = "";
    for (i = 0; i < hoy.length; i++) if (hoy[i][0] > a.min) { cuando = "hoy a las " + hhmm(hoy[i][0]); break; }
    if (!cuando) {
      for (var k = 1; k <= 7; k++) {
        var d = (a.dia + k) % 7;
        if (N.horario[d].length) { cuando = (k === 1 ? "mañana" : "el " + DIAS[d][1].toLowerCase()) + " a las " + hhmm(N.horario[d][0][0]); break; }
      }
    }
    return { abierto: false, corto: "Cerrado", detalle: "abre " + cuando, largo: "Ahora estamos cerrados. Abrimos " + cuando + ".", dia: a.dia };
  }

  var letrero = $("#letrero"), mini = $("#estado-mini"), ultimo = "";
  function pintarEstado() {
    var e = estado();
    var firma = e.corto + "|" + e.detalle + "|" + e.dia;
    if (firma === ultimo) return;
    ultimo = firma;
    letrero.setAttribute("data-abierto", e.abierto ? "true" : "false");
    mini.setAttribute("data-abierto", e.abierto ? "true" : "false");
    $("#letrero-estado").textContent = e.corto;
    $("#letrero-detalle").textContent = e.detalle;
    mini.textContent = e.corto;
    $("#horarios-estado").textContent = e.largo;
    filas.forEach(function (tr, i) {
      var th = $("th", tr), marca = $(".hoy-marca", th);
      var esHoy = i === e.dia && N.hayHorario;
      tr.classList.toggle("hoy", esHoy);
      if (esHoy) { tr.setAttribute("aria-current", "date"); if (!marca) { marca = document.createElement("span"); marca.className = "hoy-marca"; marca.textContent = "hoy"; th.appendChild(marca); } }
      else { tr.removeAttribute("aria-current"); if (marca) marca.remove(); }
    });
  }
  pintarEstado();
  setInterval(pintarEstado, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pintarEstado(); });

  var gmaps = $("#mapa-google"), waze = $("#mapa-waze");
  if (N.mapa) {
    gmaps.setAttribute("href", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(N.mapa));
    waze.setAttribute("href", "https://waze.com/ul?q=" + encodeURIComponent(N.mapa) + "&navigate=yes");
    gmaps.hidden = false; waze.hidden = false;
  }
  if (!N.direccion && !N.mapa) $("#ubicacion").hidden = true;

  var contactos = $("#contactos");
  function contacto(rotulo, valor, href) {
    var li = molde("t-contacto"), a = $("a", li);
    $(".contacto__rotulo", li).textContent = rotulo;
    $(".contacto__valor", li).textContent = valor;
    if (href) { a.setAttribute("href", href); if (/^https/.test(href)) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); } }
    contactos.appendChild(li);
  }
  if (N.whatsapp) contacto("WhatsApp", telVisible(N.whatsapp), waUrl(N.msgConsulta));
  if (N.correo) contacto("Correo", N.correo, "mailto:" + N.correo);
  if (N.instagram) contacto("Instagram", "@" + N.instagram, "https://www.instagram.com/" + encodeURIComponent(N.instagram) + "/");
  if (N.facebook) contacto("Facebook", N.facebook, "https://www.facebook.com/" + encodeURIComponent(N.facebook));
  if (N.direccion) contacto("Dirección", N.direccion, "");
  if (!contactos.children.length) contactos.hidden = true;

  var creditos = $("#creditos");
  if (N.creditos.texto) {
    if (N.creditos.enlace) {
      var a = document.createElement("a");
      a.href = N.creditos.enlace; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = N.creditos.texto;
      creditos.appendChild(a);
    } else creditos.textContent = N.creditos.texto;
  } else creditos.hidden = true;

  /* ------------------------------------------------------------------ */
  /* 7. Cabecera, menú y sección activa                                  */
  /* ------------------------------------------------------------------ */
  var cabecera = $("#cabecera"), ham = $("#hamburguesa"), menu = $("#menu");
  function menuAbierto(abrir) {
    cabecera.classList.toggle("cabecera--abierta", abrir);
    ham.setAttribute("aria-expanded", abrir ? "true" : "false");
    ham.setAttribute("aria-label", abrir ? "Cerrar el menú" : "Abrir el menú");
  }
  ham.addEventListener("click", function () { menuAbierto(!cabecera.classList.contains("cabecera--abierta")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) menuAbierto(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && cabecera.classList.contains("cabecera--abierta")) { menuAbierto(false); ham.focus(); } });

  var tick = false;
  function alDesplazar() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { cabecera.classList.toggle("cabecera--fija", window.scrollY > 60); tick = false; });
  }
  window.addEventListener("scroll", alDesplazar, { passive: true });
  alDesplazar();

  if ("IntersectionObserver" in window) {
    var enlaces = {};
    $$("a", menu).forEach(function (a) { enlaces[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var a = enlaces[en.target.id]; if (!a) return;
        if (en.isIntersecting) { $$("a", menu).forEach(function (x) { x.removeAttribute("aria-current"); }); a.setAttribute("aria-current", "true"); }
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["catalogo", "pedir", "horarios", "preguntas"].forEach(function (id) { var s = document.getElementById(id); if (s && !s.hidden) obs.observe(s); });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Datos para Google (solo cuando el sitio ya no es una demo)        */
  /* ------------------------------------------------------------------ */
  function datosParaGoogle() {
    if (N.demo) return;
    var o = { "@context": "https://schema.org", "@type": N.tipo, name: N.nombre };
    if (N.bajada || N.titular) o.description = N.bajada || N.titular;
    if (N.direccion) o.address = { "@type": "PostalAddress", streetAddress: N.direccion, addressLocality: N.ciudad, addressCountry: "CL" };
    if (N.whatsapp) o.telephone = "+" + N.whatsapp;
    if (N.correo) o.email = N.correo;
    var spec = [];
    N.horario.forEach(function (rangos, i) {
      rangos.forEach(function (r) { spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: DIAS[i][2], opens: hhmm(r[0]), closes: r[1] >= 1440 ? "23:59" : hhmm(r[1]) }); });
    });
    if (spec.length) o.openingHoursSpecification = spec;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    var texto = JSON.stringify(o);
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        s.textContent = window.trustedTypes.createPolicy("datos-estructurados", { createScript: function (x) { return x; } }).createScript(texto);
      } else s.textContent = texto;
      document.head.appendChild(s);
    } catch (e) { /* si el navegador no lo permite, el sitio funciona igual */ }
  }
  datosParaGoogle();

  /* ------------------------------------------------------------------ */
  /* 9. Avisos para quien edita (solo en el computador)                  */
  /* ------------------------------------------------------------------ */
  var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.localhost$/.test(location.hostname);
  if (local && avisos.length) {
    var ul = $("#avisos-lista");
    avisos.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
    $("#avisos").hidden = false;
    if (window.console && console.warn) console.warn("Avisos de datos.js:\n- " + avisos.join("\n- "));
  }

  pintarCaja();
  aplicarFiltros();

  /* ------------------------------------------------------------------ */
  /* 10. Pantalla de carga                                               */
  /* ------------------------------------------------------------------ */
  window.__sitioListo = true;
  (function pantallaDeCarga() {
    if (html.classList.contains("cargado")) return;
    var MIN = 1400, MAX = 3800, t0 = performance.now(), listo = false;
    function salir() {
      if (listo) return; listo = true;
      setTimeout(function () { html.classList.add("cargado"); }, Math.max(0, MIN - (performance.now() - t0)));
    }
    var cargada = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r, { once: true }); });
    var fuentes = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([cargada, fuentes]).then(salir);
    setTimeout(salir, MAX);
  })();
})();
