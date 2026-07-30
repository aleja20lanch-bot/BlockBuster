const { Timestamp } = firebase.firestore;
// =====================
// 🧠 HELPERS
// =====================
function formatoMiles(valor) {
  const numero = Number(valor || 0);
  // 🔑 hasta 7 decimales (para costos unitarios que vienen de dividir un
  // paquete, ej. 51.700 / 6 = 8.616,6666667), pero sin ceros de más si
  // el valor es un peso redondo — toLocaleString ya recorta los decimales
  // que no hacen falta.
  return numero.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7
  });
}

// 💰 Parsea un valor en pesos escrito en formato es-CO ("15.000,50") a un
// número real con decimales (15000.5). Acepta también valores sin
// decimales ("15.000" -> 15000) o ya numéricos.
// Redondea a 7 decimales (no 2) para que un costo unitario que sale de
// dividir un paquete (ej. 51.700 / 6 = 8.616,6666667) multiplicado de
// vuelta por la cantidad dé EXACTO el total de la factura, sin quedar
// centavos sueltos por el redondeo.
function parsearValorDecimal(valorTexto) {
  if (valorTexto === null || valorTexto === undefined) return 0;

  let texto = String(valorTexto).trim();
  if (!texto) return 0;

  // quita los puntos de miles y convierte la coma decimal en punto
  texto = texto.replace(/\./g, "").replace(",", ".");

  const numero = parseFloat(texto);
  if (!isFinite(numero)) return 0;

  return Math.round(numero * 1e7) / 1e7;
}

// 💰 Formatea EN VIVO (oninput) un campo de dinero que SÍ admite decimales
// (usa "," para separar los decimales, igual que formatearInput usa "."
// para los miles). Admite hasta 7 decimales. Se usa solo en Costo unitario
// / Venta unitaria / Valor de Gasto / Valor de Costo — NO en "recibido"
// (caja), que sigue usando formatearInput tal como estaba.
function formatearInputDecimal(input) {
  let valor = input.value;

  // solo dígitos y una coma decimal
  valor = valor.replace(/[^\d,]/g, "");

  const partes = valor.split(",");
  const parteEntera = partes[0] || "";
  const parteDecimal = partes.length > 1 ? partes.slice(1).join("").slice(0, 7) : null;

  if (!parteEntera && parteDecimal === null) {
    input.value = "";
    return;
  }

  const enteroFormateado = parteEntera ? Number(parteEntera).toLocaleString("es-CO") : "";

  input.value = parteDecimal !== null
    ? `${enteroFormateado},${parteDecimal}`
    : enteroFormateado;
}


