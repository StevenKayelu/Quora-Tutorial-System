import { Outlet } from "react-router-dom";
import { Box, Container, Paper } from "@mui/material";
import MainWrapper from "../components/shared/MainWrapper";
import Footer from "../components/shared/Footer";

const PanelLayout = () => {
  return (
    <MainWrapper>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#e9ecef" }}>

        {/* Main content frame */}
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0, // a wide table or filter row must not widen the whole frame
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // center the frame
            py: { xs: 1.5, sm: 3 },
            px: 0,
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
            <Paper
              elevation={0} // flat, not raised
              sx={{
                bgcolor: "#fff",
                borderRadius: 3,
                p: { xs: 2, sm: 4, md: 6 },
                minWidth: 0,
                minHeight: "70vh",
                border: "1px solid #ddd", // subtle frame effect
              }}
            >
              <Outlet />
            </Paper>
            
          </Container>
          <Footer />         
        </Box>
      </Box>
    </MainWrapper>
  );
};

export default PanelLayout;
