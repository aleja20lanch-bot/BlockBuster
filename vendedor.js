firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
// =====================
// 🧠 HELPERS
// =====================
function mostrar(id, display) {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}



// =====================
// 🔐 LOGIN
// =====================
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // 🔥 asegurar persistencia
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      return auth.signInWithEmailAndPassword(email, password);
    })
    .then(userCredential => {
      mostrarMensaje("Bienvenido 🎬");

      // ⚠️ NO llames obtenerRol aquí
      // lo hará onAuthStateChanged automáticamente
    })
    .catch(() => {
      mostrarMensaje("Error al iniciar sesión");
    });
}
auth.onAuthStateChanged(user => {
  if (user) {

    mostrar("login", "none");
    mostrar("app", "block");

    obtenerRol(user.uid);
    cargarCategoriasProductos(); 

  } else {

    mostrar("login", "block");
    mostrar("app", "none");
  }
});
// =====================
// 👤 ROL
// =====================
function obtenerRol(uid) {
  db.collection("usuarios")
    .doc(uid)
    .get()
    .then(doc => {
      if (!doc.exists) {
        console.log("Usuario no encontrado");
        return;
      }

      const rol = doc.data().rol;
      setRol(rol);
    });
}

function setRol(rol) {

  console.log("ROL DESDE FIREBASE:", rol);

  rol = rol?.toLowerCase();

  mostrar("login", "none");
  mostrar("admin", "none");
  mostrar("ventas", "none");

  if (rol === "admin") {
    mostrar("admin", "flex");

    // cargar primera vista
    mostrarSeccion("inventario");
  }

  if (rol === "vendedor") {
    mostrar("ventas", "grid");
  }

  mostrar("btnLogout", "block");
}
// =====================
// 🚪 LOGOUT
// =====================
function logout() {
  auth.signOut().then(() => {

    mostrarMensaje("Sesión cerrada");

    // 🔥 limpiar datos
    limpiarAppVendedor();

    // 🔁 UI
    document.getElementById("login").style.display = "block";
    document.getElementById("admin").style.display = "none";
    document.getElementById("ventas").style.display = "none";
    document.getElementById("btnLogout").style.display = "none";
  });
}

function mostrarLogout() {
  document.getElementById("btnLogout").style.display = "block";
}
// =====================
// 🛒 VENTAS
// =====================
let carrito = {};
let total = 0;

function cargarVentas() {
  document.getElementById("login").style.display = "none";
  document.getElementById("ventas").style.display = "grid";
  document.getElementById("admin").style.display = "none";

  mostrarLogout();

  db.collection("productos").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const p = doc.data();

      let precio = typeof p.precio === "number"
        ? p.precio
        : Number(String(p.precio).replace(/\D/g, "")) || 0;

      html += `
        <button onclick="agregarProducto('${p.nombreProducto}', ${precio}, '${(p.categoria || "").replace(/'/g, "\\'")}')">
          ${p.nombreProducto} <br> $${formatoMiles(precio)}
        </button>
      `;
    });

    document.getElementById("productos").innerHTML = html;
  });

  actualizarCarrito();
}
function actualizarTotal() {
  document.getElementById("total").innerText = formatoMiles(total);
  calcularCambio();
}

// 🔢 recalcula el total de CADA línea (precio x cantidad − descuento)
// y el total general del carrito. Único lugar que decide estos números,
// para que el descuento nunca quede desincronizado al sumar/restar.
function recalcularCarrito() {
  total = 0;

  Object.values(carrito).forEach(item => {
    const bruto = item.precio * item.cantidad;

    let descuento = Number(item.descuento) || 0;
    if (descuento < 0) descuento = 0;
    if (descuento > bruto) descuento = bruto; // 🔒 no se puede descontar más que el total de la línea

    item.descuento = descuento;
    item.total = bruto - descuento;

    total += item.total;
  });
}

function cambiarDescuento(clave, valorTexto) {
  const item = carrito[clave];
  if (!item) return;

  const limpio = Number(String(valorTexto).replace(/\D/g, "")) || 0;
  item.descuento = limpio;

  recalcularCarrito();
  actualizarTotal();
  actualizarCarrito();
}

