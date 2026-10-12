import { Box, Paper, Stack, Typography, Tabs, Tab } from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { useState } from "react";
import ProtectedRoutes from "../../ProtectedRoutes";
import TransactionsTable from "./TransactionsTable.jsx";
import SubscriptionsTable from "./SubscriptionsTable";

export default function Payments() {
  const [tab, setTab] = useState(0);

  return (
    <ProtectedRoutes allowedRoles={["admin"]}>
      <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "white",
            mb: 3,
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Payments & Subscriptions
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Review payment transactions and manage the courses assigned to each student.
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: "divider", overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "grey.50",
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 56 },
            }}
          >
            <Tab icon={<ReceiptLongRoundedIcon fontSize="small" />} iconPosition="start" label="Transactions" />
            <Tab icon={<SchoolRoundedIcon fontSize="small" />} iconPosition="start" label="Subscriptions" />
          </Tabs>

          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {tab === 0 && <TransactionsTable />}
            {tab === 1 && <SubscriptionsTable />}
          </Box>
        </Paper>
      </Box>
    </ProtectedRoutes>
  );
}
