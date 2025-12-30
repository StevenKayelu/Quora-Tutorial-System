import { useRoutes } from "react-router-dom";
import ProtectedRoutes from "../../components/ProtectedRoutes";
import PanelLayout from "../../layouts/PanelLayout";
import PageNotFound from "../../components/PageNotFound";
import { ThemeProvider } from "@emotion/react";
import theme from "../../theme";
import { CssBaseline } from "@mui/material";
import "@fontsource/public-sans";
import { NAV_LINKS } from "../../utils/navLinks";

// Import admin components 
import AdminDashboard from "../../components/admin/dashboard/AdminDashboard";
import AdminSchools from "../../components/admin/schools/Schools";
import AdminCourses from "../../components/admin/courses/Courses";
import AdminTopics from "../../components/admin/topics/Topics";
import AdminUsers from "../../components/admin/users/Users";
import AdminPayments from "../../components/admin/payments/Payments";
import AdminSystemInfo from "../../components/admin/system/SystemInfo";
const AdminRoutes = () => {
  const routes = useRoutes([
    {
      path: "*",
      element: (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ProtectedRoutes allowedRoles={["admin"]}>
            {useRoutes([
              {
                path: "/",
                element: <PanelLayout />,
                children: [
                  { index: true, element: <AdminDashboard /> },
                  { path: "schools", element: <AdminSchools /> },
                  { path: "courses", element: <AdminCourses /> },
                  { path: "topics", element: <AdminTopics /> },
                  { path: "users", element: <AdminUsers /> },
                  { path: "payments", element: <AdminPayments /> },
                  { path: "system-info", element: <AdminSystemInfo /> },
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

export default AdminRoutes;
