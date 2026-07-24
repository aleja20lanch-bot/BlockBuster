firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);


// =====================
// HELPERS
// =====================

function mostrar(id, display) {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}


// =====================
// CONFIRMACIÓN (reemplaza confirm() nativo del navegador)
// =====================

function confirmarAccion(mensaje, onAceptar, onCancelar) {

  const modal = document.getElementById("modalConfirmar");
  const mensajeEl = document.getElementById("mensajeConfirmar");
  const btnAceptar = document.getElementById("btnConfirmarAceptar");
  const btnCancelar = document.getElementById("btnConfirmarCancelar");

  if (!modal || !mensajeEl || !btnAceptar || !btnCancelar) {
    // Respaldo por si el modal no está en el DOM
    if (confirm(mensaje)) onAceptar();
    else if (typeof onCancelar === "function") onCancelar();
    return;
  }

  mensajeEl.textContent = mensaje;
  modal.style.display = "flex";

  function limpiar() {
    modal.style.display = "none";
    btnAceptar.removeEventListener("click", aceptar);
    btnCancelar.removeEventListener("click", cancelar);
  }

  function aceptar() {
    limpiar();
    onAceptar();
  }

  function cancelar() {
    limpiar();
    if (typeof onCancelar === "function") onCancelar();
  }

  btnAceptar.addEventListener("click", aceptar);
  btnCancelar.addEventListener("click", cancelar);
}


// =====================
// FIREBASE
// =====================

const auth = firebase.auth();
const db = firebase.firestore();


// =====================
// LOGIN
// =====================

function login() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;


  auth.signInWithEmailAndPassword(email, password)

  .then(() => {

    mostrarMensaje("Bienvenido 🎬");

  })

  .catch(() => {

    mostrarMensaje("Error al iniciar sesión");

  });

}


// =====================
// SESIÓN
// =====================

auth.onAuthStateChanged(user => {

  if (user) {

    mostrar("login","none");

    obtenerRol(user.uid);

    cargarCategoriasProductos();

  } else {

    mostrar("login","block");
    mostrar("admin","none");
    mostrar("ventas","none");

  }

});