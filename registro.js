// Registro de micro frontends: qué ruta atiende cada uno, dónde está
// desplegado y cómo se monta. Es el ÚNICO lugar donde el contenedor
// "conoce" a los micro frontends.
window.REGISTRO_MFE = {
  '/catalogo': {
    nombre: 'Catalogo',
    url: 'http://localhost:8081/catalogo.js',
    tipo: 'funcion'            // expone window.renderCatalogo / window.unmountCatalogo
  },
  '/carrito': {
    nombre: 'Carrito',
    url: 'http://localhost:8082/carrito.js',
    tipo: 'funcion',
    precargar: true            // debe escuchar eventos aunque no esté en pantalla
  },
  '/perfil': {
    nombre: 'Perfil',
    url: 'http://localhost:8083/perfil.js',
    tipo: 'webcomponent',      // define la etiqueta <mfe-perfil>
    etiqueta: 'mfe-perfil'
  }
};
