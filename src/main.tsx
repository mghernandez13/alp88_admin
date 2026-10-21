import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthContextProvider } from "./components/context/AuthContext";
import ApolloWrapper from "./graphql/client.tsx";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes.tsx";
import { ThemeProvider } from "./components/context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthContextProvider>
        <ApolloWrapper>
          <RouterProvider router={router} />
        </ApolloWrapper>
      </AuthContextProvider>
    </ThemeProvider>
  </StrictMode>,
);