// 🔤 primera letra en mayúscula (para mostrar "Efectivo", "Nequi", "Tarjeta"
// aunque en la base de datos se guarden en minúscula)
function capitalizarPrimera(texto) {
  if (!texto) return texto;
  return String(texto).charAt(0).toUpperCase() + String(texto).slice(1);
}
// =====================
// ⚙️ ADMIN
// =====================
function cargarAdmin() {
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "";
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
  document.getElementById("btnCierres")?.classList.remove("activo");
  document.getElementById("btnAlertas")?.classList.remove("activo");

  // 🔥 mostrar sección (se limpia el estilo en línea para que la hoja de
  // estilos decida el layout: bloque normal o grid en gastos/costos)
  document.getElementById(seccion).style.display = "";

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
    if (typeof cargarFiltroProveedoresInventario === "function") {
      cargarFiltroProveedoresInventario();
    }
  }, 100);
}
    document.getElementById("btnCostos").classList.add("activo");
    if (typeof cargarCostos === "function") cargarCostos();
  }

  if (seccion === "contactos") {
    document.getElementById("btnContactos").classList.add("activo");
    cambiarVistaContactos("proveedores");
  }

  if (seccion === "cierres") {
    document.getElementById("btnCierres")?.classList.add("activo");
    if (typeof cargarCierres === "function") cargarCierres();
  }

  if (seccion === "alertas") {
    document.getElementById("btnAlertas")?.classList.add("activo");
    if (typeof cargarAlertasStock === "function") cargarAlertasStock();
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
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Descripción</th>        
            <th>Valor</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
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

    html += `</tbody></table>`;

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
// =====================
// 🔍 VERIFICAR COSTOS FALTANTES (inventario vs costos)
// =====================
// Compara, por proveedor, cada lote de "inventario" contra los registros
// de "costos" (origen: inventario). Si un lote no tiene un costo asociado,
// aparece aquí — sin importar si ya se vendió o no, porque "inventario"
// NUNCA se borra al vender (descontarInventario solo resta la cantidad).
async function verificarCostosFaltantes() {
  const contenedor = document.getElementById("resultadoVerificacionCostos");
  if (!contenedor) return;

  const proveedorFiltro = document.getElementById("filtroProveedorCostos")?.value || "";

  contenedor.innerHTML = `<p style="opacity:0.7;">Verificando...</p>`;

  try {
    // 🔑 IMPORTANTE: "costos" se trae SIN filtrar por proveedor. Si el
    // texto del proveedor no coincide EXACTO entre el ingreso y el costo
    // (mayúscula, espacio, o el proveedor se renombró), un where("proveedor","==")
    // los deja fuera aunque el registro sí exista — por eso se cruza por SKU,
    // que es el dato que de verdad conecta un ingreso con su costo.
    let queryInventario = db.collection("inventario");
    if (proveedorFiltro) {
      queryInventario = queryInventario.where("proveedor", "==", proveedorFiltro);
    }

    const [invSnap, costosSnap] = await Promise.all([
      queryInventario.get(),
      db.collection("costos").get()
    ]);

    // sku -> { proveedor, idCosto, valor, ref } de TODOS los costos, sin importar proveedor
    const costoPorSku = new Map();
    costosSnap.forEach(doc => {
      const c = doc.data();
      if (c.referenciaSku) {
        costoPorSku.set(c.referenciaSku, {
          proveedor: c.proveedor,
          idCosto: c.idCosto,
          valor: c.valor || 0,
          ref: doc.ref
        });
      }
    });

    const faltantes = [];      // de verdad no existe ningún costo con ese SKU
    const desajustados = [];   // el costo existe, pero con otro texto de proveedor
    const desvalorados = [];   // el costo existe y el proveedor coincide, pero el VALOR no coincide
                                // con el "Total costo" real guardado en Inventario (el que nunca
                                // cambia por ventas) — esto pasa con costos migrados antes de
                                // corregir el script, que usaban cantidad × costoUnitario ACTUAL
                                // en vez del totalCosto original.

    invSnap.forEach(doc => {
      const i = doc.data();
      const match = costoPorSku.get(i.sku);
      const totalCostoReal = i.totalCosto || 0;

      if (!match) {
        faltantes.push(i);
      } else if (proveedorFiltro && match.proveedor !== proveedorFiltro) {
        desajustados.push({ ...i, proveedorEnCosto: match.proveedor, idCosto: match.idCosto });
      } else if (Math.round(match.valor) !== Math.round(totalCostoReal)) {
        desvalorados.push({
          ...i,
          valorEnCosto: match.valor,
          idCosto: match.idCosto,
          costoRef: match.ref,
          totalCostoReal
        });
      }
    });

    if (faltantes.length === 0 && desajustados.length === 0 && desvalorados.length === 0) {
      contenedor.innerHTML = proveedorFiltro
        ? `<p style="opacity:0.8;color:lightgreen;">✅ Todos los lotes de "${proveedorFiltro}" tienen su costo registrado y con el valor correcto.</p>`
        : `<p style="opacity:0.8;color:lightgreen;">✅ Todo el inventario tiene su costo registrado y con el valor correcto.</p>`;
      return;
    }

    let html = "";

    if (desvalorados.length > 0) {
      html += `
        <div style="border:1px solid var(--peligro);border-radius:var(--radio);padding:12px;margin:10px 0;">
          <p style="color:var(--peligro);font-weight:600;">🔴 ${desvalorados.length} costo(s) con el VALOR desactualizado (quedaron calculados sobre la cantidad ya vendida, no sobre la cantidad original comprada):</p>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>ID Costo</th>
                <th>Valor guardado (incorrecto)</th>
                <th>Valor real (según Inventario)</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
      `;
      desvalorados.forEach(i => {
        const diferencia = i.totalCostoReal - i.valorEnCosto;
        html += `
          <tr>
            <td>${i.nombreProducto || "-"}</td>
            <td>${i.sku || "-"}</td>
            <td>${i.idCosto || "-"}</td>
            <td style="color:var(--peligro);">$${formatoMiles(i.valorEnCosto)}</td>
            <td style="color:lightgreen;">$${formatoMiles(i.totalCostoReal)}</td>
            <td>${diferencia >= 0 ? "+" : ""}$${formatoMiles(diferencia)}</td>
          </tr>
        `;
      });
      html += `
            </tbody>
          </table>
          <button onclick="corregirValoresDesajustados()">🔧 Corregir ${desvalorados.length} valor(es)</button>
        </div>
      `;
      ultimosDesvaloradosCostos = desvalorados;
    }

    if (desajustados.length > 0) {
      html += `
        <div style="border:1px solid orange;border-radius:var(--radio);padding:12px;margin:10px 0;">
          <p style="color:orange;font-weight:600;">⚠️ ${desajustados.length} costo(s) SÍ existen, pero quedaron guardados con un texto de proveedor distinto (por eso no aparecen al filtrar por "${proveedorFiltro}"):</p>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>ID Costo</th>
                <th>Proveedor en Inventario</th>
                <th>Proveedor guardado en el Costo</th>
              </tr>
            </thead>
            <tbody>
      `;
      desajustados.forEach(i => {
        html += `
          <tr>
            <td>${i.nombreProducto || "-"}</td>
            <td>${i.sku || "-"}</td>
            <td>${i.idCosto || "-"}</td>
            <td>${proveedorFiltro}</td>
            <td style="color:orange;">"${i.proveedorEnCosto ?? "(vacío)"}"</td>
          </tr>
        `;
      });
      html += `
            </tbody>
          </table>
          <p style="opacity:0.7;font-size:12.5px;margin-top:8px;">
            💡 Compara el texto exacto de las dos últimas columnas: si ves una diferencia de mayúsculas, espacios o el proveedor fue renombrado, ese es el motivo. Esto se corrige editando el campo "proveedor" de esos documentos en Firestore para que coincida.
          </p>
        </div>
      `;
    }

    if (faltantes.length > 0) {
      html += `
        <div style="border:1px solid var(--border-soft);border-radius:var(--radio);padding:12px;margin:10px 0;">
          <p style="color:orange;font-weight:600;">⚠️ ${faltantes.length} lote(s)${proveedorFiltro ? ` de "${proveedorFiltro}"` : ""} SIN ningún costo registrado (ni con este proveedor ni con otro):</p>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad actual</th>
                <th>Costo total guardado en Inventario</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
      `;
      faltantes.forEach(i => {
        html += `
          <tr>
            <td>${i.nombreProducto || "-"}</td>
            <td>${i.sku || "-"}</td>
            <td>${i.cantidad ?? "-"}</td>
            <td>$${formatoMiles(i.totalCosto || 0)}</td>
            <td>${i.fecha || "-"}</td>
          </tr>
        `;
      });
      html += `
            </tbody>
          </table>
      `;

      const reparables = faltantes.filter(i => (i.totalCosto || 0) > 0);

      if (reparables.length > 0) {
        html += `
          <p style="opacity:0.7;font-size:12.5px;margin-top:8px;">
            💡 Estos lotes SÍ tienen un valor de costo guardado en Inventario, así que se puede crear su registro
            de Costos faltante con ese mismo valor (no vas a tener que volver a digitar nada).
          </p>
          <button onclick="repararCostosFaltantes('${proveedorFiltro.replace(/'/g, "\\'")}')">🔧 Crear ${reparables.length} costo(s) faltante(s)</button>
        `;
      } else {
        html += `
          <p style="opacity:0.7;font-size:12.5px;margin-top:8px;">
            💡 "Cantidad actual" puede estar en 0 si ya se vendió todo — eso NO afecta si tiene costo o no.
            Estos lotes tampoco tienen un costo guardado en Inventario ($0), así que hay que agregarlos manualmente arriba con el valor real de la factura.
          </p>
        `;
      }

      html += `</div>`;
    }

    contenedor.innerHTML = html;
    ultimosFaltantesCostos = faltantes.filter(i => (i.totalCosto || 0) > 0);

  } catch (error) {
    console.error("Error verificando costos faltantes:", error);
    contenedor.innerHTML = `<p style="color:salmon;">Error al verificar. Revisa la consola.</p>`;
  }
}

let ultimosDesvaloradosCostos = [];

// 🔧 Corrige el campo "valor" de los costos que quedaron mal calculados,
// dejándolo igual al "totalCosto" real guardado en Inventario (ese campo
// nunca cambia por ventas, así que es la fuente confiable).
async function corregirValoresDesajustados() {
  if (!ultimosDesvaloradosCostos.length) {
    mostrarMensaje("No hay nada pendiente por corregir");
    return;
  }

  const cantidad = ultimosDesvaloradosCostos.length;

  confirmarAccion(
    `Se van a corregir ${cantidad} registro(s) de Costos para que coincidan con el "Total costo" real guardado en Inventario. ¿Continuar?`,
    async () => {
      let corregidos = 0;
      try {
        for (const item of ultimosDesvaloradosCostos) {
          await item.costoRef.update({ valor: item.totalCostoReal });
          corregidos++;
        }

        mostrarMensaje(`✅ ${corregidos} valor(es) corregido(s)`);
        ultimosDesvaloradosCostos = [];
        document.getElementById("resultadoVerificacionCostos").innerHTML = "";
        await cargarCostos();

      } catch (error) {
        console.error("Error corrigiendo valores:", error);
        mostrarMensaje(`⚠️ Se corrigieron ${corregidos} de ${cantidad}. Revisa la consola y vuelve a intentar.`);
        await cargarCostos();
      }
    }
  );
}

let ultimosFaltantesCostos = [];

// 🔧 Crea en "costos" los registros que faltan, usando el totalCosto que
// YA está guardado en el lote de inventario (no inventa valores nuevos).
async function repararCostosFaltantes(proveedor) {
  if (!ultimosFaltantesCostos.length) {
    mostrarMensaje("No hay nada pendiente por reparar");
    return;
  }

  const cantidad = ultimosFaltantesCostos.length;

  confirmarAccion(
    `Se van a crear ${cantidad} registro(s) en Costos para "${proveedor}", usando el "Total costo" que ya está guardado en cada lote de Inventario. ¿Continuar?`,
    async () => {
      let creados = 0;
      try {
        for (const i of ultimosFaltantesCostos) {
          const idCosto = await generarSiguienteIdCosto();
          await db.collection("costos").add({
            idCosto,
            proveedor,
            descripcion: `Ingreso de inventario: ${i.nombreProducto} x${i.cantidad}`,
            valor: i.totalCosto || 0,
            fecha: new Date(),
            origen: "inventario",
            referenciaSku: i.sku,
            reparado: true // 🏷️ marca que este registro se creó con la herramienta de reparación
          });
          creados++;
        }

        mostrarMensaje(`✅ ${creados} costo(s) creado(s)`);
        ultimosFaltantesCostos = [];
        document.getElementById("resultadoVerificacionCostos").innerHTML = "";
        await cargarCostos();

      } catch (error) {
        console.error("Error reparando costos:", error);
        mostrarMensaje(`⚠️ Se crearon ${creados} de ${cantidad}. Revisa la consola y vuelve a intentar.`);
        await cargarCostos();
      }
    }
  );
}

function limpiarFiltrosCostos() {
  const buscar = document.getElementById("buscarCostos");
  const proveedor = document.getElementById("filtroProveedorCostos");
  const desde = document.getElementById("fechaInicioCostos");
  const hasta = document.getElementById("fechaFinCostos");

  if (buscar) buscar.value = "";
  if (proveedor) proveedor.value = "";
  if (desde) desde.value = "";
  if (hasta) hasta.value = "";

  cargarCostos();
}

async function cargarCostos() {
  const contenedorVerificacion = document.getElementById("resultadoVerificacionCostos");
  if (contenedorVerificacion) contenedorVerificacion.innerHTML = "";

  const contenedor = document.getElementById("tablaCostos");
  if (!contenedor) return;

  const proveedorFiltro = document.getElementById("filtroProveedorCostos")?.value || "";
  const texto = (document.getElementById("buscarCostos")?.value || "").toLowerCase();
  const fechaInicioFiltro = document.getElementById("fechaInicioCostos")?.value || "";
  const fechaFinFiltro = document.getElementById("fechaFinCostos")?.value || "";

  let html = `
    <table>
      <thead>
        <tr>
          <th>ID Costo</th>
          <th>Proveedor</th>
          <th>Descripción</th>
          <th>Valor</th>
          <th>Fecha</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = 0;
  let totalInventario = 0;
  let totalManual = 0;

  try {
    // 🔍 si hay proveedor seleccionado en el filtro, se consulta solo ese
    let query = db.collection("costos");
    if (proveedorFiltro) {
      query = query.where("proveedor", "==", proveedorFiltro);
    }
    const snapshot = await query.get();

    snapshot.forEach(doc => {
      const c = doc.data();

      // 🔍 filtro por texto: descripción, proveedor, SKU o ID del costo
      if (texto) {
        const bolsa = [
          c.descripcion, c.proveedor, c.referenciaSku, c.idCosto
        ].join(" ").toLowerCase();
        if (!bolsa.includes(texto)) return;
      }

      // 🔍 filtro por rango de fechas
      if (fechaInicioFiltro || fechaFinFiltro) {
        const fechaDoc = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha);
        const y = fechaDoc.getFullYear();
        const m = String(fechaDoc.getMonth() + 1).padStart(2, "0");
        const d = String(fechaDoc.getDate()).padStart(2, "0");
        const fechaDocStr = `${y}-${m}-${d}`;

        if (fechaInicioFiltro && fechaDocStr < fechaInicioFiltro) return;
        if (fechaFinFiltro && fechaDocStr > fechaFinFiltro) return;
      }

      total += c.valor || 0;
      if (c.origen === "inventario") {
        totalInventario += c.valor || 0;
      } else {
        totalManual += c.valor || 0;
      }

      const fecha = c.fecha?.toDate
        ? c.fecha.toDate()
        : new Date(c.fecha);

      const origenTexto = c.origen === "inventario"
        ? `<span style="color:var(--acento);">📦 Automático (Inventario)</span>`
        : `<span style="opacity:0.8;">✍️ Manual</span>`;

      html += `
        <tr>
          <td>${c.idCosto || "-"}</td>
          <td>${c.proveedor || "-"}</td>
          <td>${c.descripcion || "-"}</td>
          <td>$${formatoMiles(c.valor || 0)}</td>
          <td>${fecha.toLocaleDateString()}</td>
          <td>${origenTexto}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;

    if (snapshot.empty) {
      html += proveedorFiltro
        ? `<p style="opacity:0.7;">Sin costos registrados para "${proveedorFiltro}".</p>`
        : `<p style="opacity:0.7;">Sin costos registrados.</p>`;
    }

    // ✅ total seguro (general + desglosado por origen)
    const totalEl = document.getElementById("totalCostos");
    if (totalEl) {
      totalEl.innerHTML = `
        ${formatoMiles(total)}
        <span style="font-size:12px;font-weight:400;color:var(--texto-suave);margin-left:10px;">
          (📦 Inventario: $${formatoMiles(totalInventario)} · ✍️ Manual: $${formatoMiles(totalManual)})
        </span>
      `;
    }

    contenedor.innerHTML = html;

    // 🔍 mismo contenido, reflejado en la ventana ampliada (si existe)
    const contenedorAmpliado = document.getElementById("tablaCostosAmpliado");
    if (contenedorAmpliado) contenedorAmpliado.innerHTML = html;

  } catch (error) {
    console.error(error);
  }
}

function abrirCostosAmpliado() {
  const modal = document.getElementById("modalCostosAmpliado");
  if (modal) modal.style.display = "flex";
}

function cerrarCostosAmpliado() {
  const modal = document.getElementById("modalCostosAmpliado");
  if (modal) modal.style.display = "none";
}
function mostrarVistaInventario(vista) {


  document.getElementById("vistaVerInventario").style.display = "none";
  document.getElementById("vistaIngresoInventario").style.display = "none";
  document.getElementById("vistaEditarInventario").style.display = "none";

  if (vista === "ver") {
    document.getElementById("vistaVerInventario").style.display = "";
    cargarVerInventario(); // 🔥
  }

  if (vista === "ingresar") {
    document.getElementById("vistaIngresoInventario").style.display = "";
    // 🔒 NO llamar cargarProveedores() aquí: quien invoque mostrarVistaInventario("ingresar")
    // (abrirIngresoInventario / editarInventario) ya se encarga de cargarlo una sola vez.
    // Llamarlo también acá duplicaba las opciones del <select> por una condición de carrera.
  }

  if (vista === "editar") {
  document.getElementById("vistaEditarInventario").style.display = "";

  const tabla = document.getElementById("tablaEditarInventario");

  if (tabla && typeof cargarEditarInventario === "function") {
    cargarEditarInventario();
  }
}

}


