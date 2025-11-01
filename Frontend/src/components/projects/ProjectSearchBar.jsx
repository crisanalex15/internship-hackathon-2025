import { useState } from "react";
import {
  Box,
  TextInput,
  Button,
  Group,
  Paper,
  Text,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  PasswordInput,
  Alert,
  Loader,
} from "@mantine/core";
import {
  IconSearch,
  IconLock,
  IconLockOpen,
  IconFileCode,
  IconChevronRight,
  IconAlertCircle,
} from "@tabler/icons-react";
import projectService from "../../services/project.service";
import "./ProjectSearchBar.css";

const ProjectSearchBar = ({ onProjectSelected }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [passwordModal, setPasswordModal] = useState({ opened: false, projectId: null });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await projectService.searchProjects(searchQuery);
      if (response.success) {
        setSearchResults(response.projects || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching projects:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleProjectClick = async (project) => {
    // Dacă e public sau nu are parolă, încarcă direct
    if (project.IsPublic || !project.Password) {
      try {
        const response = await projectService.getProject(project.Id);
        if (response.success && onProjectSelected) {
          onProjectSelected(response.project);
        }
      } catch (error) {
        console.error("Error loading project:", error);
      }
    } else {
      // E protejat, cere parolă
      setPasswordModal({ opened: true, projectId: project.Id, projectName: project.Name });
      setPassword("");
      setPasswordError(null);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError("Te rugăm să introduci parola");
      return;
    }

    setVerifying(true);
    setPasswordError(null);

    try {
      const response = await projectService.getProject(passwordModal.projectId, password);
      
      if (response.success && onProjectSelected) {
        onProjectSelected(response.project);
        setPasswordModal({ opened: false, projectId: null });
        setPassword("");
        setPasswordError(null);
      } else {
        setPasswordError("Parolă incorectă");
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      if (error.response?.data?.message) {
        setPasswordError(error.response.data.message);
      } else {
        setPasswordError("Parolă incorectă");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Box className="project-search-container">
      <Paper p="md" withBorder className="search-bar-paper">
        <Group spacing="xs">
          <TextInput
            placeholder="Caută proiecte (nume, descriere, tag-uri)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={18} />}
            size="md"
          />
          <Button
            onClick={handleSearch}
            loading={searching}
            leftSection={<IconSearch size={18} />}
            size="md"
          >
            Caută
          </Button>
        </Group>

        {searchResults.length > 0 && (
          <Paper p="md" mt="md" withBorder className="search-results">
            <Text size="sm" weight={600} mb="sm">
              Rezultate ({searchResults.length})
            </Text>
            <Stack spacing="xs">
              {searchResults.map((project) => (
                <Paper
                  key={project.Id}
                  p="sm"
                  withBorder
                  className="project-result-item"
                  onClick={() => handleProjectClick(project)}
                  style={{ cursor: "pointer" }}
                >
                  <Group position="apart">
                    <Group spacing="xs" style={{ flex: 1 }}>
                      <IconFileCode size={20} color="var(--accent-color)" />
                      <div>
                        <Group spacing="xs">
                          <Text weight={600} size="sm">
                            {project.Name}
                          </Text>
                          {project.IsPublic ? (
                            <Badge size="xs" color="green" variant="light">
                              <IconLockOpen size={12} style={{ marginRight: 4 }} />
                              Public
                            </Badge>
                          ) : (
                            <Badge size="xs" color="orange" variant="light">
                              <IconLock size={12} style={{ marginRight: 4 }} />
                              Protejat
                            </Badge>
                          )}
                        </Group>
                        {project.Description && (
                          <Text size="xs" color="dimmed" mt={4}>
                            {project.Description.length > 100
                              ? project.Description.substring(0, 100) + "..."
                              : project.Description}
                          </Text>
                        )}
                        <Group spacing="xs" mt={4}>
                          <Text size="xs" color="dimmed">
                            {project.FileCount || 0} fișiere
                          </Text>
                          {project.Tags && (
                            <>
                              <Text size="xs" color="dimmed">•</Text>
                              <Text size="xs" color="dimmed">
                                {project.Tags.split(",").slice(0, 3).join(", ")}
                              </Text>
                            </>
                          )}
                        </Group>
                      </div>
                    </Group>
                    <ActionIcon variant="subtle" color="blue">
                      <IconChevronRight size={18} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {searchQuery && searchResults.length === 0 && !searching && (
          <Alert icon={<IconAlertCircle size={16} />} color="gray" mt="md">
            Nu s-au găsit proiecte pentru "{searchQuery}"
          </Alert>
        )}
      </Paper>

      {/* Password Modal */}
      <Modal
        opened={passwordModal.opened}
        onClose={() => {
          setPasswordModal({ opened: false, projectId: null });
          setPassword("");
          setPasswordError(null);
        }}
        title={
          <Group spacing="xs">
            <IconLock size={20} />
            <Text weight={600}>Parolă necesară</Text>
          </Group>
        }
      >
        <Stack spacing="md">
          <Text size="sm" color="dimmed">
            Proiectul "{passwordModal.projectName}" este protejat cu parolă.
          </Text>

          <PasswordInput
            label="Parolă"
            placeholder="Introdu parola proiectului"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handlePasswordSubmit();
              }
            }}
            error={passwordError}
          />

          {passwordError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {passwordError}
            </Alert>
          )}

          <Group position="right" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setPasswordModal({ opened: false, projectId: null });
                setPassword("");
                setPasswordError(null);
              }}
            >
              Anulează
            </Button>
            <Button onClick={handlePasswordSubmit} loading={verifying}>
              Accesează
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ProjectSearchBar;

