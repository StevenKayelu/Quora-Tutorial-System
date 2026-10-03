import React, { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Snackbar, Alert, CircularProgress,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import useAxiosInstance from "../../../utils/config/axiosInstance";

interface Term {
  id: string | number;
  term_number: number;
  start_date: string;
  end_date: string;
}

const termLabels: Record<number, string> = {
  1: "Term One",
  2: "Term Two",
  3: "Term Three"
};

export default function TermsManager() {
  const axiosInstance = useAxiosInstance()();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTermId, setEditTermId] = useState<string | number | null>(null);
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL;


  const [termForm, setTermForm] = useState({
    term_number: "",
    start_date: "",
    end_date: ""
  });

  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" as "success" | "error" | "warning" | "info" });

  useEffect(() => { fetchTerms(); }, []);

  const handleOpenDialog = (term?: Term) => {
    if (term) {
      setTermForm({
        term_number: String(term.term_number),
        start_date: term.start_date,
        end_date: term.end_date
      });
      setEditTermId(term.id);
    } else {
      setTermForm({ term_number: "", start_date: "", end_date: "" });
      setEditTermId(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTermForm({ term_number: "", start_date: "", end_date: "" });
    setEditTermId(null);
  };

  const hasOverlap = () => {
    const s = new Date(termForm.start_date).getTime();
    const e = new Date(termForm.end_date).getTime();

    return terms.some(t => {
      if (editTermId && t.id === editTermId) return false;
      const ts = new Date(t.start_date).getTime();
      const te = new Date(t.end_date).getTime();
      return s <= te && e >= ts;
    });
  };

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`${API_BASE}/api/terms`);
      if (res.data?.success) setTerms(res.data.data || []);
    } catch (err: any) {
      setSnack({ open: true, message: err.message || "Error fetching terms", severity: "error" });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTerms(); }, []);

  const handleSaveTerm = async () => {
    const { term_number, start_date, end_date } = termForm;
    if (!term_number || !start_date || !end_date) {
      setSnack({ open: true, message: "Fill all fields", severity: "warning" });
      return;
    }
    setLoading(true);
    try {
      if (editTermId) {
        await axiosInstance.put(`${API_BASE}/api/terms/${editTermId}`, termForm);
        setSnack({ open: true, message: "Updated successfully", severity: "success" });
      } else {
        await axiosInstance.post(`${API_BASE}/api/terms`, termForm);
        setSnack({ open: true, message: "Created successfully", severity: "success" });
      }
      await fetchTerms();
      handleCloseDialog();
    } catch (err: any) {
      setSnack({ open: true, message: err.message || "Error saving term", severity: "error" });
    } finally { setLoading(false); }
  };

  const handleDeleteTerm = async (id: string | number) => {
    if (!confirm("Delete this term?")) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`${API_BASE}/api/terms/${id}`);
      setSnack({ open: true, message: "Deleted successfully", severity: "success" });
      await fetchTerms();
    } catch (err: any) {
      setSnack({ open: true, message: err.message || "Error deleting term", severity: "error" });
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Terms Manager</Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ mb: 2 }}
        onClick={() => handleOpenDialog()}
        disabled={terms.length >= 3 || loading}
      >
        Add Term
      </Button>

      {loading && <CircularProgress sx={{ display: "block", mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Term</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {terms.map(t => (
              <TableRow key={t.id}>
                <TableCell>{termLabels[t.term_number]}</TableCell>
                <TableCell>{t.start_date}</TableCell>
                <TableCell>{t.end_date}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => handleOpenDialog(t)} disabled={loading}>
                      <EditIcon color="info" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteTerm(t.id)} disabled={loading}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editTermId ? "Edit Term" : "Add Term"}</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Term Number"
            fullWidth
            margin="dense"
            value={termForm.term_number}
            onChange={(e) => setTermForm({ ...termForm, term_number: e.target.value })}
          >
            {Object.entries(termLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Start Date"
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            value={termForm.start_date}
            onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
          />

          <TextField
            label="End Date"
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            value={termForm.end_date}
            onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTerm} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