function calcularTotalCosto() {
  const cantidad = parseInt(document.getElementById("cantidadInv").value) || 0;

  const costo = parsearValorDecimal(document.getElementById("costoUnitarioInv").value);

  // 🔑 el costo unitario se guarda con 7 decimales (para que la división
  // del paquete sea exacta), pero el TOTAL final se redondea a 2 decimales
  // (precisión real de dinero) — si se redondeara también a 7, quedaría
  // un residuo microscópico visible (ej. 51.700,0000002 en vez de 51.700).
  const total = Math.round(cantidad * costo * 100) / 100;

  document.getElementById("totalCostoInv").value = formatoMiles(total);
}

window.addEventListener("DOMContentLoaded", () => {
  const cantidad = document.getElementById("cantidadInv");
  const costo = document.getElementById("costoUnitarioInv");
  const venta = document.getElementById("ventaUnitariaInv");

  if (cantidad) cantidad.addEventListener("input", calcularTotalCosto);

  if (costo) {
    costo.addEventListener("input", function () {
      formatearInputDecimal(this);
      calcularTotalCosto();
    });
  }

  if (venta) {
    venta.addEventListener("input", function () {
      formatearInputDecimal(this);
    });
  }
});

// =====================
// 🔢 SKU AUTOMÁTICO (AP-0001, AP-0002, ...)
// =====================
const PREFIJO_SKU = "AP-";
const DIGITOS_SKU = 4; // AP-0001

function formatearSku(numero) {
  return PREFIJO_SKU + String(numero).padStart(DIGITOS_SKU, "0");
}

// 👁️ Solo para MOSTRAR en el formulario (no reserva el número).
// El número real se asigna al guardar, con generarSiguienteSku().
async function previsualizarSiguienteSku() {
  const campo = document.getElementById("skuInv");
  if (!campo) return;

  try {
    const ref = db.collection("contadores").doc("sku");
    const snap = await ref.get();
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;

    campo.value = formatearSku(ultimo + 1);

  } catch (error) {
    console.error("Error previsualizando SKU:", error);
    campo.value = "";
  }
}

// 🔒 Asigna el SIGUIENTE número de forma atómica (transacción),
// para que dos ingresos simultáneos nunca se pisen ni se dupliquen.
async function generarSiguienteSku() {
  const ref = db.collection("contadores").doc("sku");

  const nuevoSku = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;
    const siguiente = ultimo + 1;

    tx.set(ref, { ultimo: siguiente }, { merge: true });

    return formatearSku(siguiente);
  });

  return nuevoSku;
}

// =====================
// ✏️ EDITAR INVENTARIO (flujo actual, blindado)
// =====================
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
    document.getElementById("nombreProducto").value = i.nombreProducto;
    document.getElementById("skuInv").value = i.sku;
    document.getElementById("cantidadInv").value = i.cantidad;
    document.getElementById("costoUnitarioInv").value = formatoMiles(i.costoUnitario);
    document.getElementById("totalCostoInv").value = formatoMiles(i.totalCosto);
    document.getElementById("ventaUnitariaInv").value = formatoMiles(i.venta);

    // 🔒 SOLO SE PUEDE EDITAR categoría y nombre — el resto queda bloqueado
    document.getElementById("proveedorInv").disabled = true;
    document.getElementById("fechaInv").disabled = true;
    document.getElementById("skuInv").disabled = true;
    document.getElementById("cantidadInv").disabled = true;
    document.getElementById("costoUnitarioInv").disabled = true;
    document.getElementById("totalCostoInv").disabled = true;
    document.getElementById("ventaUnitariaInv").disabled = true;

    document.getElementById("categoriaInv").disabled = false;
    document.getElementById("nombreProducto").disabled = false;

    // 🔒 modo explícito + id, seteados AL FINAL, después de todo lo demás
    window.modoInventario = "editar";
    window.idInventarioEditando = id;
    window.nombreProductoOriginalEditando = i.nombreProducto; // 🔑 para detectar cambio de nombre

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al cargar registro");
  }
}

// =====================
// ➕ ABRIR INGRESO EN BLANCO (nuevo)
// Usa esta función en el botón "+ Ingreso inventario" del menú
// en vez de llamar mostrarVistaInventario("ingresar") directo
// =====================
function abrirIngresoInventario() {
  // 🔒 modo explícito: cualquier resto de edición anterior se limpia
  window.modoInventario = "ingresar";
  window.idInventarioEditando = null;

  mostrarVistaInventario("ingresar");

  // 🔓 reactivar todos los campos (por si quedaron bloqueados de una edición)
  document.getElementById("proveedorInv").disabled = false;
  document.getElementById("fechaInv").disabled = false;
  document.getElementById("categoriaInv").disabled = false;
  document.getElementById("nombreProducto").disabled = false;
  document.getElementById("skuInv").disabled = true; // 🔒 SKU automático, no editable
  document.getElementById("cantidadInv").disabled = false;
  document.getElementById("costoUnitarioInv").disabled = false;
  document.getElementById("totalCostoInv").disabled = false;
  document.getElementById("ventaUnitariaInv").disabled = false;

  document.getElementById("proveedorInv").value = "";
  document.getElementById("fechaInv").value = "";
  document.getElementById("categoriaInv").value = "";
  document.getElementById("nombreProducto").value = "";
  document.getElementById("skuInv").value = "";
  document.getElementById("cantidadInv").value = "";
  document.getElementById("costoUnitarioInv").value = "";
  document.getElementById("totalCostoInv").value = "";
  document.getElementById("ventaUnitariaInv").value = "";

  previsualizarSiguienteSku();

  cargarProveedores();
}