// =====================
// 🔤 NORMALIZAR NOMBRE
// (para comparar productos ignorando espacios extra y mayúsculas/minúsculas)
// =====================
function normalizarNombre(nombre) {
  return String(nombre || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// 🔑 IDENTIDAD REAL DE UN PRODUCTO VENDIBLE = nombre + categoría
// (dos sabores/variantes pueden compartir el mismo "nombre", ej. "Jugo en
// agua 22 OZ" en categoría Mora vs categoría Uva: son productos distintos,
// con su propio stock y su propia línea en el carrito)
function claveVariante(nombreProducto, categoria) {
  return `${normalizarNombre(nombreProducto)}||${normalizarNombre(categoria)}`;
}
// =====================
// ➕ PRODUCTOS
// =====================
async function agregarProducto(nombreProducto, precio, categoria) {
  precio = Number(precio);

  if (!precio || isNaN(precio)) {
    mostrarMensaje("Error en precio");
    return;
  }

  const clave = claveVariante(nombreProducto, categoria);

  // 🔍 CONSULTAR INVENTARIO REAL (suma todos los lotes de este nombre+categoría)
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .where("categoria", "==", categoria || "")
    .get();

  if (snapshot.empty) {
    return mostrarMensaje("Producto no encontrado en inventario");
  }

  const cantidadDisponible = snapshot.docs.reduce(
    (acc, doc) => acc + (Number(doc.data().cantidad) || 0),
    0
  );

  // 🔥 BLOQUEO REAL
  if (cantidadDisponible <= 0) {
    return mostrarMensaje("Sin stock disponible");
  }

  // 🔥 VALIDAR SI YA HAY EN CARRITO
  const enCarrito = carrito[clave]?.cantidad || 0;

  if (enCarrito >= cantidadDisponible) {
    return mostrarMensaje("No hay más unidades disponibles");
  }

  // ✅ AGREGAR NORMAL
  if (carrito[clave]) {
    carrito[clave].cantidad++;
  } else {
    carrito[clave] = {
      nombreProducto,
      categoria: categoria || "",
      precio,
      cantidad: 1,
      descuento: 0,
      total: precio
    };
  }

  recalcularCarrito();
  actualizarTotal();
  actualizarCarrito();
}
// =====================
// 🧾 CARRITO
// =====================
function actualizarCarrito() {
  let html = `
  <div class="tabla-scroll">
    <table style="width:100%;text-align:center">
      <tr>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Unidad</th>
        <th>Descuento</th>
        <th>Total</th>
        <th>❌</th>
      </tr>
  `;

  Object.entries(carrito).forEach(([clave, item]) => {
    const claveEscapada = clave.replace(/'/g, "\\'");
    const etiqueta = item.categoria
      ? `${item.nombreProducto} · ${item.categoria}`
      : item.nombreProducto;

    html += `
      <tr>
        <td>${etiqueta}</td>
        <td>
          <div class="control-cantidad">
            <button onclick="restarProducto('${claveEscapada}')">−</button>
            <span>${item.cantidad}</span>
            <button onclick="sumarProducto('${claveEscapada}')">+</button>
          </div>
        </td>
        <td>$${formatoMiles(item.precio)}</td>
        <td>
          <input
            type="text"
            value="${item.descuento ? formatoMiles(item.descuento) : ""}"
            placeholder="$0"
            style="width:80px;text-align:center;"
            oninput="formatearInput(this)"
            onchange="cambiarDescuento('${claveEscapada}', this.value)">
        </td>
        <td>$${formatoMiles(item.total)}</td>
        <td>
          <button onclick="eliminarProducto('${claveEscapada}')">❌</button>
        </td>
      </tr>
    `;
  });

  html += `
    </table>
  </div>
  `;

 const contenedor = document.getElementById("carrito");
  contenedor.innerHTML = html;

  // 🔥 AUTO SCROLL CORRECTO
 setTimeout(() => {
  const el = contenedor;

  const necesitaScroll = el.scrollHeight > el.clientHeight;

  if (necesitaScroll) {
    el.scrollTop = el.scrollHeight;
  }
}, 0);
}

// =====================
// ➕➖ CONTROL
// =====================
async function sumarProducto(clave) {

  const item = carrito[clave];

  if (!item) return;

  // 🔍 consultar inventario (suma todos los lotes de este nombre+categoría)
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", item.nombreProducto)
    .where("categoria", "==", item.categoria || "")
    .get();

  if (snapshot.empty) {
    return mostrarMensaje("Producto no encontrado");
  }

  const disponible = snapshot.docs.reduce(
    (acc, doc) => acc + (Number(doc.data().cantidad) || 0),
    0
  );

  // 🔥 VALIDACIÓN CLAVE
  if (item.cantidad >= disponible) {
    return mostrarMensaje("No hay más unidades disponibles");
  }

  // ✅ aumentar
  item.cantidad++;

  recalcularCarrito();
  actualizarCarrito();
  actualizarTotal();
}

function restarProducto(clave) {
  const item = carrito[clave];
  if (!item) return;

  item.cantidad--;

  if (item.cantidad <= 0) delete carrito[clave];

  recalcularCarrito();
  actualizarTotal();
  actualizarCarrito();
}

// =====================
// ❌ ELIMINAR
// =====================
function eliminarProducto(clave) {
  if (!carrito[clave]) return;

  delete carrito[clave];

  recalcularCarrito();
  actualizarTotal();
  actualizarCarrito();
}
// =====================
// 💰 TOTAL + CAMBIO
// =====================
function calcularCambio() {

  const input = document.getElementById("recibido");
  const span = document.getElementById("cambio");

  if (!input || !span) return;

  // 🔥 SI ESTÁ VACÍO
  if (!input.value || input.value.trim() === "") {
    span.innerText = "0";
    span.style.color = "white";
    return;
  }

  // 🔥 LIMPIEZA 100% SEGURA
  const recibido = Number(String(input.value).replace(/\D/g, "")) || 0;

  const cambio = recibido - total;

  if (recibido === 0) {
    span.innerText = "0";
    span.style.color = "white";
    return;
  }

  if (cambio > 0) {
    span.innerText = formatoMiles(cambio);
    span.style.color = "lightgreen";

  } else if (cambio === 0) {
    span.innerText = "0";
    span.style.color = "white";

  } else {
    span.innerText = "Falta: $" + formatoMiles(Math.abs(cambio));
    span.style.color = "red";
  }
}
// =====================
// 💳 PAGO
// =====================
function cambiarMetodoPago() {
  const metodo = document.getElementById("metodoPago").value;

  const pagoEfectivo = document.getElementById("pagoEfectivo");
  const inputRecibido = document.getElementById("recibido");

  if (metodo === "efectivo") {
    pagoEfectivo.style.display = "block";

  } else {
    // 🔥 ocultar bloque
    pagoEfectivo.style.display = "none";

    // 🧹 limpiar campo y cambio
    if (inputRecibido) {
      inputRecibido.value = "";
      inputRecibido.dispatchEvent(new Event("input"));
    }

    const cambio = document.getElementById("cambio");
    if (cambio) {
      cambio.innerText = "0";
      cambio.style.color = "white";
    }
  }

  calcularCambio();
}

// =====================
// 📉 DESCONTAR INVENTARIO TRAS UNA VENTA
// =====================
async function descontarInventario(nombreProducto, categoria, cantidadVendida, idTransaccion) {
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .where("categoria", "==", categoria || "")
    .get();

  if (snapshot.empty) return;

  // 🔥 orden FIFO: se descuenta primero del ingreso más antiguo
  const docs = snapshot.docs.slice().sort((a, b) => {
    const fa = a.data().fecha || "";
    const fb = b.data().fecha || "";
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });

  let restante = cantidadVendida;

  for (const doc of docs) {
    if (restante <= 0) break;

    const montoDeseado = restante; // fijo ANTES de entrar a la transacción

    const descontado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      const actual = snap.data().cantidad || 0;

      if (actual <= 0) return 0;

      const descuento = Math.min(actual, montoDeseado);
      tx.update(doc.ref, { cantidad: actual - descuento });

      return descuento;
    });

    restante -= descontado;

    if (descontado > 0 && typeof registrarMovimiento === "function") {
      const sku = doc.data().sku || "-";

      await registrarMovimiento({
        nombreProducto,
        tipo: "venta",
        cantidad: descontado,
        referencia: `${idTransaccion || "-"} (SKU ${sku})`
      });
    }
  }

  await sincronizarStockProducto(nombreProducto, categoria);
}

// 🔄 recalcula el stock total de UNA VARIANTE (nombre+categoría) y lo refleja en "productos"
async function sincronizarStockProducto(nombreProducto, categoria) {
  const invSnap = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .where("categoria", "==", categoria || "")
    .get();

  let stockTotal = 0;
  invSnap.forEach(doc => {
    stockTotal += Number(doc.data().cantidad) || 0;
  });

  const prodSnap = await db.collection("productos")
    .where("nombreProducto", "==", nombreProducto)
    .where("categoria", "==", categoria || "")
    .get();

  const actualizaciones = prodSnap.docs.map(doc =>
    doc.ref.update({
      stock: stockTotal,
      activo: stockTotal > 0
    })
  );

  await Promise.all(actualizaciones);

  // 🔔 mantener el badge de alertas de stock al día en el panel admin
  if (typeof cargarAlertasStock === "function") {
    cargarAlertasStock();
  }
}

// =====================
// 🧾 ID DE TRANSACCIÓN (VT-00001, VT-00002, ...)
// =====================
const PREFIJO_VENTA = "VT-";
const DIGITOS_VENTA = 5;

async function generarSiguienteIdVenta() {
  const ref = db.collection("contadores").doc("venta");

  const nuevoId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;
    const siguiente = ultimo + 1;

    tx.set(ref, { ultimo: siguiente }, { merge: true });

    return PREFIJO_VENTA + String(siguiente).padStart(DIGITOS_VENTA, "0");
  });

  return nuevoId;
}

