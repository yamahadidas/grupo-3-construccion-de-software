"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { Box, Text, Flex, VStack, useBreakpointValue } from "@chakra-ui/react";

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

function parseLocalDate(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(isoStr, withYear = false) {
  const d = parseLocalDate(isoStr);
  if (!d) return "";
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return withYear
    ? `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    : `${d.getDate()} ${meses[d.getMonth()]}`;
}

function dateToFraction(date, start, end) {
  return Math.max(0, Math.min((date - start) / (end - start), 1));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getAllTags(eventos) {
  const set = new Set();
  eventos.forEach(e => (e.tags ?? []).forEach(t => t && set.add(t)));
  return Array.from(set).sort();
}

// Normaliza un string para comparar categorías sin que importen mayúsculas,
// tildes o espacios extra (errores típicos de tipeo en la hoja de cálculo).
function normalizeKey(str) {
  return (str ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Distribuye eventos en carriles optimizando el espacio.
// Coloca cada evento en el primer carril disponible sin importar su categoría.
function assignLanes(events, categoryOrder) {
  const result = [];
  const laneEnds = [];

  events.slice().sort((a, b) => a._startFrac - b._startFrac).forEach(ev => {
    // Busca un carril donde el evento anterior ya haya terminado
    let lane = laneEnds.findIndex(end => end <= ev._startFrac - 0.002);
    
    // Si no hay carriles libres, crea uno nuevo
    if (lane === -1) lane = laneEnds.length;
    
    laneEnds[lane] = ev._endFrac;
    result.push({ ...ev, _lane: lane });
  });

  return { events: result, totalLanes: Math.max(1, laneEnds.length) };
}

// Cuando dos eventos puntuales (rombos) caen en fechas muy cercanas dentro del
// mismo carril, sus textos quedan unos sobre otros. Esta función recorre los
// eventos (ya ordenados por fecha) y, si el siguiente cae demasiado cerca en
// píxeles del anterior dentro del mismo carril, lo empuja hacia abajo lo
// mínimo necesario para que no se solapen.
function staggerByLane(events, getLane, getRawTop, minGap) {
  const lastBottom = {};
  const tops = {};
  events.forEach(ev => {
    const lane = getLane(ev);
    const raw = getRawTop(ev);
    const prev = lastBottom[lane];
    const top = prev !== undefined && raw < prev + minGap ? prev + minGap : raw;
    tops[ev.id] = top;
    lastBottom[lane] = top;
  });
  return tops;
}

// ─── Modal de evento ─────────────────────────────────────────────────────────

function EventModal({ evento, catColor, catLabel, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!evento) return null;

  const isPuntual = !evento.fecha_termino;
  const dateStr = isPuntual
    ? formatDate(evento.fecha_inicio, true)
    : `${formatDate(evento.fecha_inicio, true)} — ${formatDate(evento.fecha_termino, true)}`;
  const color = catColor || "#6B7280";

  return (
    <Box
      ref={overlayRef}
      position="fixed" inset="0" zIndex="1000"
      display="flex" alignItems="center" justifyContent="center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", cursor: "default" }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <Box
        bg="white" borderRadius="20px"
        style={{ width: "min(480px, calc(100vw - 32px))", maxHeight: "80vh", overflowY: "auto",
                 boxShadow: "0 25px 60px rgba(0,0,0,0.2)", cursor: "default" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Franja color */}
        <Box h="6px" bg={color} style={{ borderRadius: "20px 20px 0 0" }} />

        <Box p="28px">
          {/* Header */}
          <Flex justify="space-between" align="flex-start" mb="20px">
            <Box flex="1" pr="12px">
              <Text fontSize="10px" fontWeight="700" letterSpacing="0.1em"
                    textTransform="uppercase" color={color} mb="6px">
                {catLabel || evento.categoria}
              </Text>
              <Text fontSize="20px" fontWeight="800" lineHeight="1.2" color="gray.900">
                {evento.nombre}
              </Text>
            </Box>
            <Box as="button" onClick={onClose} color="gray.400" p="6px" borderRadius="full"
                 style={{ outline: "none", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                 _hover={{ bg: "gray.100", color: "gray.700" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Box>
          </Flex>

          {/* Fecha */}
          <Flex align="center" gap="8px" bg="gray.50" borderRadius="10px" px="14px" py="10px" mb="20px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <Text fontSize="13px" fontWeight="600" color="gray.700">
              {dateStr}
              {isPuntual && <Box as="span" ml="8px" fontSize="11px" fontWeight="400" color="gray.400">(puntual)</Box>}
            </Text>
          </Flex>

          {/* Descripción */}
          {evento.descripcion && (
            <VStack align="stretch" gap="6px" mb="20px">
              <Text fontSize="11px" fontWeight="700" color="gray.400" letterSpacing="0.08em" textTransform="uppercase">
                Descripción
              </Text>
              <Text fontSize="14px" lineHeight="1.65" color="gray.600">{evento.descripcion}</Text>
            </VStack>
          )}

          {/* Tags */}
          {evento.tags?.length > 0 && (
            <VStack align="stretch" gap="8px" mb="20px">
              <Text fontSize="11px" fontWeight="700" color="gray.400" letterSpacing="0.08em" textTransform="uppercase">
                Tags
              </Text>
              <Flex gap="6px" flexWrap="wrap">
                {evento.tags.map(tag => (
                  <Box key={tag} px="10px" py="4px" bg="gray.100" borderRadius="full"
                       fontSize="12px" fontWeight="500" color="gray.600">
                    #{tag}
                  </Box>
                ))}
              </Flex>
            </VStack>
          )}

          {/* URL */}
          {evento.url && (
            <Box as="a" href={evento.url} target="_blank" rel="noopener noreferrer"
                 display="flex" alignItems="center" gap="8px" px="16px" py="12px"
                 bg={color} color="white" borderRadius="12px" fontSize="13px" fontWeight="700"
                 style={{ textDecoration: "none" }}
                 _hover={{ opacity: 0.9 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Ver más información
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Panel de filtros ─────────────────────────────────────────────────────────

function FilterPanel({ categorias, activeCats, onToggleCat, allTags, activeTags, onToggleTag, onResetAll }) {
  const totalActive = activeCats.size + activeTags.size;
  return (
    <Box bg="white" borderRadius="16px" p="20px"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #F3F4F6" }}>
      <Flex justify="space-between" align="center" mb="16px">
        <Text fontWeight="700" fontSize="13px" color="gray.800" letterSpacing="0.05em" textTransform="uppercase">
          Filtros
        </Text>
        {totalActive > 0 && (
          <Box as="button" onClick={onResetAll} fontSize="11px" color="gray.400"
               style={{ outline: "none", background: "none", border: "none", cursor: "pointer" }}
               _hover={{ color: "gray.700" }}>
            Limpiar todo
          </Box>
        )}
      </Flex>

      {/* Categorías */}
      <VStack align="stretch" gap="8px" mb="20px">
        <Text fontSize="11px" fontWeight="600" color="gray.400" letterSpacing="0.08em" textTransform="uppercase">
          Categorías
        </Text>
        <Flex gap="6px" flexWrap="wrap">
          {categorias.map(cat => {
            const active = activeCats.has(cat.id);
            return (
              <Box key={cat.id} as="button" onClick={() => onToggleCat(cat.id)}
                   px="10px" py="5px" borderRadius="full" fontSize="12px" fontWeight="600"
                   style={{
                     outline: "none", cursor: "pointer", userSelect: "none",
                     border: `2px solid ${active ? cat.color : "transparent"}`,
                     background: active ? cat.color : "#F3F4F6",
                     color: active ? "white" : "#6B7280",
                     transition: "all 0.15s",
                   }}>
                {cat.label}
              </Box>
            );
          })}
        </Flex>
      </VStack>

      {/* Tags */}
      {allTags.length > 0 && (
        <VStack align="stretch" gap="8px">
          <Text fontSize="11px" fontWeight="600" color="gray.400" letterSpacing="0.08em" textTransform="uppercase">
            Tags
          </Text>
          <Flex gap="6px" flexWrap="wrap">
            {allTags.map(tag => {
              const active = activeTags.has(tag);
              return (
                <Box key={tag} as="button" onClick={() => onToggleTag(tag)}
                     px="10px" py="4px" borderRadius="full" fontSize="11px" fontWeight="500"
                     style={{
                       outline: "none", cursor: "pointer", userSelect: "none",
                       border: `1.5px solid ${active ? "#1F2937" : "#D1D5DB"}`,
                       background: active ? "#1F2937" : "white",
                       color: active ? "white" : "#6B7280",
                       transition: "all 0.15s",
                     }}>
                  #{tag}
                </Box>
              );
            })}
          </Flex>
        </VStack>
      )}
    </Box>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const PADDING_TOP = 16;
const PADDING_BOTTOM = 16;
const MONTH_LABEL_W = 50;
const AXIS_W = 2;
const MIN_H_FOR_TEXT = 22;

function Timeline({ eventos, categorias, onEventClick }) {
  const LANE_W = useBreakpointValue({ base: 80, md: 150 }) || 150;
  const TOTAL_HEIGHT = 5000;
  const containerRef = useRef(null);
  const [containerH, setContainerH] = useState(800);

  useLayoutEffect(() => {
    const measure = () => setContainerH(containerRef.current?.clientHeight || 800);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Determinar año dominante
  const year = useMemo(() => {
    const counts = {};
    eventos.forEach(e => {
      const y = parseInt((e.fecha_inicio || e.fecha_termino || "").split("-")[0]);
      if (y) counts[y] = (counts[y] || 0) + 1;
    });
    return parseInt(Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0] || new Date().getFullYear());
  }, [eventos]);

  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59);
  const usableH   = TOTAL_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const catMap = useMemo(() => {
    const m = {};
    categorias.forEach(c => (m[c.id] = c));
    return m;
  }, [categorias]);

  const fracToY = f => PADDING_TOP + f * usableH;

  // Procesar eventos
  const { feriados, withLanes, usedLanes } = useMemo(() => {
    const processed = eventos
      .map(ev => {
        const start = parseLocalDate(ev.fecha_inicio) ?? parseLocalDate(ev.fecha_termino);
        const end   = parseLocalDate(ev.fecha_termino) ?? start;
        if (!start) return null;
        const sf = dateToFraction(start, yearStart, yearEnd);
        const ef = dateToFraction(end,   yearStart, yearEnd);
        
        return { ...ev, _startFrac: sf, _endFrac: Math.max(ef, sf + 0.002),
                 _color: catMap[ev.categoria]?.color || "#9CA3AF" };
      })
      .filter(Boolean)
      .sort((a,b) => a._startFrac - b._startFrac);

    const feriados = processed.filter(e => e.categoria === "feriado");
    const normales = processed.filter(e => e.categoria !== "feriado");
    
    // Llamamos al nuevo assignLanes
    const { events: withLanes, totalLanes } = assignLanes(normales);
    
    return { feriados, withLanes, usedLanes: totalLanes };
  }, [eventos, catMap, yearStart, yearEnd]);

  const totalW = MONTH_LABEL_W + AXIS_W + 16 + LANE_W * usedLanes;

  // Posiciones ajustadas para que marcadores puntuales muy cercanos en fecha
  const punctualTops = useMemo(() => {
    const soloPuntuales = withLanes.filter(ev => fracToY(ev._endFrac) - fracToY(ev._startFrac) < 10);
    return staggerByLane(soloPuntuales, ev => ev._lane, ev => fracToY(ev._startFrac), 16);
  }, [withLanes, usableH]);

  return (
    <Box ref={containerRef} position="relative" w="100%" h="100%" overflowX="auto" overflowY="auto">
      <Box position="relative" style={{ minWidth: totalW, height: "100%" }}>

        {/* Eje vertical */}
        <Box position="absolute" bg="gray.200" style={{
          left: MONTH_LABEL_W - 1, 
          top: 0,
          height: TOTAL_HEIGHT,
          width: 2,
          zIndex: 0
        }} />

        {/* Marcas de mes y días intermedios (10 y 20) */}
        {MESES.map((label, i) => {
          const y1 = fracToY(dateToFraction(new Date(year, i, 1), yearStart, yearEnd));
          const y10 = fracToY(dateToFraction(new Date(year, i, 10), yearStart, yearEnd));
          const y20 = fracToY(dateToFraction(new Date(year, i, 20), yearStart, yearEnd));
          
          return (
            <Box key={label}>
              <Box position="absolute" style={{ top: y1, left: 0, right: 0 }}>
                <Text position="absolute" fontSize="11px" fontWeight="700" color="gray.600"
                      style={{ left: 0, top: -8, width: MONTH_LABEL_W - 12, textAlign: "right" }}>
                  {label}
                </Text>
                <Box position="absolute" style={{ left: MONTH_LABEL_W - 4, top: -1, width: 8, height: 2,
                  background: "#9CA3AF", borderRadius: 1 }} />
                <Box position="absolute" style={{ left: MONTH_LABEL_W, right: 0, top: 0, height: 1,
                  background: i === 0 ? "#9CA3AF" : "#E5E7EB" }} />
              </Box>

              <Box position="absolute" style={{ top: y10, left: 0, right: 0 }}>
                <Box position="absolute" style={{ left: MONTH_LABEL_W - 2, top: 0, width: 4, height: 1,
                  background: "#D1D5DB" }} />
                <Box position="absolute" style={{ left: MONTH_LABEL_W, right: 0, top: 0, height: 1,
                  borderTop: "1px dashed #E5E7EB" }} />
              </Box>

              <Box position="absolute" style={{ top: y20, left: 0, right: 0 }}>
                <Box position="absolute" style={{ left: MONTH_LABEL_W - 2, top: 0, width: 4, height: 1,
                  background: "#D1D5DB" }} />
                <Box position="absolute" style={{ left: MONTH_LABEL_W, right: 0, top: 0, height: 1,
                  borderTop: "1px dashed #E5E7EB" }} />
              </Box>
            </Box>
          );
        })}

        {/* Feriados */}
        {feriados.map(ev => {
          const y = fracToY(ev._startFrac);
          
          return (
            <Box key={ev.id} position="absolute" 
                 style={{ top: y, left: 0, right: 0, zIndex: 3, cursor: "pointer" }}
                 onClick={() => onEventClick(ev)} 
                 title={ev.nombre}>
              <Box position="absolute" style={{ left: MONTH_LABEL_W, right: 0, top: 0, height: 1 }} 
                   bg="#FBBF24" opacity="0.4" />
              <Box position="absolute" style={{ left: MONTH_LABEL_W - 4, top: -4, width: 8, height: 8,
                background: "#FBBF24", borderRadius: "50%", border: "2px solid white",
                boxShadow: "0 0 0 1px #F59E0B" }} />
              <Text position="absolute" fontSize="9px" fontWeight="800" color="yellow.600"
                    px="4px" py="1px" 
                    style={{ 
                      right: `calc(100% - ${MONTH_LABEL_W - 8}px)`, 
                      top: -7, 
                      whiteSpace: "nowrap",
                      background: "transparent"
                    }}>
                Feriado
              </Text>
            </Box>
          );
        })}

        {/* Eventos en lanes */}
        {withLanes.map(ev => {
          const top    = fracToY(ev._startFrac);
          const height = Math.max(8, fracToY(ev._endFrac) - top);
          const left   = MONTH_LABEL_W + AXIS_W + 16 + ev._lane * LANE_W;
          const isPunctual = height < 10;

          if (isPunctual) {
            const adjTop = punctualTops[ev.id] ?? top;
            return (
              <Box key={ev.id} position="absolute" display="flex" alignItems="center"
                   style={{ top: adjTop - 6, left, width: LANE_W - 4, cursor: "pointer", zIndex: 2 }}
                   onClick={() => onEventClick(ev)} title={ev.nombre}>
                <Box w="11px" h="11px" bg={ev._color} flexShrink={0}
                     style={{ transform: "rotate(45deg)", borderRadius: 2,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                <Text ml="8px" fontSize="11px" fontWeight="600" color="gray.800"
                      style={{ overflow: "hidden", textOverflow: "ellipsis",
                               whiteSpace: "nowrap", maxWidth: LANE_W - 28 }}>
                  {ev.nombre}
                </Text>
              </Box>
            );
          }

          return (
            <Box key={ev.id} position="absolute" borderRadius="8px" overflow="hidden"
                 display="flex" flexDirection="column" justifyContent="flex-start"
                 style={{
                   top, left, width: LANE_W - 4, height,
                   background: hexToRgba(ev._color, 0.13),
                   border: `2px solid ${ev._color}`,
                   cursor: "pointer", zIndex: 2,
                   transition: "background 0.12s, box-shadow 0.12s",
                   padding: height >= MIN_H_FOR_TEXT ? "5px 8px" : "0 8px",
                 }}
                 onClick={() => onEventClick(ev)}
                 title={ev.nombre}
                 onMouseEnter={e => {
                   e.currentTarget.style.background = hexToRgba(ev._color, 0.27);
                   e.currentTarget.style.boxShadow = `0 2px 12px ${hexToRgba(ev._color, 0.35)}`;
                   e.currentTarget.style.zIndex = 10;
                 }}
                 onMouseLeave={e => {
                   e.currentTarget.style.background = hexToRgba(ev._color, 0.13);
                   e.currentTarget.style.boxShadow = "none";
                   e.currentTarget.style.zIndex = 2;
                 }}>
              {height >= MIN_H_FOR_TEXT && (
                <Text fontSize="11px" fontWeight="700" color="gray.900" lineHeight="1.3"
                      style={{
                        display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden",
                        WebkitLineClamp: Math.max(1, Math.floor(height / 16)),
                        wordBreak: "break-word",
                      }}>
                  {ev.nombre}
                </Text>
              )}
            </Box>
          );
        })}

        {/* Línea de hoy */}
        {(() => {
          const today = new Date();
          if (today.getFullYear() !== year) return null;
          const y = fracToY(dateToFraction(today, yearStart, yearEnd));
          return (
            <Box key="today" position="absolute" style={{ top: y, left: 0, right: 0, zIndex: 5 }}>
              <Box position="absolute" style={{ left: MONTH_LABEL_W, right: 0, top: 0, height: 2 }} 
                   bg="red.400" opacity="0.8" />
              <Box position="absolute" style={{ left: MONTH_LABEL_W - 4, top: -4, width: 10, height: 10,
                background: "#F87171", borderRadius: "50%", border: "2px solid white",
                boxShadow: "0 0 0 2px #FCA5A5" }} />
              <Text position="absolute" fontSize="10px" fontWeight="800" color="red.500"
                    px="4px" py="1px"
                    style={{ 
                      right: `calc(100% - ${MONTH_LABEL_W - 8}px)`, 
                      top: -8, 
                      background: "transparent",
                      whiteSpace: "nowrap"
                    }}>
                hoy
              </Text>
            </Box>
          );
        })()}
      </Box>
    </Box>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Home() {
  const [eventos, setEventos]     = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeCats, setActiveCats] = useState(new Set());
  const [activeTags, setActiveTags] = useState(new Set());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen]   = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json(); })
      .then(d => { setEventos(d.eventos ?? []); setCategorias(d.categorias ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Reconcilia ev.categoria con los id reales de la hoja "categorias".
  // Si en la hoja "eventos" alguien tipeó la categoría con mayúsculas, tildes
  // o espacios distintos a como está en la hoja "categorias", antes quedaba
  // como una categoría "desconocida" (columna propia, sin color ni nombre
  // reconocido). Acá se corrige automáticamente comparando versiones
  // normalizadas, y se avisa por consola para que se pueda arreglar en la
  // fuente (Google Sheets) si corresponde.
  const eventosNormalizados = useMemo(() => {
    if (!categorias.length) return eventos;
    const porIdNormalizado = new Map(categorias.map(c => [normalizeKey(c.id), c.id]));
    return eventos.map(ev => {
      const canon = porIdNormalizado.get(normalizeKey(ev.categoria));
      if (!canon) {
        console.warn(`[calendario] categoría "${ev.categoria}" (evento "${ev.nombre}") no coincide con ninguna categoría definida en la hoja "categorias".`);
        return ev;
      }
      if (canon !== ev.categoria) {
        console.warn(`[calendario] categoría "${ev.categoria}" normalizada a "${canon}" (evento "${ev.nombre}").`);
        return { ...ev, categoria: canon };
      }
      return ev;
    });
  }, [eventos, categorias]);

  const allTags = useMemo(() => getAllTags(eventosNormalizados), [eventosNormalizados]);
  const catMap  = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias]);

  const filtered = useMemo(() => {
    if (!activeCats.size && !activeTags.size) return eventosNormalizados;
    return eventosNormalizados.filter(ev => {
      const catOk = !activeCats.size || activeCats.has(ev.categoria);
      const tagOk = !activeTags.size || (ev.tags ?? []).some(t => activeTags.has(t));
      return catOk && tagOk;
    });
  }, [eventosNormalizados, activeCats, activeTags]);

  const toggleCat = useCallback(id => setActiveCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleTag = useCallback(t  => setActiveTags(p => { const n = new Set(p); n.has(t)  ? n.delete(t)  : n.add(t);  return n; }), []);
  const resetAll  = useCallback(() => { setActiveCats(new Set()); setActiveTags(new Set()); }, []);

  const selCat = selectedEvent ? catMap[selectedEvent.categoria] : null;

  return (
    <Flex direction="column" h="100vh" bg="gray.50" overflow="hidden">

      {/* Header Responsive */}
      <Box as="header" bg="white" minH="64px" 
           px={{ base: "16px", md: "40px" }} py="12px"
           display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="16px"
           position="sticky" top="0" zIndex="100"
           style={{ borderBottom: "1px solid #F3F4F6", boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
        
        {/* Título, Logo y Botón de Leyenda para Móviles */}
        <Flex align="center" justify="space-between" w={{ base: "100%", md: "auto" }} flexShrink={0}>
          <Flex align="center" gap="12px">
            <Box w="32px" h="32px" bg="gray.900" borderRadius="8px"
                 display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="14" height="13" rx="2" stroke="white" strokeWidth="1.5"/>
                <line x1="5" y1="0" x2="5" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="0" x2="11" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1" y1="7" x2="15" y2="7" stroke="white" strokeWidth="1.5"/>
              </svg>
            </Box>
            <Box>
              <Text fontSize="15px" fontWeight="800" color="gray.900" lineHeight="1">Calendario Académico</Text>
              <Text fontSize="11px" color="gray.400" fontWeight="500" mt="1px">{new Date().getFullYear()}</Text>
            </Box>
          </Flex>

          {/* Botón que SOLO se ve en celulares para desplegar la leyenda */}
          <Box as="button" display={{ base: "flex", md: "none" }} 
               alignItems="center" gap="6px" px="10px" py="6px" 
               borderRadius="6px" bg="gray.100" color="gray.600"
               onClick={() => setIsLegendOpen(!isLegendOpen)}>
            <Text fontSize="11px" fontWeight="700">Leyenda</Text>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                 style={{ transform: isLegendOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Box>
        </Flex>

        {/* Leyenda */}
        {categorias.length > 0 && (
          <Flex align="center" gap="16px" flexWrap="wrap" flex="1" 
                ml={{ base: 0, md: "20px" }}
                display={{ base: isLegendOpen ? "flex" : "none", md: "flex" }} 
                w={{ base: "100%", md: "auto" }}>
            
            <Flex align="center" gap="6px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <Text fontSize="10px" fontWeight="700" color="gray.400" letterSpacing="0.08em" textTransform="uppercase">
                Leyenda:
              </Text>
            </Flex>
            
            {categorias.map(cat => (
              <Flex key={cat.id} align="center" gap="6px">
                <Box w="10px" h="10px" bg={cat.color} borderRadius="2px" flexShrink={0} />
                <Text fontSize="11px" color="gray.600" fontWeight="600">{cat.label}</Text>
              </Flex>
            ))}
            
            <Flex align="center" gap="6px">
              <Box w="10px" h="10px" bg="yellow.400" borderRadius="full" flexShrink={0}
                   style={{ border: "2px solid #F59E0B" }} />
              <Text fontSize="11px" color="gray.600" fontWeight="600">Feriado</Text>
            </Flex>
          </Flex>
        )}

        {/* Indicador de estado (Se oculta en celulares para ahorrar espacio) */}
        <Flex align="center" gap="8px" flexShrink={0} display={{ base: "none", md: "flex" }}>
          <Box w="8px" h="8px" bg="green.400" borderRadius="full" />
          <Text fontSize="11px" color="gray.400" fontWeight="500">Datos en vivo</Text>
        </Flex>
      </Box>

      {/* Cuerpo */}
      {loading ? (
        <Flex flex="1" direction="column" align="center" justify="center" gap="16px">
          <Box w="40px" h="40px" borderRadius="full"
               style={{ border: "3px solid #E5E7EB", borderTopColor: "#6B7280",
                        animation: "spin 0.8s linear infinite" }} />
          <Text fontSize="14px" color="gray.400" fontWeight="500">Cargando calendario…</Text>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Flex>
      ) : error ? (
        <Flex flex="1" direction="column" align="center" justify="center" gap="12px">
          <Text fontSize="32px">⚠️</Text>
          <Text fontSize="15px" fontWeight="700" color="gray.700">No se pudo cargar el calendario</Text>
          <Text fontSize="13px" color="gray.400" textAlign="center">{error}</Text>
        </Flex>
      ) : (
<Flex flex="1" overflow="hidden" position="relative">

          {/* Pestaña visible en el borde izquierdo para ABRIR el menú de categorías/filtros */}
          <Flex 
            position="absolute" left="0" top="50%" transform="translateY(-50%)" 
            w="28px" h="80px" zIndex="150"
            bg="white" border="1px solid #E5E7EB" borderLeft="none" 
            style={{ borderRadius: "0 12px 12px 0", cursor: "pointer", boxShadow: "3px 0 10px rgba(0,0,0,0.05)" }}
            alignItems="center" justifyContent="center"
            onMouseEnter={() => setIsSidebarOpen(true)}
            display={isSidebarOpen ? "none" : "flex"}
            color="gray.400"
            _hover={{ color: "gray.600", bg: "gray.50" }}
            title="Abrir categorías y filtros"
          >
            {/* Icono de flecha (Chevron) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Flex>

          {/* Mantenemos una línea invisible en todo el borde para que siga siendo fácil de abrir al deslizar el mouse rápidamente */}
          <Box 
            position="absolute" left="0" top="0" bottom="0" w="10px" zIndex="149"
            onMouseEnter={() => setIsSidebarOpen(true)}
            display={isSidebarOpen ? "none" : "block"} 
          />

          {/* Sidebar Desplegable (flota por encima del calendario) */}
          <Box 
            position="absolute"
            top="0" bottom="0"
            // Si está abierto su posición es 0 (visible), si está cerrado se esconde a -280px
            left={isSidebarOpen ? "0" : "-280px"} 
            w="280px" flexShrink={0} overflowY="auto" p="20px" bg="gray.50"
            zIndex="200"
            transition="left 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s"
            style={{ 
              borderRight: "1px solid #F3F4F6", 
              boxShadow: isSidebarOpen ? "5px 0 25px rgba(0,0,0,0.1)" : "none" 
            }}
            // Cuando el mouse sale de este contenedor, se cierra
            onMouseLeave={() => setIsSidebarOpen(false)}
          >
            <FilterPanel
              categorias={categorias} activeCats={activeCats} onToggleCat={toggleCat}
              allTags={allTags}       activeTags={activeTags} onToggleTag={toggleTag}
              onResetAll={resetAll}
            />

            <Box mt="16px" px="4px">
              <Text fontSize="12px" color="gray.400" fontWeight="500">
                {filtered.length === eventos.length
                  ? `${eventos.length} eventos`
                  : `${filtered.length} de ${eventos.length} eventos`}
              </Text>
            </Box>
          </Box>

          {/* Timeline (ahora ocupa toooodo el espacio disponible) */}
          <Box flex="1" w="100%" overflow="hidden" position="relative">
            {filtered.length === 0 ? (
              <Flex flex="1" h="100%" direction="column" align="center" justify="center" gap="12px">
                <Text fontSize="36px">🔍</Text>
                <Text fontSize="15px" fontWeight="700" color="gray.700">Sin eventos para mostrar</Text>
                <Text fontSize="13px" color="gray.400">Ajusta los filtros para ver más eventos.</Text>
              </Flex>
            ) : (
              // Le agregamos un padding a la izquierda para que el contenido no quede tan pegado al borde cuando el menú esté cerrado
              <Box h="100%" pl="32px" pr="24px" py="20px">
                <Timeline eventos={filtered} categorias={categorias} onEventClick={setSelectedEvent} />
              </Box>
            )}
          </Box>

        </Flex>
      )}

      {/* Modal */}
      {selectedEvent && (
        <EventModal evento={selectedEvent} catColor={selCat?.color} catLabel={selCat?.label}
                    onClose={() => setSelectedEvent(null)} />
      )}
    </Flex>
  );
}
