import { useState, useEffect } from "react";
import {
  Paper,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Alert,
  Loader,
  Modal,
  ScrollArea,
  Code,
  Divider,
} from "@mantine/core";
import {
  IconFileCode,
  IconTrash,
  IconEdit,
  IconEye,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconCode,
  IconMessageCircle,
} from "@tabler/icons-react";
import projectService from "../../services/project.service";
import { AuthenticationError } from "../../services/api";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";
import ProjectReviewPanel from "./ProjectReviewPanel";
import "./MyProjectsPanel.css";

const MyProjectsPanel = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ opened: false, projectId: null });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await projectService.getMyProjects();
      if (response.success) {
        setProjects(response.projects || []);
      } else {
        setError("Eroare la încărcarea proiectelor");
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      
      // Verifică dacă este eroare de autentificare
      if (error instanceof AuthenticationError || error.isAuthError) {
        setError(
          `${error.message} Vei fi redirecționat la pagina de login...`
        );
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError("Eroare la încărcarea proiectelor. Verifică că ești autentificat.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirm.projectId) return;

    try {
      const response = await projectService.deleteProject(deleteConfirm.projectId);
      if (response.success) {
        setProjects((prev) => prev.filter((p) => p.Id !== deleteConfirm.projectId));
        setDeleteConfirm({ opened: false, projectId: null });
      } else {
        setError(response.message || "Eroare la ștergerea proiectului");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Eroare la ștergerea proiectului");
    }
  };

  const handleProjectCreated = (projectId) => {
    loadProjects(); // Reîncarcă lista de proiecte
  };

  if (selectedProject) {
    return (
      <ProjectReviewPanel
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className="my-projects-panel">
      <Paper p="md" withBorder className="projects-header">
        <Group position="apart">
          <Group spacing="md">
            <IconFileCode size={32} color="var(--accent-color)" />
            <div>
              <Text size="xl" weight={700}>
                Proiectele Mele
              </Text>
              <Text size="sm" color="dimmed">
                Gestionează proiectele tale de cod
              </Text>
            </div>
          </Group>
          <Group spacing="xs">
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={loadProjects}
              loading={loading}
            >
              Reîncarcă
            </Button>
            <Button
              leftSection={<IconFileCode size={16} />}
              onClick={() => setCreateModalOpened(true)}
            >
              Creează Proiect
            </Button>
          </Group>
        </Group>
      </Paper>

      {error && (
        <Alert icon={<IconFileCode size={16} />} color="red" mt="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {loading ? (
        <Group position="center" py="xl">
          <Loader size="lg" />
        </Group>
      ) : projects.length === 0 ? (
        <Paper p="xl" mt="md" withBorder className="empty-state">
          <Stack align="center" spacing="md">
            <IconFileCode size={64} color="var(--text-secondary)" />
            <Text size="lg" weight={600} color="dimmed">
              Nu ai niciun proiect
            </Text>
            <Text size="sm" color="dimmed" ta="center">
              Creează primul tău proiect pentru a împărtăși codul și a primi feedback
            </Text>
            <Button
              leftSection={<IconFileCode size={16} />}
              onClick={() => setCreateModalOpened(true)}
            >
              Creează Primul Proiect
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing="md" mt="md">
          {projects.map((project) => (
            <Paper key={project.Id} p="md" withBorder className="project-card">
              <Group position="apart" align="flex-start">
                <Group spacing="md" style={{ flex: 1 }}>
                  <IconFileCode size={32} color="var(--accent-color)" />
                  <div style={{ flex: 1 }}>
                    <Group spacing="xs" mb={4}>
                      <Text weight={600} size="md">
                        {project.Name}
                      </Text>
                      {project.IsPublic ? (
                        <Badge size="sm" color="green" variant="light">
                          <IconLockOpen size={12} style={{ marginRight: 4 }} />
                          Public
                        </Badge>
                      ) : (
                        <Badge size="sm" color="orange" variant="light">
                          <IconLock size={12} style={{ marginRight: 4 }} />
                          Protejat
                        </Badge>
                      )}
                    </Group>
                    {project.Description && (
                      <Text size="sm" color="dimmed" mb={8}>
                        {project.Description}
                      </Text>
                    )}
                    <Group spacing="md">
                      <Text size="xs" color="dimmed">
                        {project.FileCount || 0} fișiere
                      </Text>
                      <Text size="xs" color="dimmed">
                        {project.ReviewCount || 0} review-uri
                      </Text>
                      {project.Tags && (
                        <Text size="xs" color="dimmed">
                          • {project.Tags.split(",").slice(0, 3).join(", ")}
                        </Text>
                      )}
                      <Text size="xs" color="dimmed">
                        Creat: {new Date(project.CreatedAt).toLocaleDateString("ro-RO")}
                      </Text>
                    </Group>
                  </div>
                </Group>
                <Group spacing="xs">
                  <Tooltip label="Vizualizează">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={async () => {
                        try {
                          const response = await projectService.getProject(project.Id);
                          if (response.success) {
                            setSelectedProject(response.project);
                          }
                        } catch (error) {
                          console.error("Error loading project:", error);
                        }
                      }}
                    >
                      <IconEye size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Review">
                    <ActionIcon
                      variant="light"
                      color="green"
                      onClick={async () => {
                        try {
                          const response = await projectService.getProject(project.Id);
                          if (response.success) {
                            setSelectedProject(response.project);
                            // Aici poți adăuga logică pentru a deschide direct review-ul
                          }
                        } catch (error) {
                          console.error("Error loading project:", error);
                        }
                      }}
                    >
                      <IconMessageCircle size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Șterge">
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() =>
                        setDeleteConfirm({ opened: true, projectId: project.Id, projectName: project.Name })
                      }
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirm.opened}
        onClose={() => setDeleteConfirm({ opened: false, projectId: null })}
        title="Confirmă ștergerea"
        size="sm"
      >
        <Stack spacing="md">
          <Text size="sm">
            Ești sigur că vrei să ștergi proiectul "{deleteConfirm.projectName}"?
          </Text>
          <Text size="xs" color="dimmed">
            Această acțiune este ireversibilă.
          </Text>
          <Group position="right" mt="md">
            <Button
              variant="subtle"
              onClick={() => setDeleteConfirm({ opened: false, projectId: null })}
            >
              Anulează
            </Button>
            <Button color="red" onClick={handleDeleteProject}>
              Șterge
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};

export default MyProjectsPanel;