// =====================
// 🧾 RECIBO DE VENTA (imprimir / guardar como PDF)
// =====================
function generarReciboHTML(venta, idTransaccion) {
  const fecha = new Date();

  const productosFilas = venta.productos.map(p => `
    <div class="item">
      <div class="item-nombre">${p.nombreProducto}</div>
      <div class="item-detalle">
        <span>${p.cantidad} x $${formatoMiles(p.precio)}</span>
        <span>$${formatoMiles(p.total)}</span>
      </div>
    </div>
  `).join("");

  const descuentoTotal = venta.productos.reduce(
    (acc, p) => acc + (Number(p.descuento) || 0), 0
  );

  return `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Recibo ${idTransaccion || ""}</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace;
          width: 58mm;
          margin: 0 auto;
          padding: 2mm;
          color: #000;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.4;
          -webkit-font-smoothing: antialiased;
        }
        h2 { text-align: center; margin: 0 0 2px; font-size: 14px; }
        .centro { text-align: center; }
        .linea { border-top: 1px dashed #000; margin: 6px 0; }
        .item { margin-bottom: 4px; }
        .item-nombre { font-weight: bold; }
        .item-detalle { display: flex; justify-content: space-between; }
        .totales p { display: flex; justify-content: space-between; margin: 2px 0; }
        .totales p.total-final { font-weight: bold; font-size: 12.5px; }
        .btn-imprimir {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 8px;
          font-size: 12px;
          cursor: pointer;
        }
        @media print {
          .btn-imprimir { display: none; }
          body { width: 58mm; padding: 1mm; }
        }
      </style>
    </head>
    <body>
      <h2>Blockbuster</h2>
      <p class="centro">Recibo de venta</p>
      <p class="centro">${idTransaccion || "-"}</p>
      <p class="centro">${fecha.toLocaleString("es-CO")}</p>

      <div class="linea"></div>

      ${productosFilas}

      <div class="linea"></div>

      <div class="totales">
        ${descuentoTotal > 0 ? `<p><span>Descuento</span><span>-$${formatoMiles(descuentoTotal)}</span></p>` : ""}
        <p class="total-final"><span>TOTAL</span><span>$${formatoMiles(venta.total)}</span></p>
        <p><span>Método de pago</span><span>${capitalizarPrimera(venta.metodoPago)}</span></p>
        ${venta.metodoPago === "efectivo" ? `<p><span>Cambio</span><span>$${formatoMiles(venta.cambio || 0)}</span></p>` : ""}
      </div>

      <div class="linea"></div>
      <p class="centro">¡Gracias por tu compra!</p>

      <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    </body>
    </html>
  `;
}

