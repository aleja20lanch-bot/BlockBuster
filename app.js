function setRol(rol) {
  // ocultar todo
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "none";
  document.getElementById("ventas").style.display = "none";

  // mostrar según rol
  if (rol === "admin") {
    document.getElementById("admin").style.display = "block";
  }

  if (rol === "vendedor") {
    document.getElementById("ventas").style.display = "grid";
  }

  // mostrar botón logout
  document.getElementById("btnLogout").style.display = "block";
}