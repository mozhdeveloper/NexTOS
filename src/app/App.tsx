// src/app/App.tsx
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}