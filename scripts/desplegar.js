// Simula el despliegue independiente de un micro frontend (solo módulos nativos).
//
// Uso (desde contenedor/):
//   node scripts/desplegar.js catalogo 1.1.0
//   npm run desplegar -- catalogo 1.1.0
//
// Cambia SOLO en el repo de ese micro frontend: la constante VERSION y un cambio visible
// (el color de la etiqueta de versión, que depende de la versión) y hace el commit ahí.
// No toca otros repos ni reinicia servidores: como el contenedor descarga cada script con
// ?v=Date.now() y los servidores responden Cache-Control: no-store, basta recargar la página
// para ver la nueva versión (navegar entre secciones NO vuelve a descargar un script ya cargado).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ_TALLER = path.resolve(__dirname, '..', '..');
const MFES = {
  catalogo:    { carpeta: 'mfe-catalogo',    archivo: 'catalogo.js' },
  carrito:     { carpeta: 'mfe-carrito',     archivo: 'carrito.js' },
  perfil:      { carpeta: 'mfe-perfil',      archivo: 'perfil.js' },
  seguimiento: { carpeta: 'mfe-seguimiento', archivo: 'seguimiento.js' }
};
const COLORES = ['#a8431f', '#6b3fa0', '#0e7c66', '#1d5fa8', '#8a5a00'];

function salir(mensaje) {
  console.error('✗ ' + mensaje);
  process.exit(1);
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd: cwd, encoding: 'utf8' }).trim();
}

const nombre = process.argv[2];
const version = process.argv[3];
if (!nombre || !version) salir('Uso: node scripts/desplegar.js <' + Object.keys(MFES).join('|') + '> <versión>   (ej.: catalogo 1.1.0)');
if (!MFES[nombre]) salir('Micro frontend desconocido: "' + nombre + '". Opciones: ' + Object.keys(MFES).join(', '));
if (!/^\d+\.\d+\.\d+$/.test(version)) salir('La versión debe tener el formato x.y.z (recibido: "' + version + '")');

const mfe = MFES[nombre];
const repo = path.join(RAIZ_TALLER, mfe.carpeta);
const archivo = path.join(repo, mfe.archivo);
if (!fs.existsSync(archivo)) salir('No existe ' + archivo);

if (git(repo, ['status', '--porcelain']) !== '') {
  salir('El repo ' + mfe.carpeta + ' tiene cambios sin confirmar. Confírmelos o descártelos antes de desplegar.');
}

const original = fs.readFileSync(archivo, 'utf8');
const actual = /const VERSION = '([^']*)';/.exec(original);
if (!actual) salir('No se encontró "const VERSION = \'…\';" en ' + mfe.archivo);
if (actual[1] === version) salir(mfe.carpeta + ' ya está en la versión ' + version + '.');

// Color determinista según la versión, distinto del que ya tiene la etiqueta
const reEtiqueta = /(\.(?:cat-|car-|seg-)?version \{[^}]*?\bcolor: )([^;]+);/;
const etiqueta = reEtiqueta.exec(original);
if (!etiqueta) salir('No se encontró la regla CSS de la etiqueta de versión en ' + mfe.archivo);
let indice = version.split('').reduce(function (acc, c) { return acc + c.charCodeAt(0); }, 0) % COLORES.length;
if (etiqueta[2] === COLORES[indice]) indice = (indice + 1) % COLORES.length;
const color = COLORES[indice];

const nuevo = original
  .replace(actual[0], "const VERSION = '" + version + "';")
  .replace(reEtiqueta, function (_, antes) { return antes + color + ';'; });
fs.writeFileSync(archivo, nuevo);

git(repo, ['add', mfe.archivo]);
git(repo, ['commit', '-m', 'chore(release): ' + mfe.carpeta + ' v' + version + '\n\nVERSION ' + actual[1] + ' → ' + version +
  '; la etiqueta de versión cambia a ' + color + '.']);

console.log('✓ ' + mfe.carpeta + ': ' + actual[1] + ' → ' + version + ' (etiqueta de versión ' + color + ')');
console.log('  commit ' + git(repo, ['rev-parse', '--short', 'HEAD']) + ' solo en el repo ' + mfe.carpeta);
console.log('  Sin reiniciar servidores: recargue http://localhost:8080 para ver la nueva versión.');
