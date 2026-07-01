const { Timestamp } = firebase.firestore;
// =====================
// 🧠 HELPERS
// =====================
function formatoMiles(valor) {
  return Number(valor || 0).toLocaleString("es-CO");
}
// =====================
// ⚙️ ADMIN
// =====================
function cargarAdmin() {
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "block";
  document.getElementById("ventas").style.display = "none";

  mostrarLogout();
  cargarGastos();
}
// =====================
// 📦 INVENTARIO (BASE)
// =====================
function cargarInventario() {
  db.collection("productos").get().then(snapshot => {
    let html = `<table>
      <tr><th>Producto</th><th>Precio</th></tr>`;

    snapshot.forEach(doc => {
      const p = doc.data();

      html += `
        <tr>
          <td>${p.nombre}</td>
          <td>$${formatoMiles(p.precio)}</td>
        </tr>
      `;
    });

    html += "</table>";

    document.getElementById("listaInventario").innerHTML = html;
  });
}

// =====================
// 📦 PROVEEDORES (FINAL)
// =====================
async function cargarProveedores() {
  const select = document.getElementById("proveedorInv");
  if (!select) return;

  select.innerHTML = `<option value="">Seleccionar proveedor</option>`;

  const snapshot = await db.collection("proveedores").get();

  snapshot.forEach(doc => {
    const proveedor = doc.data();

    const nombre = proveedor.nombre_proveedor || "Sin nombre";

    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = nombre;

    select.appendChild(option);
  });
}
// =====================
// 📊 SECCIONES
// =====================
function mostrarSeccion(seccion) {
  // 🔥 ocultar todas las secciones
  document.querySelectorAll(".seccion-admin").forEach(div => {
    div.style.display = "none";
  });

  // 🔥 quitar activo a todos los botones
  document.getElementById("btnInventario").classList.remove("activo");
  document.getElementById("btnVentas").classList.remove("activo");
  document.getElementById("btnReporte").classList.remove("activo");
  document.getElementById("btnGastos").classList.remove("activo");
  document.getElementById("btnCostos").classList.remove("activo");
  document.getElementById("btnContactos").classList.remove("activo");

  // 🔥 mostrar sección
  document.getElementById(seccion).style.display = "block";

  // 🔥 activar botón correcto
  if (seccion === "inventario") {
    document.getElementById("btnInventario").classList.add("activo");
    cambiarVistaInventario("ver");
  }

  if (seccion === "ventasHoy") {
    document.getElementById("btnVentas").classList.add("activo");
    if (typeof cargarVentasHoy === "function") cargarVentasHoy();
  }

  if (seccion === "reporte") {
    document.getElementById("btnReporte").classList.add("activo");
  }

  if (seccion === "gastos") {
    if (seccion === "gastos") {
  setTimeout(() => {
    cargarProveedoresSelect();
  }, 100);
}
    document.getElementById("btnGastos").classList.add("activo");
    if (typeof cargarGastos === "function") cargarGastos();
  }

  if (seccion === "costos") {
    if (seccion === "costos") {
  setTimeout(() => {
    cargarProveedoresSelect();
  }, 100);
}
    document.getElementById("btnCostos").classList.add("activo");
    if (typeof cargarCostos === "function") cargarCostos();
  }

  if (seccion === "contactos") {
    document.getElementById("btnContactos").classList.add("activo");
    cambiarVistaContactos("proveedores");
  }
}

