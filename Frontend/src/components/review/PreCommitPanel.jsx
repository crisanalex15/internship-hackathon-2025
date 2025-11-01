import { useState } from "react";
import {
  Stack,
  Text,
  Button,
  Group,
  Badge,
  Alert,
  Textarea,
  Switch,
  Code,
  Paper,
  Loader,
  Title,
  Divider,
  Card,
  ThemeIcon,
  Box,
  Progress,
} from "@mantine/core";
import {
  IconGitCommit,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconSparkles,
  IconGitBranch,
  IconShieldCheck,
  IconRocket,
  IconX,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";
import ModernFindingsList from "./ModernFindingsList";
import "./PreCommitPanel.css";

const PreCommitPanel = () => {
  const [gitDiff, setGitDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState(null);
  const [incrementalOnly, setIncrementalOnly] = useState(true);
  const [autoFix, setAutoFix] = useState(false);
  const [staged, setStaged] = useState(true);

  const handleAutoReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const response = await reviewService.autoReviewGitDiff(staged);
      setReviewResult(response.data);
    } catch (err) {
      console.error("Eroare la auto review:", err);
      setError(
        err.response?.data?.message ||
          "A apărut o eroare la obținerea git diff automat"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualReview = async () => {
    if (!gitDiff.trim()) {
      setError("Introdu git diff pentru a continua");
      return;
    }

    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const requestData = {
        gitDiff: gitDiff,
      };

      const response = await reviewService.performReview(requestData);
      setReviewResult(response.data);
    } catch (err) {
      console.error("Eroare la manual review:", err);
      setError(
        err.response?.data?.errorMessage ||
          "A apărut o eroare la efectuarea review-ului"
      );
    } finally {
      setLoading(false);
    }
  };

  const hasBlockingIssues = () => {
    if (!reviewResult?.findings) return false;
    return reviewResult.findings.some((f) =>
      ["critical", "high"].includes(f.severity?.toLowerCase())
    );
  };

  const getSeverityStats = () => {
    if (!reviewResult?.findings) return {};
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    reviewResult.findings.forEach((f) => {
      const severity = f.severity?.toLowerCase();
      if (stats.hasOwnProperty(severity)) {
        stats[severity]++;
      }
    });
    return stats;
  };

  const stats = getSeverityStats();
  const totalIssues = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="pre-commit-panel">
      {/* Hero Header */}
      <Box className="hero-header" mb="xl">
        <Group spacing="lg" position="center">
          <ThemeIcon
            size={80}
            radius="xl"
            variant="gradient"
            gradient={{ from: "teal", to: "lime", deg: 105 }}
            className="hero-icon"
          >
            <IconGitCommit size={48} />
          </ThemeIcon>
          <div>
            <Title order={1} size={42} weight={800} mb={8}>
              Pre-Commit Review
            </Title>
            <Text size="lg" color="dimmed">
              Evaluează și protejează codul înainte de commit 🛡️
            </Text>
          </div>
        </Group>
      </Box>

      <Stack spacing="xl" className="panel-content">
        {/* Auto Review Section - Prima și mai proeminentă */}
        <Card shadow="xl" padding="xl" radius="md" className="auto-review-card">
          <Stack spacing="md">
            <Group position="apart">
              <div>
                <Group spacing="xs">
                  <ThemeIcon size="lg" radius="xl" color="teal" variant="light">
                    <IconRocket size={20} />
                  </ThemeIcon>
                  <Title order={3} weight={700}>
                    Auto Review Git Diff
                  </Title>
                </Group>
                <Text size="sm" color="dimmed" mt={8}>
                  Analizează automat modificările din repository - rapid și simplu!
                </Text>
              </div>
              <Switch
                size="md"
                label="Staged"
                checked={staged}
                onChange={(event) => setStaged(event.currentTarget.checked)}
                description={staged ? "git diff --staged" : "git diff"}
                styles={{
                  label: { fontWeight: 600 },
                }}
              />
            </Group>

            <Button
              size="xl"
              fullWidth
              leftSection={loading ? <Loader size={20} color="white" /> : <IconGitBranch size={24} />}
              onClick={handleAutoReview}
              loading={loading}
              variant="gradient"
              gradient={{ from: "teal", to: "lime", deg: 105 }}
              className="auto-review-button"
              styles={{
                root: {
                  height: 60,
                  fontSize: 18,
                  fontWeight: 700,
                },
              }}
            >
              {loading ? "Analizez modificările..." : "🚀 Analizează Pre-Commit Automat"}
            </Button>
          </Stack>
        </Card>

        <Divider
          my="xl"
          label={
            <Badge size="lg" variant="filled" color="gray">
              SAU
            </Badge>
          }
          labelPosition="center"
        />

        {/* Manual Review Section */}
        <Card shadow="md" padding="lg" radius="md" withBorder>
          <Stack spacing="md">
            <Group spacing="xs">
              <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                <IconSparkles size={18} />
              </ThemeIcon>
              <Title order={4} weight={600}>
                Review Manual cu Git Diff
              </Title>
            </Group>

            <Alert
              icon={<IconSparkles size={16} />}
              title="Cum funcționează"
              color="blue"
              variant="light"
            >
              <Text size="sm">
                1. Rulează <Code>git diff</Code> sau <Code>git diff --staged</Code> în terminal
                <br />
                2. Copiază output-ul și lipește-l mai jos
                <br />
                3. Click pe "Analizează" pentru review
              </Text>
            </Alert>

            <Textarea
              label="Git Diff Output"
              placeholder="Lipește aici output-ul de la 'git diff' sau 'git diff --staged'..."
              value={gitDiff}
              onChange={(e) => setGitDiff(e.target.value)}
              minRows={8}
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "13px",
                  backgroundColor: "#f8f9fa",
                },
              }}
            />

            <Button
              leftSection={<IconCheck size={18} />}
              onClick={handleManualReview}
              loading={loading}
              disabled={!gitDiff.trim()}
              size="lg"
              fullWidth
              variant="light"
              color="blue"
            >
              Analizează Manual
            </Button>
          </Stack>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={20} />}
            title="Eroare"
            color="red"
            withCloseButton
            onClose={() => setError(null)}
            radius="md"
          >
            {error}
          </Alert>
        )}

        {/* Results Section */}
        {reviewResult && !loading && (
          <div className="review-results">
            {reviewResult.findings && reviewResult.findings.length > 0 ? (
              <>
                {/* Status Card */}
                <Card
                  shadow="xl"
                  padding="xl"
                  radius="md"
                  className={`commit-status ${
                    hasBlockingIssues() ? "status-blocked" : "status-ok"
                  }`}
                  style={{
                    borderLeft: `6px solid ${
                      hasBlockingIssues() ? "#ef4444" : "#22c55e"
                    }`,
                    background: hasBlockingIssues()
                      ? "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)"
                      : "linear-gradient(135deg, #d1fae5 0%, #f0fdf4 100%)",
                  }}
                >
                  <Stack spacing="md">
                    <Group position="apart">
                      <div>
                        {hasBlockingIssues() ? (
                          <Group spacing="md">
                            <ThemeIcon
                              size={60}
                              radius="xl"
                              color="red"
                              variant="light"
                            >
                              <IconX size={36} />
                            </ThemeIcon>
                            <div>
                              <Title order={2} color="red" weight={800}>
                                ⛔ BLOCAT
                              </Title>
                              <Text size="md" weight={600} color="red.7">
                                Probleme critice detectate - rezolvă înainte de commit!
                              </Text>
                            </div>
                          </Group>
                        ) : (
                          <Group spacing="md">
                            <ThemeIcon
                              size={60}
                              radius="xl"
                              color="green"
                              variant="light"
                            >
                              <IconShieldCheck size={36} />
                            </ThemeIcon>
                            <div>
                              <Title order={2} color="green" weight={800}>
                                ✅ OK PENTRU COMMIT
                              </Title>
                              <Text size="md" weight={600} color="green.7">
                                Codul arată bine - poți face commit cu încredere!
                              </Text>
                            </div>
                          </Group>
                        )}
                      </div>
                    </Group>

                    <Divider />

                    {/* Stats */}
                    <Group position="apart">
                      <Text size="lg" weight={600}>
                        {totalIssues} probleme găsite
                      </Text>
                      <Group spacing="sm">
                        {stats.critical > 0 && (
                          <Badge
                            size="xl"
                            color="red"
                            variant="filled"
                            radius="md"
                          >
                            🔴 {stats.critical} Critical
                          </Badge>
                        )}
                        {stats.high > 0 && (
                          <Badge
                            size="xl"
                            color="orange"
                            variant="filled"
                            radius="md"
                          >
                            🟠 {stats.high} High
                          </Badge>
                        )}
                        {stats.medium > 0 && (
                          <Badge
                            size="xl"
                            color="yellow"
                            variant="filled"
                            radius="md"
                          >
                            🟡 {stats.medium} Medium
                          </Badge>
                        )}
                        {stats.low > 0 && (
                          <Badge
                            size="xl"
                            color="blue"
                            variant="filled"
                            radius="md"
                          >
                            🔵 {stats.low} Low
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    {/* Progress Bar */}
                    <Box>
                      <Progress
                        size="xl"
                        radius="xl"
                        sections={[
                          {
                            value: (stats.critical / totalIssues) * 100,
                            color: "red",
                            tooltip: `${stats.critical} Critical`,
                          },
                          {
                            value: (stats.high / totalIssues) * 100,
                            color: "orange",
                            tooltip: `${stats.high} High`,
                          },
                          {
                            value: (stats.medium / totalIssues) * 100,
                            color: "yellow",
                            tooltip: `${stats.medium} Medium`,
                          },
                          {
                            value: (stats.low / totalIssues) * 100,
                            color: "blue",
                            tooltip: `${stats.low} Low`,
                          },
                        ]}
                      />
                    </Box>
                  </Stack>
                </Card>

                {/* Findings List */}
                <ModernFindingsList findings={reviewResult.findings} />
              </>
            ) : (
              <Alert
                icon={<IconCheck size={24} />}
                title="Modificările arată excelent! 🎉"
                color="green"
                radius="md"
                variant="filled"
                styles={{
                  root: {
                    padding: "24px",
                  },
                  title: {
                    fontSize: 20,
                    fontWeight: 700,
                  },
                }}
              >
                <Text size="md" weight={500}>
                  Nu s-au găsit probleme în codul modificat. Poți face commit cu încredere! ✨
                </Text>
              </Alert>
            )}
          </div>
        )}
      </Stack>
    </div>
  );
};

export default PreCommitPanel;
