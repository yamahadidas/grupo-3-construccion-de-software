import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_EVENTOS = "eventos";
const SHEET_CATEGORIAS = "categorias";

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
  // Columnas: A=categoria B=nombre C=descripcion D=fecha_inicio E=fecha_termino F=url G=tag1 H=tag2 I=tag3
  const tags = [row[6], row[7], row[8]]
    .map((t) => t?.trim())
    .filter(Boolean);

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
    range: `${SHEET_EVENTOS}!A2:I`, // extendido hasta columna I para incluir tag1, tag2, tag3
  });
  const rows = res.data.values ?? [];
  return rows
    .map((row, i) => rowToEvento(row, i))
    .filter((e) => e.categoria !== "" && e.nombre !== "");
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

  const [eventos, categorias] = await Promise.all([
    readEventos(sheets),
    readCategorias(sheets),
  ]);

  cache = { eventos, categorias, rowCount: eventos.length, fetchedAt: now };
  return cache;
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