// =====================
// 🧠 FORMATEO
// =====================
function formatearInput(input) {
  let valor = input.value.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  input.value = Number(valor).toLocaleString("es-CO");
}
function cargarGastos() {
  db.collection("gastos").get().then(snapshot => {

    const contenedor = document.getElementById("tablaGastos");
    if (!contenedor) return;

    let html = `
      <table>
        <tr>
          <th>Proveedor</th>
          <th>Descripción</th>        
          <th>Valor</th>
          <th>Fecha</th>
        </tr>
    `;

    let totalGastos = 0;

    snapshot.forEach(doc => {
      const g = doc.data();

      const valor = g.valor || 0;
      totalGastos += valor;

      const fecha = g.fecha?.toDate
        ? g.fecha.toDate().toLocaleDateString()
        : "-";

      html += `
        <tr>
          <td>${g.proveedor || "-"}</td>
          <td>${g.descripcion || "-"}</td>
          <td>$${formatoMiles(valor)}</td>
          <td>${fecha}</td>
        </tr>
      `;
    });

    html += `</table>`;

    contenedor.innerHTML = html;

    // ✅ evitar error si no existe
    const totalEl = document.getElementById("totalGastos");
    if (totalEl) {
      totalEl.innerText = formatoMiles(totalGastos);
    }

  }).catch(error => {
    console.error("Error cargando gastos:", error);
  });
}
async function cargarCostos() {
  const contenedor = document.getElementById("tablaCostos");
  if (!contenedor) return;

  let html = `
    <table>
      <tr>
        <th>Proveedor</th>
        <th>Descripción</th>
        <th>Valor</th>
        <th>Fecha</th>
      </tr>
  `;

  let total = 0;

  try {
    const snapshot = await db.collection("costos").get();

    snapshot.forEach(doc => {
      const c = doc.data();

      total += c.valor || 0;

      const fecha = c.fecha?.toDate
        ? c.fecha.toDate()
        : new Date(c.fecha);

      html += `
        <tr>
          <td>${c.proveedor || "-"}</td>
          <td>${c.descripcion || "-"}</td>
          <td>$${formatoMiles(c.valor || 0)}</td>
          <td>${fecha.toLocaleDateString()}</td>
        </tr>
      `;
    });

    html += `</table>`;

    // ✅ total seguro
    const totalEl = document.getElementById("totalCostos");
    if (totalEl) {
      totalEl.innerText = "Total costos: $" + formatoMiles(total);
    }

    contenedor.innerHTML = html;

  } catch (error) {
    console.error(error);
  }
}
function mostrarVistaInventario(vista) {


  document.getElementById("vistaVerInventario").style.display = "none";
  document.getElementById("vistaIngresoInventario").style.display = "none";
  document.getElementById("vistaEditarInventario").style.display = "none";

  if (vista === "ver") {
    document.getElementById("vistaVerInventario").style.display = "block";
    cargarVerInventario(); // 🔥
  }

  if (vista === "ingresar") {
    document.getElementById("vistaIngresoInventario").style.display = "block";
    cargarProveedores();
  }

  if (vista === "editar") {
  document.getElementById("vistaEditarInventario").style.display = "block";

  const tabla = document.getElementById("tablaEditarInventario");

  if (tabla && typeof cargarEditarInventario === "function") {
    cargarEditarInventario();
  }
}

}


function calcularTotalCosto() {
  const cantidad = parseInt(document.getElementById("cantidadInv").value) || 0;

  let costo = document.getElementById("costoUnitarioInv").value;
  costo = Number(costo.replace(/\./g, "")) || 0;

  const total = cantidad * costo;

  document.getElementById("totalCostoInv").value = total.toLocaleString("es-CO");
}

window.addEventListener("DOMContentLoaded", () => {
  const cantidad = document.getElementById("cantidadInv");
  const costo = document.getElementById("costoUnitarioInv");

  if (cantidad) cantidad.addEventListener("input", calcularTotalCosto);

  if (costo) {
    costo.addEventListener("input", function () {
      formatearInput(this);
      calcularTotalCosto();
    });
  }
});

