import { useRoutes } from "react-router-dom";
import ProtectedRoutes from "../../components/ProtectedRoutes";
import PanelLayout from "../../layouts/PanelLayout";
import PageNotFound from "../../components/PageNotFound";
import { ThemeProvider } from "@emotion/react";
import theme from "../../theme";
import { CssBaseline } from "@mui/material";
import "@fontsource/public-sans";
// Import user components
import UserDashboard from "../../components/user/dashboard/UserDashboard";
import MyCourses from "../../components/user/myCourses/MyCourses";
import AvailableCourses from "../../components/user/courses/AvailableCourses";
import Payments from "../../components/user/payments/Payments";
import Contact from "../../components/user/contact/Contact";

const UserRoutes = () => {
  const routes = useRoutes([
    {
      path: "*",
      element: (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ProtectedRoutes allowedRoles={["user"]}>
              {useRoutes([
                {
                  path: "/",
                  element: <PanelLayout />,
                  children: [
                    { index: true, element: <UserDashboard /> },
                    { path: "my-courses", element: <MyCourses /> },
                    { path: "courses", element: <AvailableCourses /> },
                    { path: "payments", element: <Payments /> },
                    { path: "contact", element: <Contact /> },
                    { path: "*", element: <PageNotFound /> },
                  ],
                },
              ])}
          </ProtectedRoutes>
        </ThemeProvider>
      ),
    },
    { path: "*", element: <PageNotFound /> },
  ]);

  return routes;
};

export default UserRoutes;
