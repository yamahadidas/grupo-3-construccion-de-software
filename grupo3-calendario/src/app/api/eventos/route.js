import { google } from "googleapis";
import { NextResponse } from "next/server";

const REQUIRED_ENV = ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "SPREADSHEET_ID"];
const SHEET_NAME = process.env.SHEET_NAME ?? "Sheet1";

function getJwtClient() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

async function getSheets() {
  const auth = getJwtClient();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

function rowToEvent(r, i) {
  return {
    id: i + 2,
    titulo: r[0] ?? "",
    fecha_inicio: r[1] ?? "",
    fecha_fin: r[2] ?? "",
    tags: r[3] ? String(r[3]).split(",").map((s) => s.trim()).filter(Boolean) : [],
    descripcion: r[4] ?? "",
    color: r[5] ?? "",
  };
}

async function readEvents() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:F`,
  });
  return (res.data.values ?? []).map(rowToEvent);
}

async function appendEvent(event) {
  const sheets = await getSheets();
  const row = [
    event.titulo,
    event.fecha_inicio,
    event.fecha_fin,
    Array.isArray(event.tags) ? event.tags.join(", ") : (event.tags ?? ""),
    event.descripcion ?? "",
    event.color ?? "",
  ];
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
  return res.data;
}

export async function GET() {
  try {
    const events = await readEvents();
    return NextResponse.json({ events });
  } catch (err) {
    console.error("[GET /api/eventos]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const required = ["titulo", "fecha_inicio", "fecha_fin"];
    for (const key of required) {
      if (!body[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }

    if (!isValidDate(body.fecha_inicio)) {
      return NextResponse.json({ error: "fecha_inicio must be YYYY-MM-DD" }, { status: 400 });
    }
    if (!isValidDate(body.fecha_fin)) {
      return NextResponse.json({ error: "fecha_fin must be YYYY-MM-DD" }, { status: 400 });
    }
    if (body.fecha_fin < body.fecha_inicio) {
      return NextResponse.json({ error: "fecha_fin must be after fecha_inicio" }, { status: 400 });
    }

    await appendEvent(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/eventos]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}