async function guardarInventario(btn) {
  if (btn.disabled) return;

  let textoOriginal = btn.innerHTML;

  try {
    // 🔒 bloquear botón
    btn.disabled = true;
    textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const proveedor = document.getElementById("proveedorInv").value;
    const fecha = document.getElementById("fechaInv").value;
    const categoria = document.getElementById("categoriaInv").value;
    const oz = document.getElementById("ozInv").value;
    const nombreProducto = document.getElementById("nombreProducto").value;
    const sku = document.getElementById("skuInv").value;

    const cantidad = parseInt(document.getElementById("cantidadInv").value) || 0;

    let costoUnitario = document.getElementById("costoUnitarioInv").value;
    costoUnitario = Number(costoUnitario.replace(/\./g, "")) || 0;

    let totalCosto = document.getElementById("totalCostoInv").value;
    totalCosto = Number(totalCosto.replace(/\./g, "")) || 0;

    let venta = document.getElementById("ventaUnitariaInv").value;
    venta = Number(venta.replace(/\./g, "")) || 0;

    // 🔍 VALIDACIONES
if (!proveedor || !fecha || !categoria || !oz || !sku || !nombreProducto) {
    mostrarMensaje("Completa los campos");
  return;
}

    let esEdicion = false;

    if (window.idInventarioEditando) {
      await db.collection("inventario")
        .doc(window.idInventarioEditando)
        .update({
          proveedor,
          nombreProducto,
          fecha,
          categoria,
          oz,
          sku,
          cantidad,
          costoUnitario,
          totalCosto,
          venta
        });

      mostrarMensaje("Inventario actualizado ✏️");
      window.idInventarioEditando = null;
      esEdicion = true;

    } else {
      await db.collection("inventario").add({
        proveedor,
        nombreProducto,
        fecha,
        categoria,
        oz,
        sku,
        cantidad,
        costoUnitario,
        totalCosto,
        venta,
        fechaRegistro: new Date()
      });

      mostrarMensaje("Inventario guardado ✅");
    }

    // 🔥 SINCRONIZAR PRODUCTOS
    const refProductos = db.collection("productos");

    const query = await refProductos
      .where("nombreProducto", "==", nombreProducto)
      .get();

    if (!query.empty) {
      const docId = query.docs[0].id;

      await refProductos.doc(docId).update({
  categoria,
  precio: venta,
  activo: cantidad > 0
});

    } else {
      await refProductos.add({
  categoria,
  nombreProducto,
  precio: venta,
  activo: cantidad > 0
});
    }

    // 🔄 ACTUALIZAR TABLAS
    if (typeof cargarVerInventario === "function") cargarVerInventario();
    if (typeof cargarEditarInventario === "function") cargarEditarInventario();

    // 🧹 LIMPIAR CAMPOS
    document.getElementById("proveedorInv").value = "";
    document.getElementById("fechaInv").value = "";
    document.getElementById("categoriaInv").value = "";
    document.getElementById("ozInv").value = "";
    document.getElementById("nombreProducto").value = "";
    document.getElementById("skuInv").value = "";
    document.getElementById("cantidadInv").value = "";
    document.getElementById("costoUnitarioInv").value = "";
    document.getElementById("totalCostoInv").value = "";
    document.getElementById("ventaUnitariaInv").value = "";

    // 🔥 NAVEGACIÓN FINAL
    if (esEdicion) {
      cambiarVistaInventario("editar");
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    // 🔓 SIEMPRE se ejecuta
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

function cargarVerInventario() {
  db.collection("inventario").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const i = doc.data();

     html += `
  <tr>
    <td>${i.proveedor}</td>
    <td>${i.fecha}</td>
    <td>${i.categoria || "-"}</td>
    <td>${i.oz || "-"}</td>
    <td>${i.nombreProducto || "-"}</td>
    <td>${i.sku}</td>
    <td>${i.cantidad}</td>
    <td>$${formatoMiles(i.costoUnitario)}</td>
    <td>$${formatoMiles(i.totalCosto)}</td>
    <td>$${formatoMiles(i.venta)}</td>
  </tr>
`;
    });

    document.getElementById("tablaVerInventario").innerHTML = html;
  });
}
async function editarInventario(id) {
  try {
    const doc = await db.collection("inventario").doc(id).get();

    if (!doc.exists) {
      return mostrarMensaje("Registro no encontrado");
    }

    const i = doc.data();

    // 🔥 ir a vista primero
    mostrarVistaInventario("ingresar");

    // 🔥 cargar proveedores primero
    await cargarProveedores();

    // 🔥 ahora sí asignar valores
    document.getElementById("proveedorInv").value = i.proveedor;
    document.getElementById("fechaInv").value = i.fecha;
document.getElementById("categoriaInv").value = i.categoria || "";
document.getElementById("ozInv").value = i.oz || "";
    document.getElementById("nombreProducto").value = i.nombreProducto;
    document.getElementById("skuInv").value = i.sku;
    document.getElementById("cantidadInv").value = i.cantidad;
    document.getElementById("costoUnitarioInv").value = formatoMiles(i.costoUnitario);
    document.getElementById("totalCostoInv").value = formatoMiles(i.totalCosto);
    document.getElementById("ventaUnitariaInv").value = formatoMiles(i.venta);

    window.idInventarioEditando = id;

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al cargar registro");
  }
}
function cargarEditarInventario() {
  db.collection("inventario").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const i = doc.data();

      html += `
        <tr>
          <td>${i.proveedor}</td>
          <td>${i.fecha}</td>
<td>${i.categoria || "-"}</td>
  <td>${i.oz || "-"}</td>
<td>${i.nombreProducto || "-"}</td>
          <td>${i.sku}</td>
          <td>${i.cantidad}</td>
          <td>$${formatoMiles(i.costoUnitario)}</td>
          <td>$${formatoMiles(i.totalCosto)}</td>
          <td>$${formatoMiles(i.venta)}</td>
          <td>
            <button onclick="editarInventario('${doc.id}')">✏️</button>
          </td>
        </tr>
      `;
    });

    const tabla = document.getElementById("tablaEditarInventario");

