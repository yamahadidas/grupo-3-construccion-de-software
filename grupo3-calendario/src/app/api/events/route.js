import { google } from "googleapis";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SHEET_EVENTOS = "eventos";
const SHEET_CATEGORIAS = "categorias";

// 📁 Ruta del CSV: <raíz del proyecto Next.js>/data/historial.csv
const RUTA_CSV = path.join(process.cwd(), "data", "historial.csv");
const CABECERA_CSV = "fecha_hora,etiqueta,texto,ip\n";

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function parseFecha(str) {
  if (!str || typeof str !== "string" || str.trim() === "") return null;
  const [day, month, year] = str.trim().split("/");
  if (!day || !month || !year) return null;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}

function rowToEvento(row, index) {
  const tags = [row[6], row[7], row[8]].map((t) => t?.trim()).filter(Boolean);
  return {
    id: index + 2,
    categoria: row[0]?.trim() ?? "",
    nombre: row[1]?.trim() ?? "",
    descripcion: row[2]?.trim() ?? "",
    fecha_inicio: parseFecha(row[3]),
    fecha_termino: parseFecha(row[4]) ?? null,
    url: row[5]?.trim() ?? null,
    tags,
  };
}

function rowToCategoria(row) {
  return {
    id: row[0]?.trim() ?? "",
    label: row[1]?.trim() ?? "",
    color: row[2]?.trim() ?? "",
  };
}

async function readEventos(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_EVENTOS}!A2:I`,
  });
  const rows = res.data.values ?? [];
  return rows.map((row, i) => rowToEvento(row, i)).filter((e) => e.categoria !== "" && e.nombre !== "");
}

async function readCategorias(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_CATEGORIAS}!A2:C`,
  });
  const rows = res.data.values ?? [];
  return rows.map(rowToCategoria).filter((c) => c.id !== "");
}

let cache = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getRowCount(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_EVENTOS}!A2:A`,
  });
  return (res.data.values ?? []).length;
}

async function getData() {
  const sheets = await getSheetsClient();
  const now = Date.now();
  const cacheExpired = !cache || now - cache.fetchedAt > CACHE_TTL_MS;
  if (!cacheExpired) {
    const currentRowCount = await getRowCount(sheets);
    if (currentRowCount === cache.rowCount) return cache;
  }
  const [eventos, categorias] = await Promise.all([readEventos(sheets), readCategorias(sheets)]);
  cache = { eventos, categorias, rowCount: eventos.length, fetchedAt: now };
  return cache;
}

// 🧼 Escapa un valor para que no rompa el formato CSV
// (si trae comas, comillas o saltos de línea, lo encierra entre comillas dobles)
function escaparCampoCsv(valor) {
  const texto = String(valor ?? "");
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

// 💾 Guarda una línea del log de clics en historial.csv
async function guardarEnCsv(logCompleto) {
  const carpeta = path.dirname(RUTA_CSV);
  await fs.mkdir(carpeta, { recursive: true });

  // Si el archivo no existe todavía, lo creamos con la cabecera
  let archivoExiste = true;
  try {
    await fs.access(RUTA_CSV);
  } catch {
    archivoExiste = false;
  }
  if (!archivoExiste) {
    await fs.writeFile(RUTA_CSV, CABECERA_CSV, "utf8");
  }

  const fila = [
    escaparCampoCsv(logCompleto.fecha_hora),
    escaparCampoCsv(logCompleto.etiqueta),
    escaparCampoCsv(logCompleto.texto),
    escaparCampoCsv(logCompleto.ip),
  ].join(",");

  await fs.appendFile(RUTA_CSV, fila + "\n", "utf8");
}

export async function GET() {
  try {
    const { eventos, categorias } = await getData();
    return NextResponse.json({ eventos, categorias });
  } catch (err) {
    console.error("[GET /api/events]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const datosDelClic = await request.json();
    const ipUsuario = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const logCompleto = {
      ...datosDelClic,
      ip: ipUsuario.split(",")[0].trim(),
    };

    console.log("💾 [CLIC DETECTADO EN EL SERVIDOR]:", logCompleto);

    // 📝 Guardamos el clic en el historial.csv
    await guardarEnCsv(logCompleto);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/events]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}