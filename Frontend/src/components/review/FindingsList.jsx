import { useState } from "react";
import {
  Stack,
  Paper,
  Text,
  Badge,
  Group,
  Button,
  Collapse,
  Code,
  Alert,
  ActionIcon,
  Tooltip,
  Loader,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconBulb,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";

const FindingItem = ({ finding, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixResult, setFixResult] = useState(null);

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

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "security":
        return "red";
      case "performance":
        return "orange";
      case "bug":
        return "pink";
      case "style":
        return "blue";
      case "maintainability":
        return "violet";
      default:
        return "gray";
    }
  };

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const response = await reviewService.explainFinding(finding);
      setExplanation(response.data.explanation);
    } catch (error) {
      console.error("Eroare la obținerea explicațiilor:", error);
      setExplanation("Nu s-au putut obține explicații suplimentare.");
    } finally {
      setExplaining(false);
    }
  };

  const handleApplyFix = async () => {
    if (!finding.patch) {
      setFixResult({ success: false, message: "Nu există patch disponibil" });
      return;
    }

    setApplyingFix(true);
    try {
      const response = await reviewService.applyFix({
        patch: finding.patch,
        filePath: finding.file,
      });
      setFixResult(response.data);
    } catch (error) {
      console.error("Eroare la aplicarea fix-ului:", error);
      setFixResult({
        success: false,
        message: error.response?.data?.message || "Eroare la aplicarea fix-ului",
      });
    } finally {
      setApplyingFix(false);
    }
  };

  return (
    <Paper
      shadow="xs"
      p="md"
      withBorder
      style={{
        borderLeft: `4px solid var(--mantine-color-${getSeverityColor(finding.severity)}-6)`,
      }}
    >
      <Stack spacing="sm">
        <Group position="apart">
          <Group spacing="xs">
            <Badge color={getSeverityColor(finding.severity)} variant="filled">
              {finding.severity?.toUpperCase() || "UNKNOWN"}
            </Badge>
            {finding.category && (
              <Badge color={getCategoryColor(finding.category)} variant="outline">
                {finding.category}
              </Badge>
            )}
            <Text size="sm" color="dimmed">
              {finding.file}:{finding.lineStart}
              {finding.lineEnd !== finding.lineStart && `-${finding.lineEnd}`}
            </Text>
          </Group>
          <ActionIcon
            onClick={() => setExpanded(!expanded)}
            variant="subtle"
            size="lg"
          >
            {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </ActionIcon>
        </Group>

        <Text weight={500}>{finding.message}</Text>

        <Collapse in={expanded}>
          <Stack spacing="md">
            {finding.suggestion && (
              <Paper p="sm" withBorder style={{ backgroundColor: "#f8f9fa" }}>
                <Group spacing="xs" mb="xs">
                  <IconBulb size={16} color="orange" />
                  <Text weight={500} size="sm">
                    Sugestie:
                  </Text>
                </Group>
                <Text size="sm">{finding.suggestion}</Text>
              </Paper>
            )}

            {finding.patch && (
              <div>
                <Text weight={500} size="sm" mb="xs">
                  Patch:
                </Text>
                <Code block style={{ fontSize: "12px" }}>
                  {finding.patch}
                </Code>
              </div>
            )}

            {explanation && (
              <Alert
                icon={<IconBulb size={16} />}
                title="Explicație detaliată"
                color="blue"
              >
                <Text size="sm" style={{ whiteSpace: "pre-line" }}>
                  {explanation}
                </Text>
              </Alert>
            )}

            {fixResult && (
              <Alert
                icon={
                  fixResult.success ? (
                    <IconCheck size={16} />
                  ) : (
                    <IconAlertCircle size={16} />
                  )
                }
                title={fixResult.success ? "Patch aplicat!" : "Eroare"}
                color={fixResult.success ? "green" : "red"}
              >
                {fixResult.message}
              </Alert>
            )}

            <Group spacing="sm">
              <Button
                variant="light"
                size="xs"
                leftSection={explaining ? <Loader size={12} /> : <IconBulb size={14} />}
                onClick={handleExplain}
                disabled={explaining}
              >
                {explaining ? "Se încarcă..." : "Explică mai mult"}
              </Button>

              {finding.patch && (
                <Tooltip
                  label="Atenție: Funcția de apply fix este experimentală"
                  position="top"
                >
                  <Button
                    variant="light"
                    color="green"
                    size="xs"
                    leftSection={
                      applyingFix ? <Loader size={12} /> : <IconCheck size={14} />
                    }
                    onClick={handleApplyFix}
                    disabled={applyingFix}
                  >
                    {applyingFix ? "Se aplică..." : "Aplică Fix"}
                  </Button>
                </Tooltip>
              )}
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};

const FindingsList = ({ findings }) => {
  if (!findings || findings.length === 0) {
    return null;
  }

  // Sortează findings după severitate
  const sortedFindings = [...findings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (
      (severityOrder[a.severity?.toLowerCase()] || 4) -
      (severityOrder[b.severity?.toLowerCase()] || 4)
    );
  });

  return (
    <Stack spacing="md">
      {sortedFindings.map((finding, index) => (
        <FindingItem key={index} finding={finding} index={index} />
      ))}
    </Stack>
  );
};

export default FindingsList;

