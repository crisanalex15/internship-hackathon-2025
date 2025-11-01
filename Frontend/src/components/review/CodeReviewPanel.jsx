import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Paper,
  Textarea,
  Button,
  Group,
  Stack,
  Alert,
  Badge,
  Loader,
  Text,
  Tabs,
  Select,
  px,
} from "@mantine/core";
import {
  IconUpload,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
  IconHistory,
  IconCode,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";
import FindingsList from "./FindingsList";
import ReviewHistory from "./ReviewHistory";

const CodeReviewPanel = () => {
  const [code, setCode] = useState("");
  const [gitDiff, setGitDiff] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [reviewMode, setReviewMode] = useState("code"); // 'code' sau 'diff'

  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "csharp", label: "C#" },
    { value: "java", label: "Java" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "cpp", label: "C++" },
  ];

  // Verifică status-ul Ollama la mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const response = await reviewService.checkStatus();
      setOllamaStatus(response.data);
    } catch (err) {
      console.error("Eroare la verificarea status-ului Ollama:", err);
      setOllamaStatus({
        status: "error",
        message: "Nu se poate conecta la serviciul de review",
      });
    }
  };

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const requestData = {
        fileName: fileName || "unknown",
        language: language,
      };

      if (reviewMode === "code") {
        if (!code.trim()) {
          setError("Te rugăm să introduci cod pentru review");
          setLoading(false);
          return;
        }
        requestData.code = code;
      } else {
        if (!gitDiff.trim()) {
          setError("Te rugăm să introduci un git diff pentru review");
          setLoading(false);
          return;
        }
        requestData.gitDiff = gitDiff;
      }

      const response = await reviewService.performReview(requestData);
      setReviewResult(response.data);
    } catch (err) {
      console.error("Eroare la review:", err);
      setError(
        err.response?.data?.errorMessage ||
          "A apărut o eroare la efectuarea review-ului"
      );
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "red";
      case "high":
        return "orange";
      case "medium":
        return "yellow";
      case "low":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack spacing="lg">
        <Group position="apart">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: "10px",
            }}
          >
            <Title order={1}>AI Code Review Assistant</Title>
            {ollamaStatus && (
              <Badge
                color={ollamaStatus.status === "healthy" ? "green" : "red"}
                variant="filled"
                size="lg"
              >
                {ollamaStatus.status === "healthy"
                  ? "Ollama Online"
                  : "Ollama Offline"}
              </Badge>
            )}
          </div>
        </Group>

        {ollamaStatus && ollamaStatus.status !== "healthy" && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Serviciu indisponibil"
            color="red"
          >
            {ollamaStatus.message}
            <br />
            <Text size="sm" mt="xs">
              Asigură-te că Ollama rulează pe http://localhost:11434
            </Text>
          </Alert>
        )}

        <Tabs value={reviewMode} onChange={setReviewMode}>
          <Tabs.List>
            <Tabs.Tab value="code" leftSection={<IconCode size={16} />}>
              Full Code Review
            </Tabs.Tab>
            <Tabs.Tab value="diff" leftSection={<IconUpload size={16} />}>
              Git Diff Review
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              Review History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="code" pt="md">
            <Paper shadow="sm" p="md" withBorder>
              <Stack spacing="md">
                <Group grow>
                  <Select
                    label="Limbaj de programare"
                    placeholder="Selectează limbajul"
                    value={language}
                    onChange={setLanguage}
                    data={languages}
                  />
                  <Textarea
                    label="Nume fișier"
                    placeholder="exemplu.js"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </Group>

                <Textarea
                  label="Cod sursă"
                  placeholder="Introdu codul pentru review aici..."
                  minRows={15}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: "14px",
                      height: "500px",
                      overflow: "auto",
                    },
                  }}
                />

                <Group position="right">
                  <Button
                    leftSection={<IconUpload size={16} />}
                    onClick={handleReview}
                    loading={loading}
                    disabled={
                      !code.trim() || ollamaStatus?.status !== "healthy"
                    }
                  >
                    Efectueaza Review
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="diff" pt="md">
            <Paper shadow="sm" p="md" withBorder>
              <Stack spacing="md">
                <Textarea
                  label="Nume fișier"
                  placeholder="exemplu.js"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />

                <Textarea
                  label="Git Diff"
                  placeholder="Introdu output-ul de la 'git diff' aici..."
                  minRows={15}
                  value={gitDiff}
                  onChange={(e) => setGitDiff(e.target.value)}
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: "14px",
                    },
                  }}
                />

                <Group position="right">
                  <Button
                    leftSection={<IconUpload size={16} />}
                    onClick={handleReview}
                    loading={loading}
                    disabled={
                      !gitDiff.trim() || ollamaStatus?.status !== "healthy"
                    }
                  >
                    Efectueaza Review
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <ReviewHistory />
          </Tabs.Panel>
        </Tabs>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Eroare"
            color="red"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Paper shadow="sm" p="xl" withBorder>
            <Group position="center" spacing="md">
              <Loader size="lg" />
              <Text>AI-ul analizează codul tău...</Text>
            </Group>
          </Paper>
        )}

        {reviewResult && !loading && (
          <Paper shadow="sm" p="md" withBorder>
            <Stack spacing="md">
              <Group position="apart">
                <Title order={3}>
                  <IconCheck size={24} style={{ verticalAlign: "middle" }} />{" "}
                  Rezultate Review
                </Title>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  onClick={() => {
                    setReviewResult(null);
                    setCode("");
                    setGitDiff("");
                    setFileName("");
                  }}
                >
                  Reconfigurează
                </Button>
              </Group>

              {reviewResult.findings && reviewResult.findings.length > 0 ? (
                <>
                  <Group spacing="xs">
                    <Text weight={500}>
                      {reviewResult.findings.length} probleme găsite
                    </Text>
                    {reviewResult.effortEstimate && (
                      <Badge color="gray" variant="outline">
                        Efort estimat: {reviewResult.effortEstimate.hours}h (
                        {reviewResult.effortEstimate.complexity})
                      </Badge>
                    )}
                  </Group>

                  <FindingsList findings={reviewResult.findings} />
                </>
              ) : (
                <Alert
                  icon={<IconCheck size={16} />}
                  title="Cod curat!"
                  color="green"
                >
                  Nu s-au găsit probleme în codul analizat. Bună treabă!
                </Alert>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default CodeReviewPanel;