function mostrarRecibo(venta, idTransaccion) {
  const ventana = window.open("", "_blank", "width=280,height=600");

  if (!ventana) {
    mostrarMensaje("Habilita las ventanas emergentes para ver el recibo");
    return;
  }

  ventana.document.write(generarReciboHTML(venta, idTransaccion));
  ventana.document.close();
}

// =====================
// 💾 VENTA
// =====================
// =====================
// 💰 COSTO PROMEDIO (para reportes de utilidad)
// =====================
async function obtenerCostoPromedio(nombreProducto, categoria) {
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .where("categoria", "==", categoria || "")
    .get();

  if (snapshot.empty) return 0;

  let sumaCosto = 0;
  let sumaCantidad = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    const cantidad = Number(d.cantidad) || 0;
    const costo = Number(d.costoUnitario) || 0;

    if (cantidad > 0) {
      sumaCosto += costo * cantidad;
      sumaCantidad += cantidad;
    }
  });

  if (sumaCantidad > 0) return sumaCosto / sumaCantidad;

  // 🔒 fallback: si ya no queda cantidad positiva en ningún lote,
  // se promedia el costo de todos los lotes sin ponderar
  let total = 0;
  let n = 0;
  snapshot.forEach(doc => {
    total += Number(doc.data().costoUnitario) || 0;
    n++;
  });

  return n > 0 ? total / n : 0;
}

