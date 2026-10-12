import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import useAxiosInstance from "../../../utils/config/axiosInstance";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Divider, 
  useTheme, 
  useMediaQuery, 
  IconButton, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";

const studentLabel = (row) =>
  // user_id is the internal key; show the name and 7-digit student ID
  row.u_user_id
    ? `${[row.user_name, row.user_last_name].filter(Boolean).join(" ")} (${row.u_user_id})`
    : String(row.user_id ?? "");

const formatAmount = (amount) => `K ${Number(amount || 0).toFixed(2)}`;

const STATUS_COLOR = { success: "success", completed: "success", pending: "warning", failed: "error" };

const StatusChip = ({ status }) => (
  <Chip
    label={status || "unknown"}
    size="small"
    color={STATUS_COLOR[status] || "default"}
    variant={STATUS_COLOR[status] ? "filled" : "outlined"}
    sx={{ textTransform: "capitalize", fontWeight: 600 }}
  />
);

export default function TransactionsTable() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const axiosInstance = useAxiosInstance()();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // -----------------------------
  // API BASE URL
  // -----------------------------
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_TRANSACTIONS = `${API_BASE_URL}/api/subscriptions/transactions`;

  // -----------------------------
  // Fetch Data
  // -----------------------------
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await axiosInstance.get(API_TRANSACTIONS);
      setRows(res.data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // -----------------------------
  // Delete Transaction
  // -----------------------------
  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;

    try {
      const res = await axiosInstance.delete(`${API_TRANSACTIONS}/${selectedId}`);

      setRows((prev) =>
        prev.filter((row) => (row.id || row.transaction_id) !== selectedId)
      );

      setSnackbar({
        open: true,
        message: res.data?.message || "Transaction deleted successfully",
        severity: "success",
      });

      setDeleteDialogOpen(false);
      setSelectedId(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);

      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to delete transaction",
        severity: "error",
      });
    }
  };

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const columns = [
    { field: "transaction_id", headerName: "Transaction ID", flex: 1, minWidth: 140 },
    {
      field: "student",
      headerName: "Student",
      flex: 1.3,
      minWidth: 180,
      valueGetter: (value, row) => studentLabel(row),
    },
    {
      field: "amount",
      headerName: "Amount",
      flex: 0.7,
      minWidth: 110,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatAmount(row.amount)}</Typography>,
    },
    {
      field: "payment_status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 120,
      renderCell: ({ row }) => <StatusChip status={row.payment_status} />,
    },
    {
      field: "created_at",
      headerName: "Date",
      flex: 1.2,
      renderCell: (params) => formatDate(params.row.created_at),
    },
    {
      field: "actions",
      headerName: "Action",
      width: 80,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Delete Transaction">
          <IconButton 
            color="error" 
            onClick={() => handleDeleteClick(row.id || row.transaction_id)}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const query = search.trim().toLowerCase();
  const visibleRows = query
    ? rows.filter((row) =>
        [row.transaction_id, studentLabel(row), row.payment_status].some((v) =>
          String(v ?? "").toLowerCase().includes(query)
        )
      )
    : rows;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
        No transactions yet
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search by transaction ID, student or status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", sm: 380 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Typography variant="body2" color="text.secondary">
          {visibleRows.length} of {rows.length} transactions
        </Typography>
      </Stack>

      {visibleRows.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No transactions match your search
        </Typography>
      ) : isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {visibleRows.map((row) => {
            const id = row.transaction_id || row.id;
            return (
              <Card key={id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">ID: {row.transaction_id}</Typography>
                    <Typography variant="caption" fontWeight="bold" color="primary.main">{formatDate(row.created_at)}</Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                        {studentLabel(row)}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">{formatAmount(row.amount)}</Typography>
                    </Box>
                    <StatusChip status={row.payment_status} />
                  </Box>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    fullWidth 
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => handleDeleteClick(row.id || row.transaction_id)}
                  >
                    Delete Transaction
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <DataGrid
          rows={visibleRows}
          columns={columns}
          getRowId={(row) => row.id || row.transaction_id}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            "& .MuiDataGrid-columnHeaders": { bgcolor: "grey.50" },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
            "& .MuiDataGrid-cell": { fontSize: 13, display: "flex", alignItems: "center" },
          }}
        />
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this transaction record? This action is permanent and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Delete Record
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
