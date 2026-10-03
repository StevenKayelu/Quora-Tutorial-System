import { Tabs, Tab, Box, IconButton, Tooltip, useTheme, useMediaQuery } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const categories = ["Test Papers", "Notes", "Videos", "Tutorial Sheets"];

export default function CategoryTabs({ selectedCategory, setSelectedCategory, onAddCategory }) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Tabs
        value={selectedCategory}
        onChange={(e, v) => setSelectedCategory(v)}
        variant={isXs ? "scrollable" : "standard"}
        scrollButtons={isXs ? "auto" : false}
        allowScrollButtonsMobile
        sx={{
          flexGrow: 1,
          "& .MuiTab-root": {
            flex: { xs: "1 1 auto", sm: "0 1 auto" },
            minWidth: { xs: 0, sm: 100, md: 120 },
            fontSize: { xs: "0.65rem", sm: "0.8rem", md: "0.9rem" },
            px: { xs: 0.5, sm: 1, md: 2 },
            borderRight: { xs: "1px solid #ccc", sm: "1px solid #ccc" },
            "&:last-of-type": { borderRight: "none" },
          },
        }}
      >
        {categories.map((cat) => (
          <Tab key={cat} value={cat} label={cat} />
        ))}
      </Tabs>

      <Tooltip title={`Add new ${selectedCategory}`}>
        <IconButton color="primary" onClick={() => onAddCategory(selectedCategory)}>
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