if (!tabla) return;

tabla.innerHTML = html;
  });
}
function cambiarVistaInventario(vista) {
  // ocultar vistas
  document.getElementById("vistaVerInventario").style.display = "none";
  document.getElementById("vistaIngresoInventario").style.display = "none";
  document.getElementById("vistaEditarInventario").style.display = "none";

  // quitar activo a todos
  document.querySelectorAll(".inventario-menu button").forEach(btn => {
    btn.classList.remove("active");
  });

  // mostrar vista + activar botón
  if (vista === "ver") {
    document.getElementById("vistaVerInventario").style.display = "block";
    document.getElementById("btnVer").classList.add("active");
    cargarVerInventario();
  }

  if (vista === "ingresar") {
    document.getElementById("vistaIngresoInventario").style.display = "block";
    document.getElementById("btnIngreso").classList.add("active");
    cargarProveedores();
  }

  if (vista === "editar") {
    document.getElementById("vistaEditarInventario").style.display = "block";
    document.getElementById("btnEditar").classList.add("active");
    cargarEditarInventario();
  }
}
function cargarVentasHoy() {
  db.collection("ventas").get().then(snapshot => {

    let html = "";
    let totalDia = 0;

    snapshot.forEach(doc => {
      const v = doc.data();

      const productosTexto = (v.productos || [])
        .map(p => `${p.nombreProducto} (${p.cantidad})`)
        .join(", ");

      const totalVenta = (v.productos || [])
        .reduce((acc, p) => acc + (p.total || 0), 0);

      const hora = new Date(v.fecha.seconds * 1000)
        .toLocaleTimeString();

      html += `
        <tr>
          <td>${productosTexto}</td>
          <td>$${formatoMiles(totalVenta)}</td>
          <td>${v.metodoPago}</td>
          <td>${hora}</td>
        </tr>
      `;

      totalDia += totalVenta;
    });

    document.getElementById("tablaVentasHoy").innerHTML = html;
    document.getElementById("totalHoy").innerText = formatoMiles(totalDia);
  });
}
function cambiarVistaContactos(vista) {
  // 🔥 ocultar vistas
  document.getElementById("vistaProveedores").style.display = "none";
  document.getElementById("vistaClientes").style.display = "none";
  document.getElementById("vistaCrearProveedor").style.display = "none";

  // 🔥 quitar activo a todos
  document.getElementById("btnProv").classList.remove("activo");
  document.getElementById("btnCli").classList.remove("activo");
  document.getElementById("btnCrearProv").classList.remove("activo");

  if (vista === "proveedores") {
    document.getElementById("vistaProveedores").style.display = "block";
    document.getElementById("btnProv").classList.add("activo");
    cargarProveedoresLista();
  }

  if (vista === "clientes") {
    document.getElementById("vistaClientes").style.display = "block";
    document.getElementById("btnCli").classList.add("activo");
    cargarClientes();
  }

  if (vista === "crearProveedor") {
    document.getElementById("vistaCrearProveedor").style.display = "block";
    document.getElementById("btnCrearProv").classList.add("activo");
  }
}

