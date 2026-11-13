import { ReactNode, useId } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

type Props = { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void; loading?: boolean; confirmDisabled?: boolean; error?: string; color?: 'primary' | 'error' };
export default function ConfirmActionDialog({ open, title, children, confirmLabel, onConfirm, onClose, loading = false, confirmDisabled = false, error, color = 'primary' }: Props) {
  const id = useId();
  return <Dialog open={open} onClose={() => { if (!loading) onClose(); }} disableEscapeKeyDown={loading} fullWidth maxWidth="sm" aria-labelledby={`${id}-title`} aria-describedby={`${id}-content`}>
    <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
    <DialogContent id={`${id}-content`}>{children}{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}</DialogContent>
    <DialogActions><Button autoFocus disabled={loading} onClick={onClose}>Cancel</Button><Button variant="contained" color={color} disabled={loading || confirmDisabled} onClick={onConfirm} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>{loading ? 'Please wait…' : confirmLabel}</Button></DialogActions>
  </Dialog>;
}
