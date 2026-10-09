import { useRoutes } from "react-router-dom";
import ProtectedRoutes from "../../components/ProtectedRoutes";
import PanelLayout from "../../layouts/PanelLayout";
import PageNotFound from "../../components/PageNotFound";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../theme";
import { CssBaseline } from "@mui/material";
import "@fontsource/public-sans";

// User components
import UserDashboard from "../../components/user/dashboard/UserDashboard";
import MyCourses from "../../components/user/myCourses/MyCourses";
import AvailableCourses from "../../components/user/courses/AvailableCourses";
import Payments from "../../components/user/payments/Payments";
import Contact from "../../components/user/contact/Contact";
import MembershipCardPage from "../../components/user/MembershipCardPage";
import AcademicProfilePrompt from "../../components/user/shared/AcademicProfilePrompt";

const UserRoutes = () => {
  const routes = [
    {
      path: "/",
      element: (
        <ThemeProvider theme={theme}>
          <CssBaseline />

          <ProtectedRoutes allowedRoles={["user"]}>
            <AcademicProfilePrompt />
            <PanelLayout />
          </ProtectedRoutes>
        </ThemeProvider>
      ),
      children: [
        {
          index: true,
          element: <UserDashboard />,
        },
        {
          path: "my-courses",
          element: <MyCourses />,
        },
        {
          path: "courses",
          element: <AvailableCourses />,
        },
        {
          path: "payments",
          element: <Payments />,
        },
        {
          path: "contact",
          element: <Contact />,
        },
        {
          path: "card",
          element: <MembershipCardPage />,
        },
        {
          path: "*",
          element: <PageNotFound />,
        },
      ],
    },
    {
      path: "*",
      element: <PageNotFound />,
    },
  ];

  return useRoutes(routes);
};

export default UserRoutes;
