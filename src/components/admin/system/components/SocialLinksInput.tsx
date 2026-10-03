// SocialLinksInput.tsx
import React from "react";
import { Paper, Typography, Stack, TextField, Button, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";

interface SocialLinksInputProps {
  links: string[];
  setLinks: (links: string[]) => void;
}

const SocialLinksInput: React.FC<SocialLinksInputProps> = ({ links, setLinks }) => (
  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
    <Typography fontWeight={600}>Social Links</Typography>
    {links.map((link, i) => (
      <Stack key={i} direction="row" spacing={1} mb={1}>
        <TextField
          fullWidth
          value={link}
          onChange={(e) => {
            const updated = [...links];
            updated[i] = e.target.value;
            setLinks(updated);
          }}
        />
        <IconButton color="error" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>
          <Close />
        </IconButton>
      </Stack>
    ))}
    <Button size="small" onClick={() => setLinks([...links, ""])}>+ Add Link</Button>
  </Paper>
);

export default SocialLinksInput;
