import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            element: (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(ProtectedRoutes, { allowedRoles: ["user"], children: useRoutes([
                            {
                                path: "/",
                                element: _jsx(PanelLayout, {}),
                                children: [
                                    { index: true, element: _jsx(UserDashboard, {}) },
                                    { path: "my-courses", element: _jsx(MyCourses, {}) },
                                    { path: "courses", element: _jsx(AvailableCourses, {}) },
                                    { path: "payments", element: _jsx(Payments, {}) },
                                    { path: "contact", element: _jsx(Contact, {}) },
                                    { path: "*", element: _jsx(PageNotFound, {}) },
                                ],
                            },
                        ]) })] })),
        },
        { path: "*", element: _jsx(PageNotFound, {}) },
    ]);
    return routes;
};
export default UserRoutes;