// =====================
// 💾 GUARDAR INVENTARIO (blindado contra duplicidad)
// =====================
async function guardarInventario(btn) {
  if (btn.disabled) return;

  // 🔒 SNAPSHOT LOCAL: nada puede alterar esto a mitad de la ejecución
  const modo = window.modoInventario;
  const idActual = window.idInventarioEditando;
  const nombreOriginal = window.nombreProductoOriginalEditando;

  let textoOriginal = btn.innerHTML;

  try {
    btn.disabled = true;
    textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    const proveedor = document.getElementById("proveedorInv").value;
    const fecha = document.getElementById("fechaInv").value;
    const categoria = document.getElementById("categoriaInv").value;
    const nombreProducto = document.getElementById("nombreProducto").value;
    let sku = document.getElementById("skuInv").value;

    const cantidad = parseInt(document.getElementById("cantidadInv").value) || 0;

    let costoUnitario = document.getElementById("costoUnitarioInv").value;
    costoUnitario = parsearValorDecimal(costoUnitario);

    let totalCosto = document.getElementById("totalCostoInv").value;
    totalCosto = parsearValorDecimal(totalCosto);

    let venta = document.getElementById("ventaUnitariaInv").value;
    venta = parsearValorDecimal(venta);

    // 🔒 el SKU ya NO se valida a mano — se autogenera para los ingresos nuevos
    if (!proveedor || !fecha || !categoria || !nombreProducto) {
      mostrarMensaje("Completa los campos");
      return;
    }

    let esEdicion = false;

    // 🔒 REGLA CLAVE: solo se hace update si el MODO es "editar" Y hay idActual.
    // Si el modo dice "editar" pero el id se perdió, se BLOQUEA el guardado
    // en vez de crear un producto duplicado.
    if (modo === "editar") {
      if (!idActual) {
        mostrarMensaje("⚠️ Se perdió la referencia del producto. Vuelve a abrir 'editar'.");
        return;
      }

      // 🔒 SOLO categoría y nombre — el resto del producto (cantidad, costos,
      // precio, proveedor) NO se toca desde esta vista
      await db.collection("inventario").doc(idActual).update({
        nombreProducto,
        categoria
      });

      mostrarMensaje("Inventario actualizado ✏️");
      esEdicion = true;

    } else {
      // ⚠️ si no se digitó un costo total, el ingreso NO va a quedar
      // registrado en "Costos" (y luego no cuadrará contra la factura).
      // Se avisa y se pide confirmación explícita antes de continuar.
      if (totalCosto <= 0) {
        const continuar = await new Promise(resolve => {
          confirmarAccion(
            `No ingresaste un "Costo total" para "${nombreProducto}". Si continúas, este ingreso NO quedará registrado en Costos y no vas a poder cuadrarlo luego contra la factura del proveedor. ¿Guardar de todas formas?`,
            () => resolve(true),
            () => resolve(false)
          );
        });

        if (!continuar) {
          mostrarMensaje("Guardado cancelado — agrega el costo total");
          return;
        }
      }

      // 🔒 SKU real y definitivo, asignado de forma atómica en este instante
      // (lo que se veía en pantalla era solo una previsualización)
      sku = await generarSiguienteSku();

      const campoSku = document.getElementById("skuInv");
      if (campoSku) campoSku.value = sku;

      await db.collection("inventario").add({
        proveedor,
        nombreProducto,
        fecha,
        categoria,
        sku,
        cantidad,
        costoUnitario,
        totalCosto,
        venta,
        fechaRegistro: new Date()
      });

      // 💰 REGISTRAR AUTOMÁTICAMENTE EN "COSTOS" — así nunca queda desincronizado
      // con lo que realmente costó el inventario ingresado. Se marca con
      // origen:"inventario" para que el reporte de Utilidad NO lo reste dos veces
      // (ese costo ya se refleja cuando el producto se vende, vía costoUnitario).
      let idCosto = null;
      if (totalCosto > 0) {
        idCosto = await generarSiguienteIdCosto();

        await db.collection("costos").add({
          idCosto,
          proveedor,
          descripcion: `Ingreso de inventario: ${nombreProducto} x${cantidad}`,
          valor: totalCosto,
          fecha: new Date(),
          origen: "inventario",
          referenciaSku: sku
        });
      }

      // 📜 REGISTRAR MOVIMIENTO DE INGRESO (cruzado con SKU y con el ID del costo)
      await registrarMovimiento({
        nombreProducto,
        tipo: "ingreso",
        cantidad,
        referencia: idCosto ? `${sku} | Costo: ${idCosto}` : sku
      });

      mostrarMensaje("Inventario guardado ✅");
    }

    // 🧹 SI CAMBIÓ EL NOMBRE, borrar el producto huérfano con el nombre viejo
    // (si no, se queda un documento fantasma visible para el vendedor)
    if (modo === "editar" && nombreOriginal && nombreOriginal !== nombreProducto) {
      const huerfanos = await db.collection("productos")
        .where("nombreProducto", "==", nombreOriginal)
        .get();

      const borrados = huerfanos.docs.map(doc => doc.ref.delete());
      await Promise.all(borrados);
    }

    // 🔥 SINCRONIZAR PRODUCTOS
    const refProductos = db.collection("productos");
    const query = await refProductos.where("nombreProducto", "==", nombreProducto).get();

    if (modo === "editar") {
      // 🔒 en edición solo se actualiza categoría/nombre en "productos",
      // el precio y el stock no se tocan aquí (los maneja ingreso/venta)
      if (!query.empty) {
        await refProductos.doc(query.docs[0].id).update({ categoria, nombreProducto });
      } else {
        await refProductos.add({
          categoria,
          nombreProducto,
          precio: venta,
          stock: cantidad,
          activo: cantidad > 0
        });
      }
    } else {
      if (!query.empty) {
        const docId = query.docs[0].id;
        await refProductos.doc(docId).update({
          categoria,
          precio: venta
        });
      } else {
        await refProductos.add({
          categoria,
          nombreProducto,
          precio: venta,
          stock: 0,
          activo: false
        });
      }

      // 🔄 recalcular el stock real sumando TODOS los lotes de este producto
      // (evita que un nuevo ingreso pise el total con solo la cantidad de este lote)
      if (typeof sincronizarStockProducto === "function") {
        await sincronizarStockProducto(nombreProducto);
      }
    }

    // 🔄 ACTUALIZAR TABLAS
    if (typeof cargarVerInventario === "function") cargarVerInventario();
    if (typeof cargarEditarInventario === "function") cargarEditarInventario();

    // 🧹 LIMPIAR CAMPOS
    document.getElementById("proveedorInv").value = "";
    document.getElementById("fechaInv").value = "";
    document.getElementById("categoriaInv").value = "";
    document.getElementById("nombreProducto").value = "";
    document.getElementById("cantidadInv").value = "";
    document.getElementById("costoUnitarioInv").value = "";
    document.getElementById("totalCostoInv").value = "";
    document.getElementById("ventaUnitariaInv").value = "";

    // 🔥 NAVEGACIÓN FINAL
    if (esEdicion) {
      cambiarVistaInventario("editar");
    } else {
      // 🔢 quedamos en "ingresar": mostrar el siguiente SKU para poder
      // seguir cargando productos uno tras otro sin que quede en blanco
      previsualizarSiguienteSku();
    }

  } catch (error) {
    console.error("ERROR COMPLETO:", error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    // 🔓 SIEMPRE se ejecuta
    btn.disabled = false;
    btn.innerHTML = textoOriginal;

    // 🧹 limpiar SIEMPRE al terminar, éxito o error, para que el próximo
    // guardado nunca herede un modo/id viejo por accidente
    window.modoInventario = null;
    window.idInventarioEditando = null;
    window.nombreProductoOriginalEditando = null;
  }
}

// =====================
// 📜 TRAZABILIDAD DE INVENTARIO
// =====================
async function registrarMovimiento({ nombreProducto, tipo, cantidad, referencia }) {
  try {
    await db.collection("movimientos").add({
      nombreProducto,
      tipo,          // "ingreso" | "venta"
      cantidad,
      referencia: referencia || null,
      fecha: new Date()
    });
  } catch (error) {
    // 🔒 si falla el registro de trazabilidad, NO debe tumbar la venta/ingreso
    console.error("Error registrando movimiento:", error);
  }
}

async function cargarTrazabilidad() {
  const texto =
    (document.getElementById("buscarTrazabilidad")?.value || "").toLowerCase();
  const tipoFiltro =
    document.getElementById("filtroTipoTrazabilidad")?.value || "";

  const contenedor = document.getElementById("tablaTrazabilidad");
  if (!contenedor) return;

  try {
    const snapshot = await db.collection("movimientos")
      .orderBy("fecha", "desc")
      .limit(200)
      .get();

    let html = "";

    snapshot.forEach(doc => {
      const m = doc.data();

      if (tipoFiltro && m.tipo !== tipoFiltro) return;

      if (texto) {
        const nombre = (m.nombreProducto || "").toLowerCase();
        if (!nombre.includes(texto)) return;
      }

      const fecha = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
      const fechaTexto = fecha.toLocaleString("es-CO");

      let signo = "";
      let color = "white";
      let etiqueta = m.tipo;

      if (m.tipo === "ingreso") {
        signo = "+"; color = "lightgreen"; etiqueta = "📥 Ingreso";
      } else if (m.tipo === "venta") {
        signo = "−"; color = "salmon"; etiqueta = "📤 Venta";
      } else if (m.tipo === "eliminacion") {
        signo = "−"; color = "orange"; etiqueta = "🗑️ Eliminación";
      } else if (m.tipo === "anulacion") {
        signo = "+"; color = "lightgreen"; etiqueta = "🔄 Anulación (devolución)";
      }

      html += `
        <tr>
          <td>${fechaTexto}</td>
          <td>${m.nombreProducto || "-"}</td>
          <td>${etiqueta}</td>
          <td style="color:${color}">${signo}${m.cantidad}</td>
          <td>${m.referencia || "-"}</td>
        </tr>
      `;
    });

    if (!html) {
      html = `<tr><td colspan="5" style="text-align:center;opacity:0.7;">Sin movimientos</td></tr>`;
    }

    contenedor.innerHTML = html;

  } catch (error) {
    console.error("Error cargando trazabilidad:", error);
    contenedor.innerHTML = `<tr><td colspan="5" style="text-align:center;">Error al cargar</td></tr>`;
  }
}

let inventarioVisibleActual = [];

// =====================
// 🔔 ALERTAS DE STOCK (bajo / agotado)
// =====================
const UMBRAL_STOCK_BAJO = 3; // mismo umbral que ya usa la vista del vendedor

function cargarAlertasStock() {
  // 🔑 se calcula sumando directamente los lotes de "inventario" (fuente real
  // de verdad) en vez de leer el campo resumen "stock" de "productos", que se
  // recalcula solo en momentos puntuales (venta/ingreso) y puede quedar
  // desincronizado si esa sincronización no alcanzó a correr a tiempo.
  db.collection("inventario").get().then(snapshot => {

    // 📦 agrupar cantidades por nombre de producto
    const stockPorProducto = new Map(); // nombreProducto -> { cantidad, categoria }

    snapshot.forEach(doc => {
      const i = doc.data();
      const nombre = i.nombreProducto || "(sin nombre)";
      const actual = stockPorProducto.get(nombre) || { cantidad: 0, categoria: i.categoria || "-" };
      actual.cantidad += Number(i.cantidad) || 0;
      if (!actual.categoria || actual.categoria === "-") actual.categoria = i.categoria || "-";
      stockPorProducto.set(nombre, actual);
    });

    const agotados = [];
    const bajos = [];

    stockPorProducto.forEach((info, nombreProducto) => {
      const stock = info.cantidad;
      const p = { nombreProducto, categoria: info.categoria, stock };

      if (stock <= 0) {
        agotados.push(p);
      } else if (stock <= UMBRAL_STOCK_BAJO) {
        bajos.push(p);
      }
    });

    agotados.sort((a, b) => (a.nombreProducto || "").localeCompare(b.nombreProducto || ""));
    bajos.sort((a, b) => (a.stock || 0) - (b.stock || 0));

    const tablaAgotados = document.getElementById("tablaAgotados");
    const tablaBajos = document.getElementById("tablaBajos");

    if (tablaAgotados) {
      tablaAgotados.innerHTML = agotados.length
        ? agotados.map(p => `
            <tr>
              <td>${p.nombreProducto || "-"}</td>
              <td>${p.categoria || "-"}</td>
              <td style="color:var(--peligro);font-weight:700;">Agotado</td>
            </tr>
          `).join("")
        : `<tr><td colspan="3" style="text-align:center;opacity:0.7;">No hay productos agotados 🎉</td></tr>`;
    }

    if (tablaBajos) {
      tablaBajos.innerHTML = bajos.length
        ? bajos.map(p => `
            <tr>
              <td>${p.nombreProducto || "-"}</td>
              <td>${p.categoria || "-"}</td>
              <td style="color:#fbbf24;font-weight:700;">${p.stock} disp.</td>
            </tr>
          `).join("")
        : `<tr><td colspan="3" style="text-align:center;opacity:0.7;">Ningún producto con stock bajo</td></tr>`;
    }

    const contAgotados = document.getElementById("contadorAgotados");
    const contBajos = document.getElementById("contadorBajos");
    if (contAgotados) contAgotados.innerText = agotados.length;
    if (contBajos) contBajos.innerText = bajos.length;

    actualizarBadgeAlertas(agotados.length + bajos.length);

  }).catch(error => {
    console.error("Error cargando alertas de stock:", error);
  });
}

// 🔴 badge visible en el botón del menú, sin necesidad de entrar a la sección
function actualizarBadgeAlertas(totalAlertas) {
  const badge = document.getElementById("badgeAlertas");
  if (!badge) return;

  if (totalAlertas > 0) {
    badge.innerText = totalAlertas;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function cargarVerInventario() {
  const categoria =
    document.getElementById("filtroCategoriaInventario")?.value || "";
  const proveedorFiltro =
    document.getElementById("filtroProveedorInventario")?.value || "";
  const texto =
    (document.getElementById("buscarInventario")?.value || "").toLowerCase();

  db.collection("inventario").get().then(snapshot => {
    let html = "";
    let numero = 1;
    let totalUnidades = 0;

    inventarioVisibleActual = []; // 🔄 se reconstruye en cada carga/filtro

    snapshot.forEach(doc => {
      const i = doc.data();

      // 🔍 filtro por categoría
      if (categoria && i.categoria !== categoria) return;

      // 🔍 filtro por proveedor
      if (proveedorFiltro && i.proveedor !== proveedorFiltro) return;

      // 🔍 filtro por texto (nombre producto o sku)
      if (texto) {
        const nombre = (i.nombreProducto || "").toLowerCase();
        const sku = (i.sku || "").toLowerCase();
        const encontrado = nombre.includes(texto) || sku.includes(texto);
        if (!encontrado) return;
      }

      totalUnidades += Number(i.cantidad) || 0;

      inventarioVisibleActual.push({
        numero: numero,
        proveedor: i.proveedor || "",
        fecha: i.fecha || "",
        categoria: i.categoria || "",
        nombreProducto: i.nombreProducto || "",
        sku: i.sku || "",
        cantidad: i.cantidad || 0,
        costoUnitario: i.costoUnitario || 0,
        totalCosto: i.totalCosto || 0,
        venta: i.venta || 0
      });

      html += `
        <tr>
          <td>${numero++}</td>
          <td>${i.proveedor}</td>
          <td>${i.fecha}</td>
          <td>${i.categoria || "-"}</td>
          <td>${i.nombreProducto || "-"}</td>
          <td>${i.sku}</td>
          <td>${i.cantidad}</td>
          <td>$${formatoMiles(i.costoUnitario)}</td>
          <td>$${formatoMiles(i.totalCosto)}</td>
          <td>$${formatoMiles(i.venta)}</td>
        </tr>
      `;
    });

    const totalEl = document.getElementById("totalUnidadesInventario");
    if (totalEl) totalEl.innerText = totalUnidades;

    document.getElementById("tablaVerInventario").innerHTML = html;
  });
}
async function eliminarInventario(id) {
  const doc = await db.collection("inventario").doc(id).get();
  if (!doc.exists) return mostrarMensaje("Registro no encontrado");

  const data = doc.data();

  const confirmarBorrado = async () => {
    try {
      await db.collection("inventario").doc(id).delete();

      // 🔄 recalcular el stock real del producto (puede quedar en 0
      // si este era el único lote que tenía)
      if (typeof sincronizarStockProducto === "function") {
        await sincronizarStockProducto(data.nombreProducto);
      }

      // 📜 dejar rastro en la trazabilidad
      if (typeof registrarMovimiento === "function") {
        await registrarMovimiento({
          nombreProducto: data.nombreProducto,
          tipo: "eliminacion",
          cantidad: data.cantidad || 0,
          referencia: data.sku || null
        });
      }

      mostrarMensaje("Registro eliminado 🗑️");

      if (typeof cargarEditarInventario === "function") cargarEditarInventario();
      if (typeof cargarVerInventario === "function") cargarVerInventario();

    } catch (error) {
      console.error(error);
      mostrarMensaje("Error al eliminar ❌");
    }
  };

  const mensaje = `¿Eliminar "${data.nombreProducto || "este registro"}" (SKU ${data.sku || "-"})? Esta acción no se puede deshacer.`;

  if (typeof confirmarAccion === "function") {
    confirmarAccion(mensaje, confirmarBorrado);
  } else if (confirm(mensaje)) {
    confirmarBorrado();
  }
}

// 📥 EXPORTAR "VER INVENTARIO" A EXCEL (respeta los filtros activos)
function exportarInventarioExcel() {
  if (!inventarioVisibleActual.length) {
    mostrarMensaje("No hay datos para exportar");
    return;
  }

  const datos = inventarioVisibleActual.map(i => ({
    "#": i.numero,
    "Proveedor": i.proveedor,
    "Fecha": i.fecha,
    "Categoría": i.categoria,
    "Nombre Producto": i.nombreProducto,
    "SKU": i.sku,
    "Cantidad": i.cantidad,
    "Costo Unitario": i.costoUnitario,
    "Total Costo": i.totalCosto,
    "Venta Unitaria": i.venta
  }));

  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Inventario");

  const fechaArchivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `inventario_${fechaArchivo}.xlsx`);
}

function cargarEditarInventario() {

  const categoria =
    document.getElementById("filtroCategoriaEditarInventario")?.value || "";
  const texto =
    (document.getElementById("buscarEditarInventario")?.value || "").toLowerCase();

  db.collection("inventario").get().then(snapshot => {

    let html = "";
    let numero = 1;

    snapshot.forEach(doc => {
      const i = doc.data();

      // 🔍 filtro por categoría
      if (categoria && i.categoria !== categoria) return;

      // 🔍 filtro por texto (nombre producto o sku)
      if (texto) {
        const nombre = (i.nombreProducto || "").toLowerCase();
        const sku = (i.sku || "").toLowerCase();
        const encontrado = nombre.includes(texto) || sku.includes(texto);
        if (!encontrado) return;
      }

      html += `
        <tr>
          <td>${numero++}</td>
          <td>${i.proveedor}</td>
          <td>${i.fecha}</td>
          <td>${i.categoria || "-"}</td>
          <td>${i.nombreProducto || "-"}</td>
          <td>${i.sku}</td>
          <td>${i.cantidad}</td>
          <td>$${formatoMiles(i.costoUnitario)}</td>
          <td>$${formatoMiles(i.totalCosto)}</td>
          <td>$${formatoMiles(i.venta)}</td>
          <td>
            <button onclick="editarInventario('${doc.id}')">✏️</button>
            <button onclick="eliminarInventario('${doc.id}')">🗑️</button>
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

  const vistaTraza = document.getElementById("vistaTrazabilidad");
  if (vistaTraza) vistaTraza.style.display = "none";

  // quitar activo a todos
  document.querySelectorAll(".inventario-menu button").forEach(btn => {
    btn.classList.remove("active");
  });

  // mostrar vista + activar botón
  if (vista === "ver") {
    document.getElementById("vistaVerInventario").style.display = "";
    document.getElementById("btnVer").classList.add("active");
    cargarVerInventario();
  }

  if (vista === "ingresar") {
    document.getElementById("vistaIngresoInventario").style.display = "";
    document.getElementById("btnIngreso").classList.add("active");
    abrirIngresoInventario();
  }

  if (vista === "editar") {
    document.getElementById("vistaEditarInventario").style.display = "";
    document.getElementById("btnEditar").classList.add("active");
    cargarEditarInventario();
  }

  if (vista === "trazabilidad" && vistaTraza) {
    vistaTraza.style.display = "";
    document.getElementById("btnTrazabilidad")?.classList.add("active");
    cargarTrazabilidad();
  }
}
// =====================
// 🖨️ REIMPRIMIR RECIBO (desde el admin, las veces que sea necesario)
// =====================
async function reimprimirRecibo(id) {
  try {
    const doc = await db.collection("ventas").doc(id).get();
    if (!doc.exists) return mostrarMensaje("Venta no encontrada");

    const v = doc.data();

    if (typeof mostrarRecibo !== "function") {
      return mostrarMensaje("No se pudo generar el recibo");
    }

    mostrarRecibo(
      { productos: v.productos, total: v.total, metodoPago: v.metodoPago, cambio: v.cambio },
      v.idTransaccion
    );

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al reimprimir ❌");
  }
}

// 🔍 buscar CUALQUIER venta (de cualquier fecha) por su ID e imprimirla directo,
// sin tener que ubicarla primero en Ventas del día o Reporte mensual
async function buscarEImprimirRecibo() {
  const campo = document.getElementById("buscarIdVentaImprimir");
  const idBuscado = campo?.value.trim();

  if (!idBuscado) {
    return mostrarMensaje("Escribe el ID de venta (ej: VT-00045)");
  }

  try {
    const snapshot = await db.collection("ventas")
      .where("idTransaccion", "==", idBuscado)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return mostrarMensaje("No se encontró ninguna venta con ese ID");
    }

    await reimprimirRecibo(snapshot.docs[0].id);
    if (campo) campo.value = "";

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al buscar ❌");
  }
}

// =====================
// 💰 ID DE COSTO (CO-00001, CO-00002, ...)
// =====================
const PREFIJO_COSTO = "CO-";
const DIGITOS_COSTO = 5;

async function generarSiguienteIdCosto() {
  const ref = db.collection("contadores").doc("costo");

  const nuevoId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;
    const siguiente = ultimo + 1;

    tx.set(ref, { ultimo: siguiente }, { merge: true });

    return PREFIJO_COSTO + String(siguiente).padStart(DIGITOS_COSTO, "0");
  });

  return nuevoId;
}

// =====================
// 🚫 ANULAR VENTA
// =====================

const PREFIJO_ANULACION = "AN-";
const DIGITOS_ANULACION = 5;

async function generarSiguienteIdAnulacion() {
  const ref = db.collection("contadores").doc("anulacion");

  const nuevoId = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ultimo = snap.exists ? (snap.data().ultimo || 0) : 0;
    const siguiente = ultimo + 1;

    tx.set(ref, { ultimo: siguiente }, { merge: true });

    return PREFIJO_ANULACION + String(siguiente).padStart(DIGITOS_ANULACION, "0");
  });

  return nuevoId;
}

// 🔄 devuelve la cantidad al inventario del producto (a un lote existente,
// o crea uno de ajuste si no queda ningún lote registrado para ese nombre)
async function devolverInventario(nombreProducto, cantidad) {
  const snapshot = await db.collection("inventario")
    .where("nombreProducto", "==", nombreProducto)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const ref = snapshot.docs[0].ref;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const actual = snap.data().cantidad || 0;
      tx.update(ref, { cantidad: actual + cantidad });
    });

  } else {
    // 🔒 no queda ningún lote de este producto (se debió eliminar a mano) —
    // se crea uno de ajuste para no perder el stock devuelto
    const sku = typeof generarSiguienteSku === "function"
      ? await generarSiguienteSku()
      : null;

    await db.collection("inventario").add({
      nombreProducto,
      cantidad,
      categoria: "",
      proveedor: "Ajuste por anulación",
      fecha: new Date().toISOString().slice(0, 10),
      sku,
      costoUnitario: 0,
      totalCosto: 0,
      venta: 0,
      fechaRegistro: new Date()
    });
  }

  if (typeof sincronizarStockProducto === "function") {
    await sincronizarStockProducto(nombreProducto);
  }
}

async function anularVenta(id) {
  const doc = await db.collection("ventas").doc(id).get();
  if (!doc.exists) return mostrarMensaje("Venta no encontrada");

  const venta = doc.data();

  if (venta.anulada) {
    return mostrarMensaje("Esta venta ya estaba anulada");
  }

  const confirmarAnulacion = async () => {
    try {
      // 🔢 ID propio de esta anulación, para poder cruzarlo con el ID de venta
      const idAnulacion = await generarSiguienteIdAnulacion();
      const referenciaCruzada = `${venta.idTransaccion || "-"} → ${idAnulacion}`;

      // 🔄 devolver cada producto de la venta al inventario
      for (const item of (venta.productos || [])) {
        await devolverInventario(item.nombreProducto, item.cantidad);

        if (typeof registrarMovimiento === "function") {
          await registrarMovimiento({
            nombreProducto: item.nombreProducto,
            tipo: "anulacion",
            cantidad: item.cantidad,
            referencia: referenciaCruzada
          });
        }
      }

      // 🔒 NO se borra la venta — queda marcada, con su propio ID de anulación
      await db.collection("ventas").doc(id).update({
        anulada: true,
        idAnulacion,
        fechaAnulacion: new Date()
      });

      mostrarMensaje(`Venta anulada 🔄 (${idAnulacion}) — inventario devuelto`);

      // 🔄 refrescar la vista donde estés parado (hoy o reporte por fechas)
      if (typeof cargarVentasHoy === "function") cargarVentasHoy();

      const inicio = document.getElementById("fechaInicio")?.value;
      const fin = document.getElementById("fechaFin")?.value;
      if (inicio && fin && typeof reportePorFechas === "function") {
        reportePorFechas();
      }

    } catch (error) {
      console.error(error);
      mostrarMensaje("Error al anular ❌");
    }
  };

  const mensaje = `¿Anular la venta ${venta.idTransaccion || "sin ID"}? Esto devuelve el stock al inventario. No se puede deshacer.`;

  if (typeof confirmarAccion === "function") {
    confirmarAccion(mensaje, confirmarAnulacion);
  } else if (confirm(mensaje)) {
    confirmarAnulacion();
  }
}

// =====================
// 🔒 HISTORIAL DE CIERRES DE CAJA
// =====================
function cargarCierres() {
  db.collection("cierres").orderBy("fecha", "desc").limit(100).get()
    .then(snapshot => {
      let html = "";

      snapshot.forEach(doc => {
        const c = doc.data();
        const fecha = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha);

        const diferencia = c.diferencia || 0;
        let colorDif = "lightgreen";
        let textoDif = "Cuadrado ✅";

        if (diferencia > 0) {
          colorDif = "#fbbf24";
          textoDif = `Sobrante +$${formatoMiles(diferencia)}`;
        } else if (diferencia < 0) {
          colorDif = "salmon";
          textoDif = `Faltante -$${formatoMiles(Math.abs(diferencia))}`;
        }

        html += `
          <tr>
            <td>${c.idCierre || "-"}</td>
            <td>${fecha.toLocaleString("es-CO")}</td>
            <td>$${formatoMiles(c.totalSistema)}</td>
            <td>$${formatoMiles(c.efectivoSistema)}</td>
            <td>$${formatoMiles(c.efectivoContado)}</td>
            <td style="color:${colorDif}">${textoDif}</td>
            <td>${c.observaciones || "-"}</td>
          </tr>
        `;
      });

      const tabla = document.getElementById("tablaCierres");
      if (!tabla) return;

      tabla.innerHTML = html ||
        `<tr><td colspan="7" style="text-align:center;opacity:0.7;">Sin cierres registrados todavía</td></tr>`;

    }).catch(error => {
      console.error("Error cargando cierres:", error);
    });
}

// 📥 EXPORTAR VENTAS DEL DÍA A EXCEL
let ventasHoyVisibleActual = [];

function exportarVentasHoyExcel() {
  if (!ventasHoyVisibleActual.length) {
    mostrarMensaje("No hay ventas de hoy para exportar");
    return;
  }

  const datos = ventasHoyVisibleActual.map(v => ({
    "ID Venta": v.idVenta,
    "Productos": v.productos,
    "Descuento": v.descuento,
    "Total": v.total,
    "Método": v.metodoPago,
    "Hora": v.hora,
    "Anulada": v.anulada
  }));

  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Ventas de hoy");

  const fechaArchivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `ventas_hoy_${fechaArchivo}.xlsx`);
}

function cargarVentasHoy() {
  ventasHoyVisibleActual = [];
  const metodoFiltro = document.getElementById("filtroMetodoVentasHoy")?.value || "";

  db.collection("ventas").get().then(snapshot => {

    let html = "";
    let totalDia = 0;

    const hoy = new Date();

    snapshot.forEach(doc => {
      const v = doc.data();

      const fecha = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);

      // 🔒 SOLO ventas de HOY (antes se mostraban todas las ventas históricas)
      const esHoy =
        fecha.getDate() === hoy.getDate() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear();

      if (!esHoy) return;

      // 🔍 filtro por método de pago
      if (metodoFiltro && v.metodoPago !== metodoFiltro) return;

      const productosTexto = (v.productos || [])
        .map(p => `${p.nombreProducto} (${p.cantidad})`)
        .join(", ");

      const totalVenta = (v.productos || [])
        .reduce((acc, p) => acc + (p.total || 0), 0);

      const totalDescuento = (v.productos || [])
        .reduce((acc, p) => acc + (Number(p.descuento) || 0), 0);

      const hora = fecha.toLocaleTimeString();

      const filaEstilo = v.anulada
        ? 'style="opacity:0.5;text-decoration:line-through;"'
        : "";

      const accionCelda = v.anulada
        ? `<span style="color:var(--peligro);text-decoration:none;display:inline-block;">🚫 Anulada (${v.idAnulacion || "-"})</span>`
        : `<button onclick="anularVenta('${doc.id}')">🚫 Anular</button>`;

      const imprimirCelda = `<button onclick="reimprimirRecibo('${doc.id}')">🖨️</button>`;

      ventasHoyVisibleActual.push({
        idVenta: v.idTransaccion || "-",
        productos: productosTexto,
        descuento: totalDescuento,
        total: totalVenta,
        metodoPago: v.metodoPago,
        hora: hora,
        anulada: v.anulada ? "Sí" : "No"
      });

      html += `
        <tr ${filaEstilo}>
          <td>${v.idTransaccion || "-"}</td>
          <td>${productosTexto}</td>
          <td>${totalDescuento > 0 ? "-$" + formatoMiles(totalDescuento) : "-"}</td>
          <td>$${formatoMiles(totalVenta)}</td>
          <td>${capitalizarPrimera(v.metodoPago)}</td>
          <td>${hora}</td>
          <td>${imprimirCelda} ${accionCelda}</td>
        </tr>
      `;

      // 🔒 las ventas anuladas no cuentan en el total del día
      if (!v.anulada) {
        totalDia += totalVenta;
      }
    });

    if (!html) {
      html = `<tr><td colspan="7" style="text-align:center;opacity:0.7;">Sin ventas${metodoFiltro ? " con ese método" : ""} hoy</td></tr>`;
    }

    document.getElementById("tablaVentasHoy").innerHTML = html;
    document.getElementById("totalHoy").innerText = formatoMiles(totalDia);
  });
}
function cambiarVistaContactos(vista) {
  // 🔥 ocultar vistas
  document.getElementById("vistaProveedores").style.display = "none";
  document.getElementById("vistaClientes").style.display = "none";
  document.getElementById("vistaCrearProveedor").style.display = "none";

  const vistaCat = document.getElementById("vistaCategorias");
  if (vistaCat) vistaCat.style.display = "none";

  const vistaUsr = document.getElementById("vistaUsuarios");
  if (vistaUsr) vistaUsr.style.display = "none";

  // 🔥 quitar activo a todos
  document.getElementById("btnProv").classList.remove("activo");
  document.getElementById("btnCli").classList.remove("activo");
  document.getElementById("btnCrearProv").classList.remove("activo");
  document.getElementById("btnCat")?.classList.remove("activo");
  document.getElementById("btnUsr")?.classList.remove("activo");

  if (vista === "proveedores") {
    document.getElementById("vistaProveedores").style.display = "";
    document.getElementById("btnProv").classList.add("activo");
    cargarProveedoresLista();
  }

  if (vista === "clientes") {
    document.getElementById("vistaClientes").style.display = "";
    document.getElementById("btnCli").classList.add("activo");
    cargarClientes();
  }

  if (vista === "crearProveedor") {
    document.getElementById("vistaCrearProveedor").style.display = "";
    document.getElementById("btnCrearProv").classList.add("activo");
  }

  if (vista === "categorias" && vistaCat) {
    vistaCat.style.display = "";
    document.getElementById("btnCat")?.classList.add("activo");
    cargarListaCategorias();
  }

  if (vista === "usuarios" && vistaUsr) {
    vistaUsr.style.display = "";
    document.getElementById("btnUsr")?.classList.add("activo");
    cargarListaUsuarios();
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
      const nombreEscapado = (c.nombre || "").replace(/'/g, "\\'");

      html += `
        <tr>
          <td>${c.nombre}</td>
          <td>${c.cedula}</td>
          <td>
            <button onclick="editarCliente('${doc.id}', '${c.nombre}', '${c.cedula}')">
      ✏️
    </button>
            <button onclick="verHistorialCliente('${c.cedula}', '${nombreEscapado}')">
      📜
    </button>
          </td>
        </tr>
      `;
    });

    document.getElementById("tablaClientes").innerHTML = html;
  });
}

// =====================
// 📜 HISTORIAL DE COMPRAS POR CLIENTE
// =====================
async function verHistorialCliente(cedula, nombre) {
  const nombreEl = document.getElementById("clienteHistorialNombre");
  if (nombreEl) nombreEl.innerText = `${nombre} — Cédula: ${cedula}`;

  const tabla = document.getElementById("tablaHistorialCliente");
  const totalEl = document.getElementById("totalHistoricoCliente");

  try {
    const snapshot = await db.collection("ventas")
      .where("cedulaCliente", "==", cedula)
      .get();

    const ventas = snapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => {
        const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fb - fa; // más reciente primero
      });

    let html = "";
    let totalHistorico = 0;

    ventas.forEach(v => {
      const fecha = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
      const productosTexto = (v.productos || [])
        .map(p => `${p.nombreProducto} (${p.cantidad})`)
        .join(", ");

      const estilo = v.anulada ? 'style="opacity:0.5;text-decoration:line-through;"' : "";

      html += `
        <tr ${estilo}>
          <td>${fecha.toLocaleDateString()}</td>
          <td>${v.idTransaccion || "-"}${v.anulada ? " 🚫" : ""}</td>
          <td>${productosTexto}</td>
          <td>$${formatoMiles(v.total)}</td>
          <td>${capitalizarPrimera(v.metodoPago)}</td>
        </tr>
      `;

      if (!v.anulada) totalHistorico += v.total || 0;
    });

    if (tabla) {
      tabla.innerHTML = html ||
        `<tr><td colspan="5" style="text-align:center;opacity:0.7;">Sin compras registradas con este cliente</td></tr>`;
    }
    if (totalEl) totalEl.innerText = formatoMiles(totalHistorico);

    document.getElementById("modalHistorialCliente").style.display = "flex";

  } catch (error) {
    console.error("Error cargando historial del cliente:", error);
    mostrarMensaje("Error al cargar historial ❌");
  }
}

function cerrarModalHistorialCliente() {
  document.getElementById("modalHistorialCliente").style.display = "none";
}

// =====================
// 👤 USUARIOS (crear vendedores/admins desde el panel)
// =====================

// 🔒 app secundaria de Firebase: crea el usuario nuevo SIN cerrar tu sesión
function obtenerAppSecundaria() {
  try {
    return firebase.app("Secundaria");
  } catch (e) {
    return firebase.initializeApp(firebase.apps[0].options, "Secundaria");
  }
}

async function crearUsuarioVendedor(btn) {
  if (btn.disabled) return;

  const correo = document.getElementById("correoUsuario")?.value.trim();
  const password = document.getElementById("passwordUsuario")?.value;
  const rol = document.getElementById("rolUsuario")?.value;

  if (!correo || !password || !rol) {
    return mostrarMensaje("Completa todos los campos");
  }

  if (password.length < 6) {
    return mostrarMensaje("⚠️ La contraseña debe tener mínimo 6 caracteres");
  }

  const textoOriginal = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Creando...';

    const appSecundaria = obtenerAppSecundaria();

    // 🔥 crea el login (Authentication) desde la app secundaria
    const credencial = await appSecundaria.auth().createUserWithEmailAndPassword(correo, password);
    const uid = credencial.user.uid;
    await appSecundaria.auth().signOut(); // 🧹 no dejar esa sesión colgada

    // 📝 guarda el rol en Firestore (con la app principal, la que ya usa todo el sistema)
    // 🔑 el ID del documento es el MISMO uid de Authentication — así el login
    // (obtenerRol) lo busca directo por doc(uid) en vez de por un campo
    // "correo" con .where(), que es mucho más frágil (cualquier diferencia de
    // mayúsculas/espacios entre lo guardado y lo que devuelve Firebase Auth
    // hace que la búsqueda no encuentre nada).
    await db.collection("usuarios").doc(uid).set({
      correo,
      rol,
      fechaCreacion: new Date()
    });

    mostrarMensaje("Usuario creado ✅");

    document.getElementById("correoUsuario").value = "";
    document.getElementById("passwordUsuario").value = "";
    document.getElementById("rolUsuario").value = "";

    if (typeof cargarListaUsuarios === "function") cargarListaUsuarios();

  } catch (error) {
    console.error(error);

    let msg = "Error al crear usuario ❌";
    if (error.code === "auth/email-already-in-use") msg = "⚠️ Ese correo ya está registrado";
    if (error.code === "auth/weak-password") msg = "⚠️ Contraseña muy débil";
    if (error.code === "auth/invalid-email") msg = "⚠️ Correo inválido";

    mostrarMensaje(msg);

  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

function cargarListaUsuarios() {
  const tabla = document.getElementById("tablaUsuarios");
  if (!tabla) return;

  db.collection("usuarios").get().then(snapshot => {
    let html = "";

    snapshot.forEach(doc => {
      const u = doc.data();
      const correoEscapado = (u.correo || "").replace(/'/g, "\\'");

      html += `
        <tr>
          <td>${u.correo || "-"}</td>
          <td>
            <select onchange="cambiarRolUsuario('${doc.id}', this.value)">
              <option value="admin" ${u.rol === "admin" ? "selected" : ""}>Admin</option>
              <option value="vendedor" ${u.rol === "vendedor" ? "selected" : ""}>Vendedor</option>
            </select>
          </td>
          <td>
            <button onclick="eliminarUsuario('${doc.id}', '${correoEscapado}')">🗑️ Desactivar</button>
          </td>
        </tr>
      `;
    });

    tabla.innerHTML = html ||
      `<tr><td colspan="3" style="text-align:center;opacity:0.7;">Sin usuarios registrados todavía</td></tr>`;

  }).catch(error => {
    console.error("Error cargando usuarios:", error);
  });
}

async function cambiarRolUsuario(id, nuevoRol) {
  try {
    await db.collection("usuarios").doc(id).update({ rol: nuevoRol });
    mostrarMensaje("Rol actualizado ✅");
  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al actualizar ❌");
  }
}

async function eliminarUsuario(id, correo) {
  const borrar = async () => {
    try {
      await db.collection("usuarios").doc(id).delete();
      mostrarMensaje("Usuario desactivado 🗑️");
      if (typeof cargarListaUsuarios === "function") cargarListaUsuarios();
    } catch (error) {
      console.error(error);
      mostrarMensaje("Error al desactivar ❌");
    }
  };

  const mensaje = `¿Desactivar a "${correo}"? Ya no va a poder entrar a ninguna vista del sistema. Su usuario de acceso (login) técnicamente sigue existiendo en Firebase Authentication — si quieres eliminarlo por completo, debes hacerlo también desde ahí.`;

  if (typeof confirmarAccion === "function") {
    confirmarAccion(mensaje, borrar);
  } else if (confirm(mensaje)) {
    borrar();
  }
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
    await cargarFiltroProveedoresInventario();

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
// ✏️ EDITAR MÉTODO DE PAGO DE UNA VENTA (desde Reporte mensual)
async function cambiarMetodoPagoVenta(id, nuevoMetodo) {
  if (!nuevoMetodo) return;

  try {
    await db.collection("ventas").doc(id).update({ metodoPago: nuevoMetodo });
    mostrarMensaje("Método de pago actualizado ✅");

    if (typeof reportePorFechas === "function") reportePorFechas();
    if (typeof cargarVentasHoy === "function") cargarVentasHoy();

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al actualizar ❌");
  }
}

// 📥 EXPORTAR REPORTE DE VENTAS A EXCEL (detalle + resumen de utilidad)
let reporteVisibleActual = [];
let resumenReporteActual = null;

function exportarReporteExcel() {
  if (!reporteVisibleActual.length) {
    mostrarMensaje("Genera el reporte primero");
    return;
  }

  const detalle = reporteVisibleActual.map(v => ({
    "ID Venta": v.idVenta,
    "Fecha": v.fecha,
    "Productos": v.productos,
    "Descuento": v.descuento,
    "Total Venta": v.totalVenta,
    "Costo Productos": v.costoVenta,
    "Método": v.metodoPago,
    "Anulada": v.anulada
  }));

  const resumen = resumenReporteActual ? [
    { Concepto: "Rango de fechas", Valor: `${resumenReporteActual.inicio} a ${resumenReporteActual.fin}` },
    { Concepto: "Total vendido", Valor: resumenReporteActual.totalGeneral },
    { Concepto: "Total descuentos", Valor: resumenReporteActual.totalDescuentoGeneral },
    { Concepto: "Total productos vendidos", Valor: resumenReporteActual.totalProductos },
    { Concepto: "Costo de productos vendidos", Valor: resumenReporteActual.costoProductosGeneral },
    { Concepto: "Gastos del periodo", Valor: resumenReporteActual.totalGastosPeriodo },
    { Concepto: "Costos del periodo (manuales)", Valor: resumenReporteActual.totalCostosPeriodo },
    { Concepto: "Utilidad neta", Valor: resumenReporteActual.utilidadNeta }
  ] : [];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(detalle), "Ventas");
  if (resumen.length) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), "Resumen");
  }

  const nombreArchivo = resumenReporteActual
    ? `ventas_${resumenReporteActual.inicio}_a_${resumenReporteActual.fin}.xlsx`
    : `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(libro, nombreArchivo);
}

async function reportePorFechas(btn) {
  if (btn?.disabled) return; // 🚫 evita doble click

  const textoOriginal = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Generando...';
  }

  try {

  reporteVisibleActual = [];

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
  let costoProductosGeneral = 0;

  let html = `
    <table>
      <tr>
        <th>ID Venta</th>
        <th>Fecha</th>
        <th>Productos</th>
        <th>Descuento</th>
        <th>Total Venta</th>
        <th>Método</th>
        <th>Acción</th>
      </tr>
  `;

  let totalDescuentoGeneral = 0;

  const [snapshot, invSnapshot, gastosSnap, costosSnap] = await Promise.all([
    db.collection("ventas").get(),
    db.collection("inventario").get(),
    db.collection("gastos").get(),
    db.collection("costos").get()
  ]);

  // 📦 costo promedio ACTUAL por producto — fallback para ventas viejas
  // que se guardaron antes de que cada línea llevara su propio costoUnitario
  const sumasCosto = {};
  invSnapshot.forEach(doc => {
    const d = doc.data();
    const nombre = d.nombreProducto;
    if (!nombre) return;

    const cantidad = Number(d.cantidad) || 0;
    const costo = Number(d.costoUnitario) || 0;

    if (!sumasCosto[nombre]) sumasCosto[nombre] = { costo: 0, cantidad: 0 };
    if (cantidad > 0) {
      sumasCosto[nombre].costo += costo * cantidad;
      sumasCosto[nombre].cantidad += cantidad;
    }
  });

  const costoPromedioPorProducto = {};
  Object.keys(sumasCosto).forEach(nombre => {
    const s = sumasCosto[nombre];
    costoPromedioPorProducto[nombre] = s.cantidad > 0 ? s.costo / s.cantidad : 0;
  });

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
          if (!v.anulada) totalProductos += p.cantidad;
          return `${p.nombreProducto} (${p.cantidad})`;
        })
        .join(", ");

      const totalVenta = (v.productos || [])
        .reduce((acc, p) => acc + (p.total || 0), 0);

      const totalDescuento = (v.productos || [])
        .reduce((acc, p) => acc + (Number(p.descuento) || 0), 0);

      // 💰 costo de lo vendido: usa el costoUnitario guardado en la línea
      // (ventas nuevas), o el costo promedio actual como respaldo (ventas viejas)
      const costoVenta = (v.productos || [])
        .reduce((acc, p) => {
          const costoUnit = (p.costoUnitario !== undefined && p.costoUnitario !== null)
            ? Number(p.costoUnitario)
            : (costoPromedioPorProducto[p.nombreProducto] || 0);
          return acc + costoUnit * (Number(p.cantidad) || 0);
        }, 0);

      const filaEstilo = v.anulada
        ? 'style="opacity:0.5;text-decoration:line-through;"'
        : "";

      const accionCelda = v.anulada
        ? `<span style="color:var(--peligro);text-decoration:none;display:inline-block;">🚫 Anulada (${v.idAnulacion || "-"})</span>`
        : `<button onclick="anularVenta('${doc.id}')" style="text-decoration:none;">🚫 Anular</button>`;

      const imprimirCelda = `<button onclick="reimprimirRecibo('${doc.id}')" style="text-decoration:none;">🖨️</button>`;

      const metodoCelda = v.anulada
        ? capitalizarPrimera(v.metodoPago)
        : `
          <select onchange="cambiarMetodoPagoVenta('${doc.id}', this.value)" style="width:auto;margin:0;padding:6px 8px;">
            <option value="efectivo" ${v.metodoPago === "efectivo" ? "selected" : ""}>Efectivo</option>
            <option value="nequi" ${v.metodoPago === "nequi" ? "selected" : ""}>Nequi</option>
            <option value="tarjeta" ${v.metodoPago === "tarjeta" ? "selected" : ""}>Tarjeta</option>
          </select>
        `;

      html += `
        <tr ${filaEstilo}>
          <td>${v.idTransaccion || "-"}${v.anulada ? " 🚫" : ""}</td>
          <td>${fechaVenta.toLocaleDateString()}</td>
          <td>${productosTexto}</td>
          <td>${totalDescuento > 0 ? "-$" + formatoMiles(totalDescuento) : "-"}</td>
          <td>$${formatoMiles(totalVenta)}</td>
          <td>${metodoCelda}</td>
          <td>${imprimirCelda} ${accionCelda}</td>
        </tr>
      `;

      reporteVisibleActual.push({
        idVenta: v.idTransaccion || "-",
        fecha: fechaVenta.toLocaleDateString(),
        productos: productosTexto,
        descuento: totalDescuento,
        totalVenta: totalVenta,
        metodoPago: v.metodoPago,
        anulada: v.anulada ? "Sí" : "No",
        costoVenta: costoVenta
      });

      // 🔒 las ventas anuladas no cuentan en los totales del reporte
      if (!v.anulada) {
        totalGeneral += totalVenta;
        totalDescuentoGeneral += totalDescuento;
        costoProductosGeneral += costoVenta;
      }
    }
  });

  html += `</table>`;

  // 💸 gastos y costos DEL MISMO RANGO de fechas del reporte
  let totalGastosPeriodo = 0;
  gastosSnap.forEach(doc => {
    const g = doc.data();
    const fechaG = g.fecha?.toDate ? g.fecha.toDate() : new Date(g.fecha);
    const fechaGStr = soloFechaLocal(fechaG);
    if (fechaGStr >= inicioStr && fechaGStr <= finStr) {
      totalGastosPeriodo += g.valor || 0;
    }
  });

  let totalCostosPeriodo = 0;
  costosSnap.forEach(doc => {
    const c = doc.data();

    // 🔒 los costos generados automáticamente al ingresar inventario NO se
    // restan aquí — ese costo ya está reflejado en "Costo de productos
    // vendidos" cuando el producto se vende. Restarlo también aquí sería
    // contarlo dos veces.
    if (c.origen === "inventario") return;

    const fechaC = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha);
    const fechaCStr = soloFechaLocal(fechaC);
    if (fechaCStr >= inicioStr && fechaCStr <= finStr) {
      totalCostosPeriodo += c.valor || 0;
    }
  });

  const utilidadNeta = totalGeneral - costoProductosGeneral - totalGastosPeriodo - totalCostosPeriodo;
  const colorUtilidad = utilidadNeta >= 0 ? "var(--exito)" : "var(--peligro)";

  // 📥 guardar el resumen para poder exportarlo junto con el detalle
  resumenReporteActual = {
    inicio,
    fin,
    totalGeneral,
    totalDescuentoGeneral,
    totalProductos,
    costoProductosGeneral,
    totalGastosPeriodo,
    totalCostosPeriodo,
    utilidadNeta
  };

  html += `
    <div style="margin-top:20px;">
      <h3>Total vendido: $${formatoMiles(totalGeneral)}</h3>
      <h3>Total descuentos: $${formatoMiles(totalDescuentoGeneral)}</h3>
      <h3>Total productos vendidos: ${totalProductos}</h3>

      <hr style="border-color:var(--border-soft);margin:16px 0;">

      <h3>💰 Costo de productos vendidos: $${formatoMiles(costoProductosGeneral)}</h3>
      <h3>💸 Gastos del periodo: $${formatoMiles(totalGastosPeriodo)}</h3>
      <h3>💰 Costos del periodo (manuales): $${formatoMiles(totalCostosPeriodo)}</h3>

      <h3 style="color:${colorUtilidad};font-size:18px;margin-top:10px;">
        📊 Utilidad neta: $${formatoMiles(utilidadNeta)}
      </h3>
    </div>
  `;

  const contenedor = document.getElementById("tablaReporte");
  if (!contenedor) return;

  contenedor.innerHTML = html;

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al generar el reporte ❌");

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }
}

