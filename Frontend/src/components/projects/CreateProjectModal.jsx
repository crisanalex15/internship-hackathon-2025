import { useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Switch,
  PasswordInput,
  Text,
  FileButton,
  Badge,
  Paper,
  ActionIcon,
  ScrollArea,
  Alert,
  Loader,
} from "@mantine/core";
import {
  IconUpload,
  IconX,
  IconFileCode,
  IconLock,
  IconLockOpen,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import projectService from "../../services/project.service";
import { AuthenticationError } from "../../services/api";
import { useNavigate } from "react-router-dom";
import "./CreateProjectModal.css";

const CreateProjectModal = ({ opened, onClose, onProjectCreated }) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (uploadedFiles) => {
    uploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const fileName = file.name;
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        // Detectează limba pe baza extensiei
        const languageMap = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'py': 'python',
          'java': 'java',
          'cs': 'csharp',
          'cpp': 'cpp',
          'c': 'c',
          'php': 'php',
          'rb': 'ruby',
          'go': 'go',
          'rs': 'rust',
          'swift': 'swift',
          'kt': 'kotlin',
          'html': 'html',
          'css': 'css',
          'scss': 'css',
          'json': 'json',
          'xml': 'xml',
          'md': 'markdown',
        };
        
        const language = languageMap[extension] || extension || 'text';
        
        setFiles((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            fileName,
            content,
            language,
          },
        ]);
      };
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validare
    if (!projectName.trim()) {
      setError("Numele proiectului este obligatoriu");
      return;
    }

    if (files.length === 0) {
      setError("Trebuie să adaugi cel puțin un fișier");
      return;
    }

    if (!isPublic && !password.trim()) {
      setError("Parola este obligatorie pentru proiecte protejate");
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        name: projectName.trim(),
        description: description.trim() || null,
        isPublic,
        password: isPublic ? null : password.trim() || null,
        tags: tags.trim() || null,
        files: files.map((f) => ({
          fileName: f.fileName,
          filePath: null, // Poți adăuga logică pentru path-uri mai târziu
          content: f.content,
          language: f.language,
        })),
      };

      const response = await projectService.createProject(projectData);
      
      if (response.success) {
        // Reset form
        setProjectName("");
        setDescription("");
        setIsPublic(false);
        setPassword("");
        setTags("");
        setFiles([]);
        
        if (onProjectCreated) {
          onProjectCreated(response.projectId);
        }
        
        onClose();
      } else {
        setError(response.message || "Eroare la crearea proiectului");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      
      // Verifică dacă este eroare de autentificare
      if (error instanceof AuthenticationError || error.isAuthError) {
        setError(
          `${error.message} Dacă ești deja autentificat, te rog reîmprospătează pagina și încearcă din nou.`
        );
        // Opțional: redirect automat după 3 secunde
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(
          error.response?.data?.message ||
            "Eroare la crearea proiectului. Verifică că ești autentificat."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group spacing="xs">
          <IconFileCode size={24} color="var(--accent-color)" />
          <Text size="lg" weight={700}>
            Creează Proiect Nou
          </Text>
        </Group>
      }
      size="xl"
      className="create-project-modal"
    >
      <Stack spacing="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        {/* Project Info */}
        <TextInput
          label="Nume Proiect"
          placeholder="ex: My Awesome App"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          size="md"
        />

        <Textarea
          label="Descriere"
          placeholder="Descrierea proiectului (opțional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
          size="md"
        />

        <TextInput
          label="Tag-uri"
          placeholder="ex: react, javascript, frontend (separate prin virgulă)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          size="md"
        />

        {/* Public/Private Toggle */}
        <Paper p="md" withBorder>
          <Group position="apart">
            <div>
              <Group spacing="xs" mb={4}>
                {isPublic ? (
                  <>
                    <IconLockOpen size={18} color="green" />
                    <Text weight={600}>Proiect Public</Text>
                  </>
                ) : (
                  <>
                    <IconLock size={18} color="orange" />
                    <Text weight={600}>Proiect Protejat</Text>
                  </>
                )}
              </Group>
              <Text size="sm" color="dimmed">
                {isPublic
                  ? "Oricine poate accesa și revizui acest proiect"
                  : "Doar persoanele cu parolă pot accesa acest proiect"}
              </Text>
            </div>
            <Switch
              checked={isPublic}
              onChange={(e) => setIsPublic(e.currentTarget.checked)}
              size="lg"
              color={isPublic ? "green" : "orange"}
            />
          </Group>
        </Paper>

        {/* Password (dacă nu e public) */}
        {!isPublic && (
          <PasswordInput
            label="Parolă"
            placeholder="Introdu parola pentru proiect"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isPublic}
            size="md"
          />
        )}

        {/* File Upload */}
        <Paper p="md" withBorder className="files-section">
          <Group position="apart" mb="md">
            <Group spacing="xs">
              <IconFileCode size={20} />
              <Text weight={600}>Fișiere ({files.length})</Text>
            </Group>
            <FileButton
              onChange={handleFileUpload}
              accept=".js,.jsx,.ts,.tsx,.py,.java,.cs,.cpp,.c,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.scss,.json,.xml,.md,.txt"
              multiple
            >
              {(props) => (
                <Button
                  {...props}
                  leftSection={<IconUpload size={16} />}
                  size="sm"
                  variant="light"
                >
                  Adaugă Fișiere
                </Button>
              )}
            </FileButton>
          </Group>

          {files.length > 0 ? (
            <ScrollArea h={200}>
              <Stack spacing="xs">
                {files.map((file) => (
                  <Paper key={file.id} p="sm" withBorder className="file-item">
                    <Group position="apart">
                      <Group spacing="xs">
                        <Badge size="sm" variant="light">
                          {file.language}
                        </Badge>
                        <Text size="sm" weight={500}>
                          {file.fileName}
                        </Text>
                        <Text size="xs" color="dimmed">
                          ({file.content.length} caractere)
                        </Text>
                      </Group>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeFile(file.id)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light">
              Nu ai adăugat niciun fișier. Adaugă cel puțin un fișier pentru a crea proiectul.
            </Alert>
          )}
        </Paper>

        {/* Actions */}
        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Anulează
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            leftSection={<IconCheck size={16} />}
            disabled={files.length === 0 || !projectName.trim()}
          >
            Creează Proiect
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CreateProjectModal;

