import { useState } from "react";
import {
  Stack,
  Text,
  Button,
  Group,
  Badge,
  Progress,
  Alert,
  Switch,
  Paper,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconWand,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconX,
  IconDownload,
} from "@tabler/icons-react";
import "./AutoFixPanel.css";

const AutoFixPanel = ({ findings = [], onFixesApplied }) => {
  const [fixing, setFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [fixResults, setFixResults] = useState([]);
  const [selectedFindings, setSelectedFindings] = useState(
    findings.filter((f) => f.patch).map((f) => f.lineStart)
  );
  const [autoApply, setAutoApply] = useState(false);

  const fixableFindings = findings.filter((f) => f.patch);

  const handleAutoFix = async () => {
    setFixing(true);
    setFixProgress(0);
    setFixResults([]);

    const findingsToFix = findings.filter((f) =>
      selectedFindings.includes(f.lineStart)
    );

    for (let i = 0; i < findingsToFix.length; i++) {
      const finding = findingsToFix[i];
      
      // Simulate applying fix (in real app, would call API)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = {
        finding: finding,
        success: Math.random() > 0.1, // 90% success rate simulation
        message: Math.random() > 0.1 ? "Fix aplicat cu succes" : "Eroare la aplicare",
      };

      setFixResults((prev) => [...prev, result]);
      setFixProgress(((i + 1) / findingsToFix.length) * 100);
    }

    setFixing(false);

    if (onFixesApplied) {
      onFixesApplied(fixResults);
    }
  };

  const toggleFinding = (lineStart) => {
    setSelectedFindings((prev) =>
      prev.includes(lineStart)
        ? prev.filter((l) => l !== lineStart)
        : [...prev, lineStart]
    );
  };

  const selectAll = () => {
    setSelectedFindings(fixableFindings.map((f) => f.lineStart));
  };

  const deselectAll = () => {
    setSelectedFindings([]);
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

  const successCount = fixResults.filter((r) => r.success).length;
  const failureCount = fixResults.filter((r) => !r.success).length;

  if (fixableFindings.length === 0) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Nu există fix-uri automate disponibile"
        color="blue"
      >
        Nu s-au găsit probleme cu patch-uri automate în acest review.
      </Alert>
    );
  }

  return (
    <div className="auto-fix-panel">
      <Paper p="md" withBorder className="fix-header">
        <Group position="apart">
          <div>
            <Group spacing="xs">
              <IconWand size={24} style={{ color: "var(--accent-color)" }} />
              <Text size="lg" weight={700}>
                Automatic Fixes
              </Text>
            </Group>
            <Text size="sm" color="dimmed" mt="xs">
              {fixableFindings.length} probleme cu fix-uri automate disponibile
            </Text>
          </div>
          <Badge size="lg" color="blue" variant="light">
            {selectedFindings.length} selectate
          </Badge>
        </Group>
      </Paper>

      <Stack spacing="md" mt="md">
        <Group position="apart">
          <Group spacing="xs">
            <Button size="xs" variant="light" onClick={selectAll}>
              Selectează tot
            </Button>
            <Button size="xs" variant="light" onClick={deselectAll}>
              Deselectează tot
            </Button>
          </Group>

          <Switch
            label="Auto-apply după review"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.currentTarget.checked)}
            size="sm"
          />
        </Group>

        <div className="fixable-findings-list">
          {fixableFindings.map((finding, index) => (
            <Paper
              key={index}
              p="md"
              withBorder
              className={`fixable-finding ${
                selectedFindings.includes(finding.lineStart) ? "selected" : ""
              }`}
              onClick={() => toggleFinding(finding.lineStart)}
            >
              <Group position="apart">
                <Group spacing="sm">
                  <input
                    type="checkbox"
                    checked={selectedFindings.includes(finding.lineStart)}
                    onChange={() => {}}
                    className="finding-checkbox"
                  />
                  <div>
                    <Group spacing="xs" mb={4}>
                      <Badge
                        size="sm"
                        color={getSeverityColor(finding.severity)}
                      >
                        {finding.severity?.toUpperCase()}
                      </Badge>
                      <Text size="xs" color="dimmed">
                        {finding.file}:{finding.lineStart}
                      </Text>
                    </Group>
                    <Text size="sm" weight={500}>
                      {finding.message}
                    </Text>
                  </div>
                </Group>
                <IconWand size={20} className="wand-icon" />
              </Group>
            </Paper>
          ))}
        </div>

        {fixing && (
          <Paper p="md" withBorder className="fix-progress">
            <Text size="sm" weight={600} mb="xs">
              Se aplică fix-urile... {Math.round(fixProgress)}%
            </Text>
            <Progress
              value={fixProgress}
              size="lg"
              radius="xl"
              striped
              animate
            />
          </Paper>
        )}

        {fixResults.length > 0 && !fixing && (
          <Paper p="md" withBorder className="fix-results">
            <Group position="apart" mb="md">
              <Text size="sm" weight={700}>
                Rezultate
              </Text>
              <Group spacing="xs">
                <Badge color="green" variant="filled">
                  {successCount} succes
                </Badge>
                {failureCount > 0 && (
                  <Badge color="red" variant="filled">
                    {failureCount} eșuate
                  </Badge>
                )}
              </Group>
            </Group>

            <Stack spacing="xs">
              {fixResults.map((result, index) => (
                <Group key={index} position="apart" className="fix-result-item">
                  <Group spacing="xs">
                    {result.success ? (
                      <IconCheck size={16} color="#22c55e" />
                    ) : (
                      <IconX size={16} color="#ef4444" />
                    )}
                    <Text size="xs">{result.finding.message}</Text>
                  </Group>
                  <Text size="xs" color="dimmed">
                    {result.message}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        <Button
          leftSection={<IconPlayerPlay size={16} />}
          onClick={handleAutoFix}
          loading={fixing}
          disabled={selectedFindings.length === 0 || fixing}
          size="md"
          fullWidth
          className="apply-fixes-button"
        >
          {fixing
            ? "Se aplică fix-urile..."
            : `Aplică ${selectedFindings.length} fix-uri`}
        </Button>
      </Stack>
    </div>
  );
};

export default AutoFixPanel;