async function guardarGasto(btn) {
  if (btn.disabled) return; // 🚫 evita doble click
  const proveedor = document.getElementById("proveedorGasto").value;
  const descripcion = document.getElementById("descripcionGasto").value;
  let valor = document.getElementById("valorGasto").value;

  valor = parsearValorDecimal(valor);

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

    const proveedor = document.getElementById("proveedorCosto").value;
    const descripcion = document.getElementById("descripcionCosto").value;
    let valor = document.getElementById("valorCosto").value;

    valor = parsearValorDecimal(valor);

    // 🔍 validación
    if (!proveedor || !descripcion || !valor) {
      mostrarMensaje("Completa los campos");
      return;
    }

    const idCosto = await generarSiguienteIdCosto();

    await db.collection("costos").add({
      idCosto,
      proveedor,
      descripcion,
      valor,
      fecha: new Date(),
      origen: "manual"
    });

    mostrarMensaje("Costo guardado ✅");

    // 🧹 limpiar
    document.getElementById("proveedorCosto").value = "";
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

    let options = `<option value="">Seleccionar proveedor</option>`;

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
// =====================
// 🏷️ CATEGORÍAS (ya no quedan quemadas en el código)
// =====================
async function cargarListaCategorias() {
  const contenedor = document.getElementById("tablaCategorias");
  if (!contenedor) return;

  try {
    const snapshot = await db.collection("categorias").orderBy("nombre").get();

    let html = "";

    snapshot.forEach(doc => {
      const c = doc.data();
      const nombreEscapado = (c.nombre || "").replace(/'/g, "\\'");

      html += `
        <tr>
          <td>${c.nombre || "-"}</td>
          <td>
            <button onclick="eliminarCategoria('${doc.id}', '${nombreEscapado}')">🗑️</button>
          </td>
        </tr>
      `;
    });

    contenedor.innerHTML = html ||
      `<tr><td colspan="2" style="text-align:center;opacity:0.7;">Sin categorías todavía</td></tr>`;

  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

async function guardarCategoria(btn) {
  if (btn.disabled) return;

  const input = document.getElementById("nombreCategoria");
  const nombre = input?.value.trim();

  if (!nombre) {
    mostrarMensaje("Escribe un nombre de categoría");
    return;
  }

  const textoOriginal = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Guardando...';

    // 🔍 evitar duplicados (ignorando mayúsculas/espacios)
    const clave = nombre.toLowerCase().trim();
    const existentes = await db.collection("categorias").get();

    const yaExiste = existentes.docs.some(doc =>
      (doc.data().nombre || "").toLowerCase().trim() === clave
    );

    if (yaExiste) {
      mostrarMensaje("⚠️ Esa categoría ya existe");
      return;
    }

    await db.collection("categorias").add({
      nombre,
      fecha: new Date()
    });

    mostrarMensaje("Categoría creada ✅");
    input.value = "";

    await cargarListaCategorias();
    await cargarCategoriasSelects();

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al guardar ❌");

  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

async function eliminarCategoria(id, nombre) {
  const borrar = async () => {
    try {
      await db.collection("categorias").doc(id).delete();
      mostrarMensaje("Categoría eliminada 🗑️");
      await cargarListaCategorias();
      await cargarCategoriasSelects();
    } catch (error) {
      console.error(error);
      mostrarMensaje("Error al eliminar ❌");
    }
  };

  // 🔒 no borra productos/inventario existentes, solo la opción de la lista;
  // los productos que ya tenían esa categoría conservan el texto que tenían
  if (typeof confirmarAccion === "function") {
    confirmarAccion(`¿Eliminar la categoría "${nombre}"?`, borrar);
  } else if (confirm(`¿Eliminar la categoría "${nombre}"?`)) {
    borrar();
  }
}

// 🔄 recarga TODOS los <select> de categoría del panel admin con datos reales
async function cargarCategoriasSelects() {
  const selects = [
    document.getElementById("categoriaInv"),
    document.getElementById("filtroCategoriaInventario"),
    document.getElementById("filtroCategoriaEditarInventario")
  ].filter(Boolean);

  if (selects.length === 0) return;

  try {
    const snapshot = await db.collection("categorias").orderBy("nombre").get();

    selects.forEach(select => {
      const valorActual = select.value;
      const esFiltro = select.id.startsWith("filtro");

      let options = esFiltro
        ? `<option value="">Todas las categorías</option>`
        : `<option value="">Seleccionar categoría</option>`;

      snapshot.forEach(doc => {
        const nombre = doc.data().nombre;
        if (!nombre) return;
        options += `<option value="${nombre}">${nombre}</option>`;
      });

      select.innerHTML = options;

      // conservar la selección previa si la categoría todavía existe
      const sigueExistiendo = [...select.options].some(o => o.value === valorActual);
      if (sigueExistiendo) select.value = valorActual;
    });

  } catch (error) {
    console.error("Error cargando categorías en selects:", error);
  }
}

// 🔄 llena el filtro de proveedor en "Ver inventario" con los proveedores reales
async function cargarFiltroProveedoresInventario() {
  const selects = [
    document.getElementById("filtroProveedorInventario"),
    document.getElementById("filtroProveedorCostos")
  ].filter(Boolean);

  if (selects.length === 0) return;

  try {
    const snapshot = await db.collection("proveedores").get();

    selects.forEach(select => {
      const valorActual = select.value;
      let options = `<option value="">Todos los proveedores</option>`;

      snapshot.forEach(doc => {
        const nombre = doc.data().nombre_proveedor;
        if (!nombre) return;
        options += `<option value="${nombre}">${nombre}</option>`;
      });

      select.innerHTML = options;

      if ([...select.options].some(o => o.value === valorActual)) {
        select.value = valorActual;
      }
    });

  } catch (error) {
    console.error("Error cargando proveedores en filtro:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  cargarCategoriasSelects();
  cargarFiltroProveedoresInventario();
  if (typeof cargarAlertasStock === "function") cargarAlertasStock();
});

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
