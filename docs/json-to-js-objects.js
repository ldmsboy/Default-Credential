// Script Node.js para convertir un JSON estándar a sintaxis de objetos JS sin comillas en las claves
// Uso: node json-to-js-objects.js < input.json > output.js

const fs = require('fs');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  // Quita comillas de las claves (no de los valores)
  // Solo para arrays de objetos planos
  const jsLike = input.replace(/"(\w+)":/g, '$1:');
  process.stdout.write(jsLike);
});

// Si quieres usarlo directo en un archivo:
// node json-to-js-objects.js < defaultcreds-data.json > js-objects.txt
