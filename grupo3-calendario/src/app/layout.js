import "./globals.css";
import { Provider } from "@/components/ui/provider";

export const metadata = {
  title: "Calendario Académico",
  description: "Calendario académico interactivo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
