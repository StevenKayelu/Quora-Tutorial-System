import { Box, Paper,Stack, Typography, Tabs, Tab, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import ProtectedRoutes from "../../ProtectedRoutes";
import TransactionsTable from "./TransactionsTable.jsx";
import SubscriptionsTable from "./SubscriptionsTable";

export default function Payments() {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <ProtectedRoutes allowedRoles={["admin"]}>
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        <Paper
        elevation={3}
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 3,
          background: "linear-gradient(135deg, #1976d2 30%, #42a5f5 90%)",
          color: "white",
          mb: { xs: 3, md: 4 },
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Manage Payments & Subscriptions</Typography>
        </Stack>
      </Paper>

        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="fullWidth" // Mobile first: standard buttons
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold' }
          }}
        >
          <Tab label="Transactions" />
          <Tab label="Subscriptions" />
        </Tabs>

        <Box sx={{ width: "100%" }}>
          {tab === 0 && <TransactionsTable />}
          {tab === 1 && <SubscriptionsTable />}
        </Box>
      </Box>
    </ProtectedRoutes>
  );
}
