import "./globals.css";
import { Provider } from "@/components/ui/provider";
import GlobalClickListener from "@/components/ui/GlobalClickListener"; // 👈 1. Lo importas

export const metadata = {
  title: "Calendario Académico",
  description: "Calendario académico interactivo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {/* 👈 2. Lo colocas aquí para que empiece a escuchar los clics nya! */}
        <GlobalClickListener /> 
        
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}