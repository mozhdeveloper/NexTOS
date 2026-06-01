// src/app/AppProviders.tsx

import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import { TRPCProvider } from "@/providers/trpc";
import { Toaster } from "@/shared/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}