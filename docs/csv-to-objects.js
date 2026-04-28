// csv-to-objects.js
const fs = require('fs');
const path = require('path');

// Configura los nombres de archivo
const inputCsv = path.join(__dirname, 'Base de datos 1 - DB1.csv');
const outputJs = path.join(__dirname, 'objects.js');

// Orden y nombres de campos esperados
const fields = [
  'Fabricante',
  'ID_Dispositivo',
  'Modelo',
  'Credencial_Usuario',
  'Credencial_Password',
  'Tipo_Servicio',
  'Puerto_Default',
  'Nivel_Riesgo_CVSS',
  'Guia_Remediacion'
];

// Función para parsear CSV a objetos
function parseCSVtoObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  const header = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = [];
    let current = '';
    let inQuotes = false;
    for (let char of lines[i]) {
      if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);

    // Mapea los campos en el orden correcto
    const obj = {};
    fields.forEach((field, idx) => {
      obj[field] = row[idx] !== undefined ? row[idx] : '';
    });
    data.push(obj);
  }
  return data;
}

// Lee el CSV (UTF-8)
const csvContent = fs.readFileSync(inputCsv, 'utf8');
const objects = parseCSVtoObjects(csvContent);

// Genera el archivo JS exportando el array
const jsContent =
  '// Archivo generado automáticamente. Codificación UTF-8.\n' +
  'export const defaultCredsData = ' +
  JSON.stringify(objects, null, 2) +
  ';\n';

fs.writeFileSync(outputJs, jsContent, 'utf8');
console.log('Archivo objects.js generado correctamente.');