async function guardarVenta(btn) {
  if (btn.disabled) return;

  let cambioFinal = 0;

  try {
    // 🔒 bloquear botón
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const productos = Object.values(carrito);
    const metodo = document.getElementById("metodoPago").value;

    if (!productos.length) {
      mostrarMensaje("Carrito vacío");
      return;
    }

    // 💰 VALIDAR EFECTIVO + CALCULAR CAMBIO
    if (metodo === "efectivo") {
      const recibido = obtenerEfectivo();
      cambioFinal = recibido - total;

      if (recibido < total) {
        const faltante = total - recibido;
        mostrarMensaje(`Faltan $${formatoMiles(faltante)}`);
        return;
      }
    }

    const nombreCliente = document.getElementById("nombreCliente")?.value || "";
    const cedulaCliente = document.getElementById("cedulaCliente")?.value || "";

    if (nombreCliente && cedulaCliente) {
      const snapshot = await db.collection("clientes")
        .where("cedula", "==", cedulaCliente)
        .get();

      if (snapshot.empty) {
        await db.collection("clientes").add({
          nombre: nombreCliente,
          cedula: cedulaCliente,
          fecha: new Date()
        });
      }
    }

    // 💰 capturar el costo promedio de cada producto AL MOMENTO de la venta
    // (para que el reporte de utilidad no dependa del costo actual del inventario)
    for (const item of productos) {
      item.costoUnitario = await obtenerCostoPromedio(item.nombreProducto, item.categoria);
    }

    // 🔢 ID de transacción secuencial y atómico (VT-00001, VT-00002, ...)
    const idTransaccion = await generarSiguienteIdVenta();

    // ✅ GUARDAR VENTA
    await db.collection("ventas").add({
      idTransaccion,
      productos,
      metodoPago: metodo,
      total,
      cambio: cambioFinal,
      nombreCliente: nombreCliente || "",
      cedulaCliente: cedulaCliente || "",
      fecha: new Date()
    });

    // 📉 DESCONTAR DEL INVENTARIO LO QUE SE ACABA DE VENDER
    for (const item of productos) {
      await descontarInventario(item.nombreProducto, item.categoria, item.cantidad, idTransaccion);
    }

    mostrarMensaje(`Venta guardada ✅ (${idTransaccion})`);

    // 🧾 recibo: ventana emergente, el vendedor decide si imprime/guarda PDF o la cierra
    mostrarRecibo({ productos, total, metodoPago: metodo, cambio: cambioFinal }, idTransaccion);

    // 🔄 refrescar la vista de productos para reflejar el stock actualizado
    // (sin esto, el vendedor seguía viendo cantidades viejas hasta recargar)
    await refrescarVistaProductos();

    // 🧹 LIMPIAR TODO EL SISTEMA
    carrito = {};
    total = 0;
    actualizarCarrito();
    actualizarTotal();

    document.getElementById("nombreCliente").value = "";
    document.getElementById("cedulaCliente").value = "";
    document.getElementById("metodoPago").value = "";

    // 🔥 LIMPIEZA CORRECTA EFECTIVO
    const efectivoInput = document.getElementById("recibido");
    if (efectivoInput) {
      efectivoInput.value = "";
      efectivoInput.dispatchEvent(new Event("input")); // recalcula cambio
    }

    // 🔥 RESET CAMBIO VISUAL
    const cambio = document.getElementById("cambio");
    if (cambio) {
      cambio.innerText = "0";
      cambio.style.color = "white";
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar venta ❌");

  } finally {
    // 🔓 restaurar botón SIEMPRE
    btn.disabled = false;
    btn.innerHTML = "💰 Finalizar venta";
  }
  // 🔥 resetear método de pago a estado inicial
document.getElementById("metodoPago").value = "";

document.getElementById("pagoEfectivo").style.display = "none";
}
// =====================
// 🔔 MENSAJE
// =====================
function mostrarMensaje(texto) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.innerText = texto;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 2000);
}
function obtenerEfectivo() {
  const input = document.getElementById("recibido");

  if (!input) return 0;

  const valor = input.value.trim();

  // 🔥 si está vacío → 0
  if (valor === "") return 0;

  // 🔥 solo números
  const limpio = valor.replace(/\D/g, "");

  return limpio ? Number(limpio) : 0;
}
const input = document.getElementById("recibido");
if (input) {
  input.value = "";
  input.dispatchEvent(new Event("input")); // 🔥 recalcula cambio en vivo
}
//Filtrar productos 
function quitarTildes(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// 🔍 Búsqueda GLOBAL: funciona escribas o no hayas entrado a una categoría
async function filtrarProductos() {
  const input = document.getElementById("buscador");
  if (!input) return;

  const filtro = quitarTildes(input.value.trim().toLowerCase());

  // 🔙 campo vacío = volver a ver categorías
  if (filtro === "") {
    volverCategorias();
    return;
  }

  document.getElementById("categoriasProductos").style.display = "none";

  const [snapshot, invSnapshot] = await Promise.all([
    db.collection("productos").get(),
    db.collection("inventario").get()
  ]);

  const productosFiltrados = snapshot.docs
    .map(doc => doc.data())
    .filter(p =>
      p.nombreProducto &&
      quitarTildes(p.nombreProducto.toLowerCase()).includes(filtro)
    );

  renderListaProductos(productosFiltrados, invSnapshot);
}

// 🕐 debounce: espera 300ms de pausa al escribir antes de consultar Firestore
let debounceBuscador = null;
function onEscribirBuscador() {
  clearTimeout(debounceBuscador);
  debounceBuscador = setTimeout(filtrarProductos, 300);
}

// 🔒 se auto-conecta al escribir, sin depender de que el HTML tenga oninput
function conectarBuscador() {
  const buscador = document.getElementById("buscador");
  if (buscador && !buscador.dataset.conectado) {
    buscador.addEventListener("input", onEscribirBuscador);
    buscador.dataset.conectado = "1"; // evita conectar el listener dos veces
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", conectarBuscador);
} else {
  conectarBuscador();
}
function cargarProductos() {
  db.collection("productos").onSnapshot(snapshot => {

    const contenedor = document.getElementById("productos");
    if (!contenedor) return;

    let html = "";

    snapshot.forEach(doc => {

      const p = doc.data();

      if (!p.nombreProducto || !p.precio) return;

      const deshabilitado = p.activo === false;

      let accion = "";

      if (!deshabilitado) {
        accion = `onclick="agregarProducto('${p.nombreProducto}', ${p.precio}, '${(p.categoria || "").replace(/'/g, "\\'")}')"`;
      }

      html += `
        <button ${accion}
        ${deshabilitado ? 'disabled style="opacity:0.5"' : ''}>

        ${p.nombreProducto}<br>
        $${formatoMiles(p.precio)}

        </button>
      `;
    });

    contenedor.innerHTML = html;

  });
}
function limpiarAppVendedor() {

  // 🧹 limpiar inputs
  const inputs = document.querySelectorAll("#ventas input");
  inputs.forEach(input => input.value = "");

  // 🧹 limpiar carrito
  carrito = {};
  total = 0;

  // 🧹 limpiar UI
  const contCarrito = document.getElementById("carrito");
  if (contCarrito) contCarrito.innerHTML = "";

  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.innerText = "0";

  const cambioEl = document.getElementById("cambio");
  if (cambioEl) cambioEl.innerText = "0";

  // 🧹 efectivo recibido
  const recibido = document.getElementById("recibido");
  if (recibido) recibido.value = "";

}
//Cargar productos por categoria 
async function cargarCategoriasProductos() {

  const snapshot = await db.collection("productos").get();

  const categorias = [...new Set(
    snapshot.docs.map(doc => doc.data().categoria)
  )];

  let html = "";

  categorias.forEach(cat => {
    html += `
      <button
        class="btn-categoria"
        onclick="mostrarProductosCategoria('${cat}')">
        ${cat}
      </button>
    `;
  });

  document.getElementById("categoriasProductos").innerHTML = html;
}
//Mostrar productos por categoria
let categoriaActualVendedor = null;

async function mostrarProductosCategoria(categoria) {

  categoriaActualVendedor = categoria;

  // Ocultar categorías
  document.getElementById("categoriasProductos").style.display = "none";

  const [snapshot, invSnapshot] = await Promise.all([
    db.collection("productos").where("categoria", "==", categoria).get(),
    db.collection("inventario").get()
  ]);

  renderListaProductos(snapshot.docs.map(d => d.data()), invSnapshot);
}

// 🔁 Renderer compartido entre "ver por categoría" y "buscar"
function renderListaProductos(productos, invSnapshot) {

  // 📦 Stock real por VARIANTE (nombre+categoría, normalizado), sumando todos
  // los ingresos de inventario de esa variante específica
  const stockPorVariante = {};
  invSnapshot.forEach(doc => {
    const inv = doc.data();
    if (!inv.nombreProducto) return;
    const clave = claveVariante(inv.nombreProducto, inv.categoria);
    stockPorVariante[clave] =
      (stockPorVariante[clave] || 0) + (Number(inv.cantidad) || 0);
  });

  let html = `
  <button
    class="btn-volver"
    onclick="volverCategorias()">
    ⬅ 
  </button>
`;

  let algunoVisible = false;

  productos.forEach(producto => {

    if (!producto.nombreProducto) return;

    const clave = claveVariante(producto.nombreProducto, producto.categoria);
    const tieneMatch = stockPorVariante.hasOwnProperty(clave);

    // 🔒 SIN MATCH EN INVENTARIO = NO DISPONIBLE
    if (!tieneMatch) return;

    const stock = stockPorVariante[clave];
    const sinStock = stock <= 0;

    let claseStock = "stock-ok";
    let textoStock = `${stock} disp.`;

    if (stock <= 0) { claseStock = "stock-agotado"; textoStock = "Agotado"; }
    else if (stock <= 3) { claseStock = "stock-bajo"; }

    algunoVisible = true;

    const nombreEscapado = producto.nombreProducto.replace(/'/g, "\\'");
    const categoriaEscapada = (producto.categoria || "").replace(/'/g, "\\'");
    const etiqueta = producto.categoria
      ? `${producto.nombreProducto} · ${producto.categoria}`
      : producto.nombreProducto;

    html += `
      <button
        class="btn-producto ${sinStock ? "producto-inactivo" : ""}"
        ${sinStock ? "disabled" : `onclick="agregarProducto('${nombreEscapado}', ${producto.precio}, '${categoriaEscapada}')"`}>

        <span class="producto-nombre">${etiqueta}</span>
        <span class="producto-precio">$${formatoMiles(producto.precio)}</span>
        <span class="producto-stock ${claseStock}">${textoStock}</span>

      </button>
    `;
  });

  if (!algunoVisible) {
    html += `<p style="padding:20px;opacity:0.7;">No se encontraron productos</p>`;
  }

  document.getElementById("listaProductos").innerHTML = html;
}

function volverCategorias() {

  categoriaActualVendedor = null;

  const buscador = document.getElementById("buscador");
  if (buscador) buscador.value = "";

  document.getElementById("categoriasProductos").style.display = "block";

  document.getElementById("listaProductos").innerHTML = "";
}

// 🔄 refresca lo que se esté viendo (categoría abierta o búsqueda activa)
// sin perder el contexto en el que está el vendedor
async function refrescarVistaProductos() {
  const buscador = document.getElementById("buscador");

  if (buscador && buscador.value.trim() !== "") {
    await filtrarProductos();
  } else if (categoriaActualVendedor) {
    await mostrarProductosCategoria(categoriaActualVendedor);
  }
  // si está viendo la lista de categorías, no hay nada que refrescar ahí
}
//Cierre del día 
async function cierreDelDia() {

  const snapshot = await db.collection("ventas").get();

  const hoy = new Date();

  let totalGeneral = 0;
  let efectivo = 0;
  let otros = 0;

  snapshot.forEach(doc => {
    const v = doc.data();

    const fecha = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);

    const esHoy =
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear();

    if (!esHoy) return;

    // 🔒 las ventas anuladas no cuentan en el cierre de caja
    if (v.anulada) return;

    const totalVenta = v.total || 0;
    totalGeneral += totalVenta;

    if (v.metodoPago === "efectivo") efectivo += totalVenta;
    else otros += totalVenta;
  });

  // 🔒 se guarda para poder usarlo cuando el cajero confirme el cierre
  window.cierreCalculado = { totalGeneral, efectivo, otros };

  document.getElementById("resultadoCierre").innerHTML = `
    <h3>📊 Resumen del día</h3>
    <p>💰 Total vendido: $${formatoMiles(totalGeneral)}</p>
    <p>💵 Efectivo (según sistema): $${formatoMiles(efectivo)}</p>
    <p>💳 Otros métodos: $${formatoMiles(otros)}</p>

    <div style="margin-top:14px;text-align:left;">
      <label style="display:block;margin-bottom:4px;">💵 Efectivo contado en caja</label>
      <input type="text" id="efectivoContado" placeholder="$0" oninput="formatearInput(this)" style="width:100%;margin-top:0;">

      <label style="display:block;margin:10px 0 4px;">📝 Observaciones (opcional)</label>
      <input type="text" id="observacionesCierre" placeholder="Ej: faltante por vuelto mal dado" style="width:100%;margin-top:0;">
    </div>
  `;

  document.getElementById("modalCierre").style.display = "flex";
}

// =====================
// 🔒 GUARDAR CIERRE DE CAJA (historial permanente)
// =====================
const PREFIJO_CIERRE = "CZ-";
const DIGITOS_CIERRE = 5;

async function generarSiguienteIdCierre() {
  const ref = db.collection("contadores").doc("cierre");

  const nuevoId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;
    const siguiente = ultimo + 1;

    tx.set(ref, { ultimo: siguiente }, { merge: true });

    return PREFIJO_CIERRE + String(siguiente).padStart(DIGITOS_CIERRE, "0");
  });

  return nuevoId;
}

async function guardarCierreCaja(btn) {
  if (btn.disabled) return;

  const calculado = window.cierreCalculado;
  if (!calculado) return mostrarMensaje("Genera el resumen primero");

  const efectivoContadoTexto = document.getElementById("efectivoContado")?.value || "";
  const efectivoContado = Number(String(efectivoContadoTexto).replace(/\D/g, "")) || 0;
  const observaciones = document.getElementById("observacionesCierre")?.value || "";

  const textoOriginal = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const idCierre = await generarSiguienteIdCierre();
    const diferencia = efectivoContado - calculado.efectivo;

    await db.collection("cierres").add({
      idCierre,
      fecha: new Date(),
      totalSistema: calculado.totalGeneral,
      efectivoSistema: calculado.efectivo,
      otrosSistema: calculado.otros,
      efectivoContado,
      diferencia,
      observaciones
    });

    mostrarMensaje(`Cierre guardado ✅ (${idCierre})`);
    cerrarCierre();

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar el cierre ❌");

  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}
window.cerrarCierre = function () {
  document.getElementById("modalCierre").style.display = "none";
};

function vaciarCarrito(){

    if(Object.keys(carrito).length===0){
        return;
    }

    confirmarAccion("¿Vaciar todo el carrito?", () => {
        carrito={};
        total=0;

        actualizarTotal();
        actualizarCarrito();
    });
}
