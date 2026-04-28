// Script Node.js para convertir el archivo CSV a JSON para DefaultCreds
// Ejecuta: node csv-to-json.js

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'Base de datos 1.csv');
const outputFile = path.join(__dirname, 'defaultcreds-data.json');

// Leer el archivo CSV
const csv = fs.readFileSync(inputFile, 'utf8');
const lines = csv.split(/\r?\n/).filter(l => l.trim()).slice(1); // omite cabecera

function parseCSVLine(line) {
  // Quita comillas dobles internas
  const cleanLine = line.replace(/\"/g, '');
  const [Fabricante, Modelo, , Tipo_Servicio, Credencial_Usuario, Credencial_Password] = cleanLine.split(';');
  const guia = `Para este dispositivo/servicio (${Fabricante || ''}${Modelo ? ' ' + Modelo : ''}), se recomienda cambiar las credenciales por defecto inmediatamente, restringir el acceso al servicio (${Tipo_Servicio || ''}) y aplicar las mejores prácticas de seguridad recomendadas por el fabricante.`;
  return {
    Fabricante: Fabricante || "",
    Modelo: Modelo || "",
    Tipo_Servicio: Tipo_Servicio || "",
    Credencial_Usuario: Credencial_Usuario || "",
    Credencial_Password: Credencial_Password || "",
    Guia_Remediacion: guia
  };
}

const data = lines.map(parseCSVLine);
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`¡Conversión completada! Se generó el archivo ${outputFile} con ${data.length} registros.`);