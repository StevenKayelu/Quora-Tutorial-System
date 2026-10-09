import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import ContactSupportRoundedIcon from "@mui/icons-material/ContactSupportRounded";
import CardMembershipRoundedIcon from "@mui/icons-material/CardMembershipRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";

export const NAV_LINKS = {
  user: [
    { name: "Dashboard", path: "/user", icon: DashboardRoundedIcon },
    { name: "My Courses", path: "/user/my-courses", icon: MenuBookRoundedIcon },
    { name: "Available Courses", path: "/user/courses", icon: ExploreRoundedIcon },
    { name: "Payments", path: "/user/payments", icon: PaymentRoundedIcon },
    { name: "Contact", path: "/user/contact", icon: ContactSupportRoundedIcon },
    { name: "Membership Card", path: "/user/card", icon: CardMembershipRoundedIcon },
  ],

  admin: [
    { name: "Dashboard", path: "/admin", icon: DashboardRoundedIcon },
    { name: "Schools", path: "/admin/schools", icon: SchoolRoundedIcon },
    { name: "Study Years", path: "/admin/study-years", icon: EventNoteRoundedIcon },
    { name: "Courses", path: "/admin/courses", icon: MenuBookRoundedIcon },
    { name: "Topics", path: "/admin/topics", icon: ExploreRoundedIcon },
    { name: "Users", path: "/admin/users", icon: PeopleAltRoundedIcon },
    { name: "Payments", path: "/admin/payments", icon: PaymentRoundedIcon },
    { name: "System Info", path: "/admin/system-info", icon: SettingsRoundedIcon },
  ],
};
