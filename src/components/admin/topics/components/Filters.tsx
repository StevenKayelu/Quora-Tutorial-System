import React, { useEffect } from "react";
import { Stack, TextField, MenuItem, useTheme, useMediaQuery } from "@mui/material";

interface FiltersProps {
  courses: Array<{ id: number; course_name: string }>;
  selectedCourse: number | null;
  selectedTerm: number | null;
  searchQuery: string;
  onCourseChange: (id: number) => void;
  onTermChange: (id: number) => void;
  onSearchChange: (query: string) => void;
  courseTerms: Array<{ id: number; term_number: number; start_date: string; end_date: string }>;
}

const Filters: React.FC<FiltersProps> = ({
  courses,
  selectedCourse,
  selectedTerm,
  searchQuery,
  onCourseChange,
  onTermChange,
  onSearchChange,
  courseTerms,
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  // Auto-select first course if none selected
  useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      onCourseChange(courses[0].id);
    }
  }, [courses, selectedCourse, onCourseChange]);


  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} width="100%">
      {/* COURSE SELECT */}
      <TextField
        select
        label="Course"
        value={selectedCourse ?? ""}
        onChange={(e) => onCourseChange(Number(e.target.value))}
        fullWidth
        size={isXs ? "small" : "medium"}
      >
        {courses.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.course_name}
          </MenuItem>
        ))}
      </TextField>

      {/* TERM SELECT */}
      <TextField
        select
        label="Term"
        value={selectedTerm ?? ""}
        onChange={(e) => onTermChange(Number(e.target.value))}
        fullWidth
        size={isXs ? "small" : "medium"}
        disabled={!selectedCourse || courseTerms.length === 0}
      >
        {courseTerms.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            Term {t.term_number}
          </MenuItem>
        ))}
      </TextField>

      {/* SEARCH */}
      <TextField
        label="Search Topics"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        size={isXs ? "small" : "medium"}
      />
    </Stack>
  );
};

export default Filters;
