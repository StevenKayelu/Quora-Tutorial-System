import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: '"Public Sans", sans-serif',
  },
  palette: {
    primary: { main: "#35a2db" },
    secondary: {
      main: "#CCC",
    },
    error: {
      main: "#fe0000",
    },
  },
  components: {
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', gap: 8 } } },
    MuiTextField: {
      variants: [
        {
          props: { variant: "outlined" },
          style: {
            borderRadius: "10px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          },
        },
      ],
    },
  },
});

export default theme;
