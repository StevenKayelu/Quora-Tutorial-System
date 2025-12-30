// Notification.jsx (or similar file)
import { Snackbar, Alert } from "@mui/material";

const Notification = ({ open, severity, message, onClose }) => (
  <Snackbar
    open={open}
    autoHideDuration={2500}
    onClose={onClose} // This is the handler for autoHideDuration or clickaway
    anchorOrigin={{ vertical: "top", horizontal: "center" }}
  >
    <Alert 
      onClose={onClose} 
      severity={severity} // ✅ This correctly sets the color/icon based on severity
      sx={{ width: "100%" }}
    >
      {message}
    </Alert>
  </Snackbar>
);

export default Notification;