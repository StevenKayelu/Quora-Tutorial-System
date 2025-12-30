import React from "react";
import { Box, Typography, Button } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface EmptyStateProps {
  message?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message = "No content available.",
  buttonText,
  onButtonClick,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{ py: 3, textAlign: "center", color: "text.secondary" }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 50, mb: 2 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        {message}
      </Typography>
      {buttonText && onButtonClick && (
        <Button variant="contained" onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
