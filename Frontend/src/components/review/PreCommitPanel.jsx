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
} from "@mantine/core";
import {
  IconGitCommit,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconSparkles,
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
  const [commitMessage, setCommitMessage] = useState("");

  const handlePreCommitReview = async () => {
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
        fileName: "staged-changes",
        language: "auto",
      };

      const response = await reviewService.performReview(requestData);
      setReviewResult(response.data);
    } catch (err) {
      console.error("Eroare la pre-commit review:", err);
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

  return (
    <div className="pre-commit-panel">
      <div className="panel-header">
        <Group spacing="md">
          <div className="header-icon">
            <IconGitCommit size={32} />
          </div>
          <div>
            <Text size="xl" weight={700}>
              Pre-Commit Review
            </Text>
            <Text size="sm" color="dimmed">
              Evaluează modificările înainte de commit
            </Text>
          </div>
        </Group>
      </div>

      <Stack spacing="md" className="panel-content">
        <Alert
          icon={<IconSparkles size={16} />}
          title="Cum funcționează"
          color="blue"
        >
          <Text size="sm">
            1. Rulează <Code>git diff</Code> sau <Code>git diff --staged</Code> în terminalul tău
            <br />
            2. Copiază output-ul și lipește-l mai jos
            <br />
            3. Click pe "Analizează" pentru review automat
            <br />
            4. Rezolvă problemele critice înainte de commit
          </Text>
        </Alert>

        <Paper p="md" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Text weight={600}>Opțiuni Review</Text>
            </Group>

            <Switch
              label="Doar linii modificate (incremental)"
              description="Analizează doar codul nou adăugat sau modificat"
              checked={incrementalOnly}
              onChange={(e) => setIncrementalOnly(e.currentTarget.checked)}
            />

            <Switch
              label="Auto-fix probleme minore"
              description="Aplică automat fix-uri pentru probleme low/medium"
              checked={autoFix}
              onChange={(e) => setAutoFix(e.currentTarget.checked)}
            />
          </Stack>
        </Paper>

        <Textarea
          label="Git Diff Output"
          placeholder="Lipește aici output-ul de la 'git diff' sau 'git diff --staged'..."
          value={gitDiff}
          onChange={(e) => setGitDiff(e.target.value)}
          minRows={10}
          styles={{
            input: {
              fontFamily: "monospace",
              fontSize: "12px",
            },
          }}
        />

        <Button
          leftSection={loading ? <Loader size={16} /> : <IconCheck size={16} />}
          onClick={handlePreCommitReview}
          loading={loading}
          disabled={!gitDiff.trim()}
          size="md"
          fullWidth
          className="review-button"
        >
          {loading ? "Analizez modificările..." : "Analizează Pre-Commit"}
        </Button>

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

        {reviewResult && !loading && (
          <div className="review-results">
            {reviewResult.findings && reviewResult.findings.length > 0 ? (
              <>
                <Paper p="md" withBorder className="commit-status">
                  <Group position="apart">
                    <div>
                      <Text size="lg" weight={700}>
                        {hasBlockingIssues() ? (
                          <Group spacing="xs">
                            <IconAlertCircle size={24} color="#ef4444" />
                            <span style={{ color: "#ef4444" }}>
                              BLOCAT - Probleme critice
                            </span>
                          </Group>
                        ) : (
                          <Group spacing="xs">
                            <IconCheck size={24} color="#22c55e" />
                            <span style={{ color: "#22c55e" }}>
                              OK - Poți face commit
                            </span>
                          </Group>
                        )}
                      </Text>
                      <Text size="sm" color="dimmed" mt="xs">
                        {reviewResult.findings.length} probleme găsite
                      </Text>
                    </div>

                    <Group spacing="xs">
                      {stats.critical > 0 && (
                        <Badge color="red" size="lg">
                          {stats.critical} Critical
                        </Badge>
                      )}
                      {stats.high > 0 && (
                        <Badge color="orange" size="lg">
                          {stats.high} High
                        </Badge>
                      )}
                      {stats.medium > 0 && (
                        <Badge color="yellow" size="lg">
                          {stats.medium} Medium
                        </Badge>
                      )}
                      {stats.low > 0 && (
                        <Badge color="blue" size="lg">
                          {stats.low} Low
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Paper>

                <ModernFindingsList findings={reviewResult.findings} />
              </>
            ) : (
              <Alert
                icon={<IconCheck size={16} />}
                title="Modificările arată bine! ✅"
                color="green"
              >
                Nu s-au găsit probleme în codul modificat. Poți face commit cu încredere!
              </Alert>
            )}
          </div>
        )}
      </Stack>
    </div>
  );
};

export default PreCommitPanel;

