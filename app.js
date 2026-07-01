firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);


// =====================
// HELPERS
// =====================

function mostrar(id, display) {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
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
