import { Box, Typography, Divider, Button } from "@mui/material";
import SubtopicMaterials from "./SubtopicMaterials";

export default function TopicItem({
  topic,
  subtopics,
  materials,
  selectedCategory,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
  onEditSubtopic,
  onDeleteSubtopic,
  onAddMaterial,
}) {
  // Map frontend category to backend material_type
  const categoryKey =
    selectedCategory === "Notes"
      ? "note"
      : selectedCategory === "Videos"
      ? "video"
      : null;

  return (
    <Box sx={{ mb: 3, p: 2, border: "1px solid #ccc", borderRadius: 2 }}>
      {/* TOPIC HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{topic.topic_title}</Typography>

        <Box>
          <Button size="small" onClick={() => onEditTopic(topic)}>Edit</Button>
          <Button
            size="small"
            color="error"
            onClick={() => onDeleteTopic(topic)}
          >
            Delete
          </Button>
          <Button size="small" onClick={() => onAddSubtopic(topic)}>
            Add Subtopic
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* SUBTOPICS */}
      {subtopics?.length > 0 ? (
        subtopics.map((sub) => {
          if (!sub) return null; // skip undefined entries

          const subMaterials = materials?.filter(
            (m) => m.subtopic_id === sub.id && (categoryKey ? m.material_type === categoryKey : true)
          ) || [];

          return (
            <SubtopicMaterials
              key={sub.id}
              subtopic={sub}
              materials={subMaterials}
              category={selectedCategory}
              onEditSubtopic={() => onEditSubtopic(sub)}
              onDeleteSubtopic={() => onDeleteSubtopic(sub)}
              onAddMaterial={() => onAddMaterial(sub)}
            />
          );
        })
      ) : (
        <Button size="small" onClick={() => onAddSubtopic(topic)}>
          Add Subtopic
        </Button>
      )}
    </Box>
  );
}
