import { Box, Typography, Divider, Button } from "@mui/material";
import SubtopicMaterials from "./SubtopicMaterials";

export default function TopicItem({
  topic,
  subtopics = [],
  materials = [],
  selectedCategory,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
  onEditSubtopic,
  onDeleteSubtopic,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
}) {
  // Determine which type we are filtering for
  const categoryKey =
    selectedCategory === "Notes"
      ? "note"
      : selectedCategory === "Videos"
      ? "video"
      : null;

  const showSubtopics = selectedCategory === "Notes" || selectedCategory === "Videos";

  return (
    <Box sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, border: "1px solid #ccc", borderRadius: 2 }}>
      {/* TOPIC HEADER: title above the actions on phones */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={0.5}
      >
        <Typography variant="h6" sx={{ wordBreak: "break-word", minWidth: 0 }}>{topic.topic_title}</Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", ml: { xs: -1, sm: 0 } }}>
          <Button size="small" onClick={() => onEditTopic(topic)}>Edit</Button>
          <Button size="small" color="error" onClick={() => onDeleteTopic(topic)}>Delete</Button>
          <Button size="small" onClick={() => onAddSubtopic(topic)}>Add Subtopic</Button>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* SUBTOPICS */}
      {showSubtopics &&
        subtopics.map((subtopic) => {
          if (!subtopic?.id) return null;

          // Filter materials for this subtopic and current category
          const subtopicMaterials = materials.filter(
            (m) => m.subtopic_id === subtopic.id
          );

          // Determine if Add Material button should be shown
          const hasCategoryMaterial =
            categoryKey &&
            subtopicMaterials.some((m) => m.material_type === categoryKey);

          return (
            <SubtopicMaterials
              key={subtopic.id}
              subtopic={subtopic}
              materials={subtopicMaterials}
              category={selectedCategory}
              onEditSubtopic={() => onEditSubtopic(subtopic)}
              onDeleteSubtopic={() => onDeleteSubtopic(subtopic)}
              onAddMaterial={
                !hasCategoryMaterial
                  ? () => onAddMaterial(subtopic)
                  : undefined // hide Add button if material exists
              }
              onEditMaterial={onEditMaterial}
              onDeleteMaterial={onDeleteMaterial}
            />
          );
        })}
    </Box>
  );
}
