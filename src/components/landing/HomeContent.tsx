import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Container,
  Paper,
  CircularProgress,
  Link as MuiLink,
  IconButton,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { Helmet } from "react-helmet-async";
import { useSystemInfo } from "../../contexts/SystemInfoContext";
import { useAuthContext } from "../../utils/hooks/useCustomContext";
import useAxiosInstance from "../../utils/config/axiosInstance";

interface ContactInfo {
  contact_email: string;
  watsapp_number: string;
}

const HomePage: React.FC = () => {
  const { systemInfo, loading: systemLoading } = useSystemInfo();
  const { isAuth } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const axiosInstance = useAxiosInstance()();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
 
  // Contact Info Fetching
  useEffect(() => {
  let mounted = true;

  const fetchContactInfo = async () => {
    try {
      const res = await axiosInstance.get("/api/contact");

      if (mounted && res.data.success) {
        setContactInfo(res.data.data);
      }
    } catch (err) {
    } finally {
      if (mounted) setContactLoading(false);
    }
  };

  fetchContactInfo();

  return () => {
    mounted = false;
  };
}, []); // 🔥 empty dependency array



  // Carousel calculations
  const images = useMemo(
    () => (Array.isArray(systemInfo?.coursera_images) ? systemInfo.coursera_images : []),
    [systemInfo]
  );

  const imagesPerView = isDesktop ? 2 : 1;
  const totalSlides = useMemo(() => Math.ceil(images.length / imagesPerView), [images.length, imagesPerView]);

  // Auto Slide
  useEffect(() => {
    if (!systemInfo || totalSlides <= 1) return;
    const interval = setInterval(() => {
      const next = (activeIndex + 1) % totalSlides;
      setIsTransitioning(true);
      setActiveIndex(next);
      setTimeout(() => setIsTransitioning(false), 1000); // reset transition after animation
    }, 4000);
    return () => clearInterval(interval);
  }, [systemInfo, activeIndex, totalSlides]);

  const handleNext = () => {
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  // Loading states
  if (systemLoading || contactLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error handling
  if (!systemInfo) {
    return (
      <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
        Ooops! Server Error. Please try again later.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", backgroundColor: "#f7f9fc" }}>
      <Helmet>
        <title>Home | {systemInfo.system_name || "Tutorial System"}</title>
      </Helmet>

      {/* Header */}
      <Container sx={{ textAlign: "center", py: 6 }}>
        <Paper
          elevation={6}
          sx={{
            display: "inline-block",
            borderRadius: 3,
            overflow: "hidden",
            mb: 4,
            backgroundColor: "#fff",
            p: 2,
          }}
        >
          <Box
            component="img"
            src={systemInfo.logo}
            alt={`${systemInfo.system_name || "Tutorial System"} Logo`}
            sx={{
              width: isMobile ? 120 : 180,
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Paper>

        <Typography
          variant={isMobile ? "h4" : "h2"}
          sx={{ fontWeight: 700, color: "#1a1a1a", mb: 3 }}
        >
          {systemInfo.system_name}
        </Typography>

        {/* Auth Buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "center",
              gap: 2,
              mb: 6,
            }}
          >
            <Button
              component={Link}
              to="/login"
              variant="contained"
              color="primary"
              size="large"
              sx={{ minWidth: 140 }}
            >
              Login
            </Button>
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              color="primary"
              size="large"
              sx={{ minWidth: 140 }}
            >
              Register
            </Button>
          </Box>
      </Container>

      {/* Carousel */}
      {images.length > 0 && (
        <Box sx={{ maxWidth: "md", mx: "auto", position: "relative", overflow: "hidden", mb: 6 }}>
          <Box
            sx={{
              display: "flex",
              transition: isTransitioning ? "transform 1s ease-in-out" : "none",
              transform: `translateX(-${activeIndex * (100 / imagesPerView)}%)`,
              gap: 2,
            }}
          >
            {images.map((img, idx) => (
              <Paper
                key={idx}
                elevation={3}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  flex: `0 0 ${100 / imagesPerView}%`,
                  maxWidth: isDesktop ? `calc(50% - 8px)` : "100%",
                  height: isMobile ? 200 : 350,
                  backgroundColor: "#fff",
                }}
              >
                <Box
                  component="img"
                  src={img}
                  alt={`Slide ${idx + 1}`}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                    backgroundColor: "#f0f0f0",
                  }}
                />
              </Paper>
            ))}
          </Box>

          {/* Navigation Arrows */}
          {!isMobile && (
            <>
              <IconButton
                onClick={handlePrev}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: 8,
                  transform: "translateY(-50%)",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  "&:hover": { backgroundColor: "#fff" },
                  zIndex: 1,
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>

              <IconButton
                onClick={handleNext}
                sx={{
                  position: "absolute",
                  top: "50%",
                  right: 8,
                  transform: "translateY(-50%)",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  "&:hover": { backgroundColor: "#fff" },
                  zIndex: 1,
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </>
          )}
        </Box>
      )}

      {/* Carousel Dots */}
      {totalSlides > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 6 }}>
          {Array.from({ length: totalSlides }).map((_, index) => (
            <Box
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setActiveIndex(index);
                setTimeout(() => setIsTransitioning(false), 1000);
              }}
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor:
                  index === activeIndex ? theme.palette.primary.main : theme.palette.grey[400],
                mx: 1,
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </Box>
      )}

      {/* About Us */}
      <Container sx={{ py: 6 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "#fff",
            borderRadius: 3,
            boxShadow: 3,
          }}
        >
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 600, mb: 2 }}>
            About Us
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: "#555" }}>
            {systemInfo.about_us}
          </Typography>
          <Typography variant="body2" sx={{ color: "#555" }}>
            Contact us:{" "}
            <MuiLink href={`mailto:${contactInfo?.contact_email || "N/A"}`} sx={{ textDecoration: "none" }}>
              {contactInfo?.contact_email || "N/A"}
            </MuiLink>{" "}
            | {contactInfo?.contact_phone || "N/A"}
          </Typography>
        </Paper>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 4,
          py: 4,
        }}
      >
        <MuiLink
          component={Link}
          to="/privacy-policy"
          sx={{
            textDecoration: "none",
            color: "#555",
            "&:hover": { color: "#1976d2" },
          }}
        >
          Privacy Policy
        </MuiLink>
        <MuiLink
          component={Link}
          to="/terms-and-conditions"
          sx={{
            textDecoration: "none",
            color: "#555",
            "&:hover": { color: "#1976d2" },
          }}
        >
          Terms & Conditions
        </MuiLink>
      </Box>
    </Box>
  );
};

export default HomePage;
