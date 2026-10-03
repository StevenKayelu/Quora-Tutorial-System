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
  Tooltip
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export default function TransactionsTable() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [rows, setRows] = useState([]);
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
    { field: "transaction_id", headerName: "ID", flex: 1, minWidth: 100 },
    { field: "amount", headerName: "Amount (K)", flex: 0.8 },
    { field: "payment_status", headerName: "Status", flex: 0.8 },
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

  if (rows.length === 0) {
    return <Typography sx={{ textAlign: "center", p: 2 }}>No transactions found</Typography>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((row) => {
            const id = row.transaction_id || row.id;
            return (
              <Card key={id} variant="outlined">
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">ID: {row.transaction_id}</Typography>
                    <Typography variant="caption" fontWeight="bold" color="primary.main">{formatDate(row.created_at)}</Typography>
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">User: {row.user_id}</Typography>
                      <Typography variant="body1" fontWeight="bold">K {row.amount}</Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textTransform: "capitalize", 
                        color: row.payment_status === "completed" ? "success.main" : "warning.main" 
                      }}
                    >
                      {row.payment_status}
                    </Typography>
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
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id || row.transaction_id}
          autoHeight
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
          sx={{ "& .MuiDataGrid-cell": { fontSize: 13 } }}
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
