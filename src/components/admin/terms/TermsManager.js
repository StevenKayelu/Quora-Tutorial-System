import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Snackbar, Alert, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import useAxiosInstance from "../../../utils/config/axiosInstance";
const termLabels = {
    1: "Term One",
    2: "Term Two",
    3: "Term Three"
};
export default function TermsManager() {
    const axiosInstance = useAxiosInstance()();
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTermId, setEditTermId] = useState(null);
    const [termForm, setTermForm] = useState({
        term_number: "",
        start_date: "",
        end_date: ""
    });
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const fetchTerms = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/terms");
            if (res.data?.success)
                setTerms(res.data.data || []);
        }
        catch (err) {
            setSnack({ open: true, message: err.message || "Error fetching terms", severity: "error" });
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchTerms(); }, []);
    const handleOpenDialog = (term) => {
        if (term) {
            setTermForm({
                term_number: String(term.term_number),
                start_date: term.start_date,
                end_date: term.end_date
            });
            setEditTermId(term.id);
        }
        else {
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
            if (editTermId && t.id === editTermId)
                return false;
            const ts = new Date(t.start_date).getTime();
            const te = new Date(t.end_date).getTime();
            return s <= te && e >= ts;
        });
    };
    const handleSaveTerm = async () => {
        const { term_number, start_date, end_date } = termForm;
        if (!term_number || !start_date || !end_date) {
            setSnack({ open: true, message: "Fill all fields", severity: "warning" });
            return;
        }
        if (![1, 2, 3].includes(Number(term_number))) {
            setSnack({ open: true, message: "Term must be 1, 2, or 3", severity: "warning" });
            return;
        }
        if (!editTermId && terms.length >= 3) {
            setSnack({ open: true, message: "You can only have 3 terms", severity: "warning" });
            return;
        }
        if (hasOverlap()) {
            setSnack({ open: true, message: "Date overlaps with existing term", severity: "warning" });
            return;
        }
        setLoading(true);
        try {
            if (editTermId) {
                await axiosInstance.put(`/api/terms/${editTermId}`, termForm);
                setSnack({ open: true, message: "Updated successfully", severity: "success" });
            }
            else {
                await axiosInstance.post("/api/terms", termForm);
                setSnack({ open: true, message: "Created successfully", severity: "success" });
            }
            await fetchTerms();
            handleCloseDialog();
        }
        catch (err) {
            setSnack({ open: true, message: err.message || "Error saving term", severity: "error" });
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteTerm = async (id) => {
        if (!confirm("Delete this term?"))
            return;
        setLoading(true);
        try {
            await axiosInstance.delete(`/api/terms/${id}`);
            setSnack({ open: true, message: "Deleted successfully", severity: "success" });
            await fetchTerms();
        }
        catch (err) {
            setSnack({ open: true, message: err.message || "Error deleting term", severity: "error" });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Box, { sx: { p: 4 }, children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Terms Manager" }), _jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), sx: { mb: 2 }, onClick: () => handleOpenDialog(), disabled: terms.length >= 3 || loading, children: "Add Term" }), loading && _jsx(CircularProgress, { sx: { display: "block", mb: 2 } }), _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Term" }), _jsx(TableCell, { children: "Start Date" }), _jsx(TableCell, { children: "End Date" }), _jsx(TableCell, { align: "right", children: "Actions" })] }) }), _jsx(TableBody, { children: terms.map(t => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: termLabels[t.term_number] }), _jsx(TableCell, { children: t.start_date }), _jsx(TableCell, { children: t.end_date }), _jsx(TableCell, { align: "right", children: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(IconButton, { onClick: () => handleOpenDialog(t), disabled: loading, children: _jsx(EditIcon, { color: "info" }) }), _jsx(IconButton, { onClick: () => handleDeleteTerm(t.id), disabled: loading, children: _jsx(DeleteIcon, { color: "error" }) })] }) })] }, t.id))) })] }) }), _jsxs(Dialog, { open: dialogOpen, onClose: handleCloseDialog, children: [_jsx(DialogTitle, { children: editTermId ? "Edit Term" : "Add Term" }), _jsxs(DialogContent, { children: [_jsx(TextField, { select: true, label: "Term Number", fullWidth: true, margin: "dense", value: termForm.term_number, onChange: (e) => setTermForm({ ...termForm, term_number: e.target.value }), children: Object.entries(termLabels).map(([key, label]) => (_jsx(MenuItem, { value: key, children: label }, key))) }), _jsx(TextField, { label: "Start Date", type: "date", fullWidth: true, margin: "dense", InputLabelProps: { shrink: true }, value: termForm.start_date, onChange: (e) => setTermForm({ ...termForm, start_date: e.target.value }) }), _jsx(TextField, { label: "End Date", type: "date", fullWidth: true, margin: "dense", InputLabelProps: { shrink: true }, value: termForm.end_date, onChange: (e) => setTermForm({ ...termForm, end_date: e.target.value }) })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCloseDialog, children: "Cancel" }), _jsx(Button, { onClick: handleSaveTerm, variant: "contained", children: "Save" })] })] }), _jsx(Snackbar, { open: snack.open, autoHideDuration: 4000, onClose: () => setSnack(s => ({ ...s, open: false })), children: _jsx(Alert, { severity: snack.severity, sx: { width: "100%" }, children: snack.message }) })] }));
}
