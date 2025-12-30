import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Landing from "./pages/landing/LandingPage";
import HeaderLayout from "./layouts/HeaderLayout";
import AuthProviderRoutes from "./utils/routes/AuthProviderRoutes";
import "./style.css";
import  { useAuthContext  } from "./utils/hooks/useCustomContext"; 
import { CircularProgress, Box } from "@mui/material";

const queryClient = new QueryClient();

function App() {
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.VITE_BASENAME}>
        <Routes>
          {/* Public landing layout */}
          <Route element={<HeaderLayout />}>
            <Route index element={<Landing />} />
          </Route>

          {/* Auth & protected routes */}
          <Route path="/*" element={<AuthProviderRoutes />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
