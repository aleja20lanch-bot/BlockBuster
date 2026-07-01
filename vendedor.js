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
  db.collection("usuarios").doc(uid).get().then(doc => {
    const rol = doc.data()?.rol;

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
    mostrar("admin", "block");

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
        <button onclick="agregarProducto('${p.nombreProducto}', ${precio})">
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
// =====================
// ➕ PRODUCTOS
// =====================
async function agregarProducto(nombreProducto, precio) {
  precio = Number(precio);

  if (!precio || isNaN(precio)) {
    mostrarMensaje("Error en precio");
    return;
  }

  // 🔍 CONSULTAR INVENTARIO REAL
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .get();

  if (snapshot.empty) {
    return mostrarMensaje("Producto no encontrado en inventario");
  }

  const data = snapshot.docs[0].data();
  const cantidadDisponible = data.cantidad || 0;

  // 🔥 BLOQUEO REAL
  if (cantidadDisponible <= 0) {
    return mostrarMensaje("Sin stock disponible");
  }

  // 🔥 VALIDAR SI YA HAY EN CARRITO
  const enCarrito = carrito[nombreProducto]?.cantidad || 0;

  if (enCarrito >= cantidadDisponible) {
    return mostrarMensaje("No hay más unidades disponibles");
  }

  // ✅ AGREGAR NORMAL
  if (carrito[nombreProducto]) {
    carrito[nombreProducto].cantidad++;
    carrito[nombreProducto].total += precio;
  } else {
    carrito[nombreProducto] = {
      nombreProducto,
      precio,
      cantidad: 1,
      total: precio
    };
  }

  total += precio;

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
        <th>Total</th>
        <th>❌</th>
      </tr>
  `;

  Object.values(carrito).forEach(item => {
    html += `
      <tr>
        <td>${item.nombreProducto}</td>
        <td>
          <div class="control-cantidad">
            <button onclick="restarProducto('${item.nombreProducto}')">−</button>
            <span>${item.cantidad}</span>
            <button onclick="sumarProducto('${item.nombreProducto}')">+</button>
          </div>
        </td>
        <td>$${formatoMiles(item.precio)}</td>
        <td>$${formatoMiles(item.total)}</td>
        <td>
          <button onclick="eliminarProducto('${item.nombreProducto}')">❌</button>
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
async function sumarProducto(nombreProducto) {

  const item = carrito[nombreProducto];

  if (!item) return;

  // 🔍 consultar inventario
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .get();

  if (snapshot.empty) {
    return mostrarMensaje("Producto no encontrado");
  }

  const data = snapshot.docs[0].data();
  const disponible = data.cantidad || 0;

  // 🔥 VALIDACIÓN CLAVE
  if (item.cantidad >= disponible) {
    return mostrarMensaje("No hay más unidades disponibles");
  }

  // ✅ aumentar
  item.cantidad++;
  item.total += item.precio;
  total += item.precio;

  actualizarCarrito();
  actualizarTotal();
}

function restarProducto(nombre) {
  const item = carrito[nombre];

  item.cantidad--;
  item.total -= item.precio;
  total -= item.precio;

  if (item.cantidad <= 0) delete carrito[nombre];

  actualizarTotal();
  actualizarCarrito();
}

// =====================
// ❌ ELIMINAR
// =====================
function eliminarProducto(nombre) {
  if (!carrito[nombre]) return;

  total -= carrito[nombre].total;
  delete carrito[nombre];

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
// 💾 VENTA
// =====================
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

    // ✅ GUARDAR VENTA
    await db.collection("ventas").add({
      productos,
      metodoPago: metodo,
      total,
      cambio: cambioFinal,
      fecha: new Date()
    });

    mostrarMensaje("Venta guardada ✅");

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
function filtrarProductos() {
  const input = document.getElementById("buscador");
  if (!input) return;

  const filtro = input.value.toLowerCase();

  const contenedor = document.getElementById("listaProductos");
  if (!contenedor) return;

  const botones = contenedor.querySelectorAll("button");

  botones.forEach(btn => {
    btn.style.display =
      btn.innerText.toLowerCase().includes(filtro)
        ? "block"
        : "none";
  });
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
        accion = `onclick="agregarProducto('${p.nombreProducto}', ${p.precio})"`;
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
async function mostrarProductosCategoria(categoria) {

  // Ocultar categorías
  document.getElementById("categoriasProductos").style.display = "none";

  const snapshot = await db.collection("productos")
    .where("categoria", "==", categoria)
    .get();
    
  let html = `
  <button
    class="btn-volver"
    onclick="volverCategorias()">
    ⬅ 
  </button>
`;

  snapshot.forEach(doc => {

    const producto = doc.data();

    html += `
      <button
        class="btn-producto"
        onclick="agregarProducto('${producto.nombreProducto}', ${producto.precio})">

        <strong>${producto.nombreProducto}</strong>
        <br>
        $${formatoMiles(producto.precio)}

      </button>
    `;
  });

  document.getElementById("listaProductos").innerHTML = html;
}
function volverCategorias() {

  document.getElementById("categoriasProductos").style.display = "block";

  document.getElementById("listaProductos").innerHTML = "";
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

    const totalVenta = v.total || 0;
    totalGeneral += totalVenta;

    if (v.metodoPago === "efectivo") efectivo += totalVenta;
    else otros += totalVenta;
  });

  document.getElementById("resultadoCierre").innerHTML = `
    <h3>📊 Resumen del día</h3>
    <p>💰 Total vendido: $${formatoMiles(totalGeneral)}</p>
    <p>💵 Efectivo: $${formatoMiles(efectivo)}</p>
    <p>💳 Otros: $${formatoMiles(otros)}</p>
  `;

  document.getElementById("modalCierre").style.display = "flex";
}
window.cerrarCierre = function () {
  document.getElementById("modalCierre").style.display = "none";
};
