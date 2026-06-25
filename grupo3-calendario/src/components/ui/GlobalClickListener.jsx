'use client';

import { useEffect } from 'react';

export default function GlobalClickListener() {
  useEffect(() => {
    const handleGlobalClick = async (evnt) => {
      const target = evnt.target;

      const etiqueta = target.tagName ? target.tagName.toLowerCase() : 'desconocido';
      const textoCompleto = target.textContent || '';
      const textoLimpio = textoCompleto.trim().slice(0, 60);
      const horaExacta = new Date().toISOString();

      // Preparamos el paquete de datos básios
      const datosDelClic = {
        etiqueta: etiqueta,
        texto: textoLimpio || '(Elemento sin texto visual)',
        fecha_hora: horaExacta
      };

      // 🚀 Enviamos el paquete a nuestra API para que le pegue la IP
      try {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosDelClic),
          // 'keepalive: true' asegura que se envíe incluso si cierras la pestaña rápido
          keepalive: true, 
        });
      } catch (err) {
        console.error("Error al enviar el log al servidor:", err);
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  return null;
}