function cargarProveedoresLista() {
  db.collection("proveedores").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const p = doc.data();

      html += `
        <tr>
          <td>${p.nit || "-"}</td>
          <td>${p.nombre_proveedor || "-"}</td>
          <td>${p.direccion || "-"}</td>
          <td>${p.telefono || "-"}</td>
        </tr>
      `;
    });

    document.getElementById("tablaProveedores").innerHTML = html;
  });
}
function cargarClientes() {
  db.collection("clientes").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const c = doc.data();

      html += `
        <tr>
          <td>${c.nombre}</td>
          <td>${c.cedula}</td>
          <td>
            <button onclick="editarCliente('${doc.id}', '${c.nombre}', '${c.cedula}')">
      ✏️
    </button>
          </td>
        </tr>
      `;
    });

    document.getElementById("tablaClientes").innerHTML = html;
  });
}
async function editarCliente(id) {
  const doc = await db.collection("clientes").doc(id).get();
  const c = doc.data();

  const nuevoNombre = prompt("Nombre:", c.nombre);
  const nuevaCedula = prompt("Cédula:", c.cedula);

  if (!nuevoNombre || !nuevaCedula) return;

  await db.collection("clientes").doc(id).update({
    nombre: nuevoNombre,
    cedula: nuevaCedula
  });

  mostrarMensaje("Cliente actualizado");
  cargarClientes();
}
async function guardarProveedor(btn) {
  if (btn.disabled) return;

  try {
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const nit = document.getElementById("nitProv")?.value.trim();
    const nombre_proveedor = document.getElementById("razonProv")?.value.trim();
    const direccion = document.getElementById("direccionProv")?.value || "";
    const telefono = document.getElementById("telefonoProv")?.value || "";

    if (!nit || !nombre_proveedor) {
      mostrarMensaje("Completa los datos");
      return;
    }

    // 🔥 VALIDAR NIT EXISTENTE
    const existe = await db.collection("proveedores")
      .where("nit", "==", nit)
      .get();

    if (!existe.empty) {
      mostrarMensaje("⚠️ NIT ya existe");
      return;
    }

    // ✅ GUARDAR
    await db.collection("proveedores").add({
      nit,
      nombre_proveedor,
      direccion,
      telefono
    });

    mostrarMensaje("Proveedor guardado ✅");

    await cargarProveedoresSelect();

    // limpiar campos
    document.getElementById("nitProv").value = "";
    document.getElementById("razonProv").value = "";
    document.getElementById("direccionProv").value = "";
    document.getElementById("telefonoProv").value = "";

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    btn.disabled = false;
    btn.innerHTML = "Guardar";
  }
}
async function reportePorFechas() {
  const inicio = document.getElementById("fechaInicio")?.value;
  const fin = document.getElementById("fechaFin")?.value;

  if (!inicio || !fin) {
    return mostrarMensaje("Selecciona ambas fechas");
  }

 function parseFecha(fecha) {
  if (fecha.includes("/")) {
    const [dia, mes, anio] = fecha.split("/");
    return new Date(anio, mes - 1, dia); // 🔥 LOCAL
  } else {
    const [anio, mes, dia] = fecha.split("-");
    return new Date(anio, mes - 1, dia); // 🔥 LOCAL
  }
}

  function soloFechaLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const inicioDate = parseFecha(inicio);
  const finDate = parseFecha(fin);

  const inicioStr = soloFechaLocal(inicioDate);
  const finStr = soloFechaLocal(finDate);

  let totalGeneral = 0;
  let totalProductos = 0;

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Productos</th>
        <th>Total Venta</th>
        <th>Método</th>
      </tr>
  `;

  const snapshot = await db.collection("ventas").get();

  snapshot.forEach(doc => {
    const v = doc.data();

    const fechaVenta = v.fecha?.toDate
      ? v.fecha.toDate()
      : new Date(v.fecha);

    // ✅ PRIMERO SE DECLARA
    const fechaVentaStr = soloFechaLocal(fechaVenta);

    // ✅ DESPUÉS SE USA
    if (fechaVentaStr >= inicioStr && fechaVentaStr <= finStr) {

      const productosTexto = (v.productos || [])
        .map(p => {
          totalProductos += p.cantidad;
          return `${p.nombreProducto} (${p.cantidad})`;
        })
        .join(", ");

      const totalVenta = (v.productos || [])
        .reduce((acc, p) => acc + (p.total || 0), 0);

      html += `
        <tr>
          <td>${fechaVenta.toLocaleDateString()}</td>
          <td>${productosTexto}</td>
          <td>$${formatoMiles(totalVenta)}</td>
          <td>${v.metodoPago}</td>
        </tr>
      `;

      totalGeneral += totalVenta;
    }
  });

  html += `</table>`;

  html += `
    <div style="margin-top:20px;">
      <h3>Total vendido: $${formatoMiles(totalGeneral)}</h3>
      <h3>Total productos vendidos: ${totalProductos}</h3>
    </div>
  `;

  const contenedor = document.getElementById("tablaReporte");
  if (!contenedor) return;

  contenedor.innerHTML = html;
}

async function guardarGasto(btn) {
  if (btn.disabled) return; // 🚫 evita doble click

  const proveedor = document.getElementById("proveedorGasto").value;
  const descripcion = document.getElementById("descripcionGasto").value;
  let valor = document.getElementById("valorGasto").value;

  valor = Number(valor.replace(/\./g, "")) || 0;

  // 🔍 VALIDACIÓN ANTES DEL TRY
  if (!proveedor || !descripcion || !valor) {
    mostrarMensaje("Completa los campos");
    return;
  }

  const textoOriginal = btn.innerHTML;

  try {
    // 🔒 bloquear botón
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    await db.collection("gastos").add({
      proveedor,
      descripcion,
      valor,
      fecha: new Date()
    });

    mostrarMensaje("Gasto guardado ✅");

    // 🧹 limpiar
    document.getElementById("proveedorGasto").value = "";
    document.getElementById("descripcionGasto").value = "";
    document.getElementById("valorGasto").value = "";

    // 🔄 recargar tabla
    if (typeof cargarGastos === "function") {
      cargarGastos();
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    // 🔓 SIEMPRE se ejecuta
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}
async function exportarGastosExcel() {

  const snapshot = await db.collection("gastos").get();

  let csv = "Descripción,Valor,Fecha\n";

  snapshot.forEach(doc => {
    const g = doc.data();

    const fecha = g.fecha?.toDate
      ? g.fecha.toDate().toLocaleDateString()
      : "";

    csv += `"${g.descripcion}",${g.valor},"${fecha}"\n`;
  });

  // 🔽 crear archivo
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "gastos.csv";
  link.click();
}
async function guardarCosto(btn) {
  if (btn.disabled) return; // 🚫 evita doble click

  try {
    // 🔒 bloquear botón
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const proveedor = document.getElementById("proveedorCostos").value;
    const descripcion = document.getElementById("descripcionCosto").value;
    let valor = document.getElementById("valorCosto").value;

    valor = Number(valor.replace(/\./g, "")) || 0;

    // 🔍 validación
    if (!proveedor || !descripcion || !valor) {
      mostrarMensaje("Completa los campos");
      return;
    }

    await db.collection("costos").add({
      proveedor,
      descripcion,
      valor,
      fecha: new Date()
    });

    mostrarMensaje("Costo guardado ✅");

    // 🧹 limpiar
    document.getElementById("proveedorCostos").value = "";
    document.getElementById("descripcionCosto").value = "";
    document.getElementById("valorCosto").value = "";

    // 🔄 recargar tabla
    if (typeof cargarCostos === "function") {
      cargarCostos();
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    // 🔓 SIEMPRE se ejecuta (aunque haya return arriba)
    btn.disabled = false;
    btn.innerHTML = "Guardar costo";
  }
}
async function cargarProveedoresSelect() {
  const selectGasto = document.getElementById("proveedorGasto");
  const selectCosto = document.getElementById("proveedorCosto");

  // ⚠️ si no existen, no rompe el código
  if (!selectGasto && !selectCosto) return;

  try {
    const snapshot = await db.collection("proveedores").get();

    let options = `<option value="">Seleccione proveedor</option>`;

    snapshot.forEach(doc => {
      const p = doc.data();

      options += `
        <option value="${p.nombre_proveedor}">
          ${p.nombre_proveedor}
        </option>
      `;
    });

    if (selectGasto) selectGasto.innerHTML = options;
    if (selectCosto) selectCosto.innerHTML = options;

  } catch (error) {
    console.error("Error cargando proveedores:", error);
  }
}
//
//Modificar cliente
//
let clienteEditandoId = null;

function editarCliente(id, nombre, cedula) {
  clienteEditandoId = id;

  document.getElementById("editNombre").value = nombre;
  document.getElementById("editCedula").value = cedula;

  document.getElementById("modalCliente").style.display = "flex";
}
//Guardar cambios
async function guardarClienteEditado(btn) {
  if (btn.disabled) return; // 🚫 evita doble click

  try {
    // 🔒 bloquear botón
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const nombre = document.getElementById("editNombre").value;
    const cedula = document.getElementById("editCedula").value;

    if (!nombre || !cedula) {
      mostrarMensaje("Completa los campos");
      return;
    }

    await db.collection("clientes")
      .doc(clienteEditandoId)
      .update({
        nombre,
        cedula
      });

    mostrarMensaje("Cliente actualizado ✅");

    cerrarModalCliente();

    if (typeof cargarClientes === "function") {
      cargarClientes();
    }

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al actualizar ❌");

  } finally {
    // 🔓 reactivar botón
    btn.disabled = false;
    btn.innerHTML = "💾 Guardar";
  }
}
//cerrar modal 
function cerrarModalCliente() {
  document.getElementById("modalCliente").style.display = "none";
}
