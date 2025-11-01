import { useState } from "react";
import {
  Box,
  Paper,
  Text,
  Group,
  Button,
  Tabs,
  Stack,
  Badge,
  Code,
  ScrollArea,
  Divider,
} from "@mantine/core";
import {
  IconFileCode,
  IconCode,
  IconMessageCircle,
} from "@tabler/icons-react";
import ModernCodeReviewPanel from "../review/ModernCodeReviewPanel";
import "./ProjectReviewPanel.css";

const ProjectReviewPanel = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState("files");
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewMode, setReviewMode] = useState("view"); // 'view' or 'review'

  if (!project) {
    return (
      <Paper p="md" withBorder>
        <Text color="dimmed">Nu a fost selectat niciun proiect</Text>
      </Paper>
    );
  }

  const handleStartReview = (file) => {
    setSelectedFile(file);
    setReviewMode("review");
  };

  return (
    <Box className="project-review-panel">
      {/* Header */}
      <Paper p="md" withBorder className="project-header">
        <Group position="apart">
          <Group spacing="md">
            <IconFileCode size={32} color="var(--accent-color)" />
            <div>
              <Text size="xl" weight={700}>
                {project.Name}
              </Text>
              {project.Description && (
                <Text size="sm" color="dimmed" mt={4}>
                  {project.Description}
                </Text>
              )}
              <Group spacing="xs" mt={8}>
                <Badge size="sm" variant="light">
                  {project.Files?.length || 0} fișiere
                </Badge>
                {project.Tags && (
                  <Badge size="sm" variant="light" color="blue">
                    {project.Tags.split(",")[0]}
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
          <Button variant="subtle" onClick={onClose}>
            Închide
          </Button>
        </Group>
      </Paper>

      {reviewMode === "view" ? (
        /* Files List View */
        <Paper p="md" mt="md" withBorder>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="files" leftSection={<IconFileCode size={16} />}>
                Fișiere ({project.Files?.length || 0})
              </Tabs.Tab>
              <Tabs.Tab value="review" leftSection={<IconMessageCircle size={16} />}>
                Review Cod
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="files" pt="md">
              <Stack spacing="xs">
                {project.Files && project.Files.length > 0 ? (
                  project.Files.map((file) => (
                    <Paper
                      key={file.Id}
                      p="md"
                      withBorder
                      className="project-file-item"
                    >
                      <Group position="apart">
                        <Group spacing="md">
                          <IconCode size={24} color="var(--accent-color)" />
                          <div>
                            <Text weight={600}>{file.FileName}</Text>
                            {file.FilePath && (
                              <Text size="xs" color="dimmed">
                                {file.FilePath}
                              </Text>
                            )}
                            {file.Language && (
                              <Badge size="xs" variant="light" mt={4}>
                                {file.Language}
                              </Badge>
                            )}
                          </div>
                        </Group>
                        <Button
                          size="sm"
                          leftSection={<IconMessageCircle size={16} />}
                          onClick={() => handleStartReview(file)}
                        >
                          Review
                        </Button>
                      </Group>
                      <Divider my="sm" />
                      <ScrollArea h={200}>
                        <Code block className="file-content-preview">
                          {file.Content}
                        </Code>
                      </ScrollArea>
                    </Paper>
                  ))
                ) : (
                  <Text color="dimmed" ta="center" py="xl">
                    Nu există fișiere în acest proiect
                  </Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="review" pt="md">
              {project.Files && project.Files.length > 0 ? (
                <Stack spacing="md">
                  <Text size="sm" color="dimmed">
                    Selectează un fișier din tab-ul "Fișiere" pentru a da review
                  </Text>
                </Stack>
              ) : (
                <Text color="dimmed" ta="center" py="xl">
                  Nu există fișiere de revizuit
                </Text>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      ) : (
        /* Review Mode */
        <Paper p="md" mt="md" withBorder>
          <Group mb="md">
            <Button
              variant="subtle"
              onClick={() => {
                setReviewMode("view");
                setSelectedFile(null);
              }}
            >
              ← Înapoi la fișiere
            </Button>
            <Text weight={600}>
              Review: {selectedFile?.FileName}
            </Text>
          </Group>
          
          {/* Embed ModernCodeReviewPanel with pre-filled code */}
          <Box className="embedded-review-panel">
            <ModernCodeReviewPanel 
              initialCode={selectedFile?.Content}
              initialFileName={selectedFile?.FileName}
              projectId={project.Id}
              readOnly={true}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ProjectReviewPanel;

