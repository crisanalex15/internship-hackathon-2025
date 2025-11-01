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
  Title,
  List,
  Divider,
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
      const rawExplanation = response.data.explanation;
      
      // Try to parse if it's JSON, otherwise use as-is
      try {
        const parsed = JSON.parse(rawExplanation);
        setExplanation(formatExplanation(parsed));
      } catch {
        setExplanation(rawExplanation);
      }
    } catch (error) {
      console.error("Eroare la obținerea explicațiilor:", error);
      setExplanation("Nu s-au putut obține explicații suplimentare.");
    } finally {
      setExplaining(false);
    }
  };

  const formatExplanation = (parsed) => {
    let formatted = "";

    if (parsed.why_this_is_an_issue) {
      formatted += "**De ce este o problemă:**\n\n";
      formatted += parsed.why_this_is_an_issue + "\n\n";
    }

    if (parsed.potential_consequences_if_not_fixed && Array.isArray(parsed.potential_consequences_if_not_fixed)) {
      formatted += "**Consecințe potențiale:**\n\n";
      parsed.potential_consequences_if_not_fixed.forEach((item, idx) => {
        formatted += `${idx + 1}. ${item}\n`;
      });
      formatted += "\n";
    }

    if (parsed.best_practices_related_to_this_issue && Array.isArray(parsed.best_practices_related_to_this_issue)) {
      formatted += "**Best Practices:**\n\n";
      parsed.best_practices_related_to_this_issue.forEach((item, idx) => {
        formatted += `• ${item}\n`;
      });
      formatted += "\n";
    }

    if (parsed.step_by_step_guide_to_fix_it && Array.isArray(parsed.step_by_step_guide_to_fix_it)) {
      formatted += "**Ghid pas cu pas pentru rezolvare:**\n\n";
      parsed.step_by_step_guide_to_fix_it.forEach((item, idx) => {
        formatted += `**Pasul ${idx + 1}:** ${item}\n\n`;
      });
    }

    return formatted.trim();
  };

  const renderFormattedExplanation = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if it's a bold header (starts with **)
      if (line.startsWith('**') && line.endsWith(':**')) {
        elements.push(
          <Text key={key++} weight={700} size="sm" mt={elements.length > 0 ? "md" : 0} mb="xs" style={{ color: "var(--accent-color)" }}>
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      }
      // Check if it's bold text
      else if (line.startsWith('**') && line.includes(':**')) {
        const match = line.match(/\*\*(.*?):\*\* (.*)/);
        if (match) {
          elements.push(
            <Text key={key++} size="sm" mb="xs">
              <Text component="span" weight={600} style={{ color: "#3b82f6" }}>
                {match[1]}:
              </Text>{" "}
              {match[2]}
            </Text>
          );
        } else {
          elements.push(
            <Text key={key++} weight={600} size="sm" mb="xs">
              {line.replace(/\*\*/g, '')}
            </Text>
          );
        }
      }
      // Check if it's a numbered list
      else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <Text key={key++} size="sm" mb="xs" pl="md">
            {line}
          </Text>
        );
      }
      // Check if it's a bullet list
      else if (line.startsWith('• ')) {
        elements.push(
          <Text key={key++} size="sm" mb="xs" pl="md">
            {line}
          </Text>
        );
      }
      // Regular text
      else if (line.trim()) {
        elements.push(
          <Text key={key++} size="sm" mb="xs" color="dimmed" style={{ lineHeight: 1.6 }}>
            {line}
          </Text>
        );
      }
    }

    return elements;
  };

  const handleApplyFix = async () => {
    if (!finding.patch) {
      setFixResult({ success: false, message: "Nu există patch disponibil" });
      return;
    }

    setApplyingFix(true);
    try {
      // Copy patch to clipboard și afișează instrucțiuni
      setFixResult({
        success: true,
        message: "✅ Patch copiat în clipboard! Aplică manual în fișierul tău.",
        instructions: `
📂 Fișier: ${finding.file}
📍 Linie: ${finding.lineStart}

Cum să aplici:
1. Deschide fișierul în editor
2. Navighează la linia specificată
3. Aplică modificarea din Patch
4. SAU: Salvează patch-ul și rulează: git apply patch.diff
        `.trim(),
      });

      // Copy patch to clipboard
      if (navigator.clipboard && finding.patch) {
        try {
          await navigator.clipboard.writeText(finding.patch);
        } catch (e) {
          console.log("Clipboard copy failed");
        }
      }
    } catch (error) {
      console.error("Eroare:", error);
      setFixResult({
        success: false,
        message: "❌ Nu s-a putut copia patch-ul. Copiază manual din secțiunea Patch.",
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
              <Paper p="md" withBorder style={{ backgroundColor: "#f0f7ff" }}>
                <Group spacing="xs" mb="md">
                  <IconBulb size={20} color="#1971c2" />
                  <Title order={5} color="#1971c2">Explicație detaliată</Title>
                </Group>
                <Stack spacing="md">
                  {(() => {
                    try {
                      const parsed = JSON.parse(explanation);
                      return (
                        <>
                          {parsed.why_this_is_an_issue && (
                            <>
                              <div>
                                <Text weight={600} size="sm" mb="xs" color="dimmed">
                                  De ce este aceasta o problemă?
                                </Text>
                                <Text size="sm">{parsed.why_this_is_an_issue}</Text>
                              </div>
                              <Divider />
                            </>
                          )}
                          
                          {parsed.potential_consequences_if_not_fixed && parsed.potential_consequences_if_not_fixed.length > 0 && (
                            <>
                              <div>
                                <Text weight={600} size="sm" mb="xs" color="dimmed">
                                  Consecințe potențiale dacă nu este rezolvată:
                                </Text>
                                <List size="sm" spacing="xs">
                                  {parsed.potential_consequences_if_not_fixed.map((item, idx) => (
                                    <List.Item key={idx}>{item}</List.Item>
                                  ))}
                                </List>
                              </div>
                              <Divider />
                            </>
                          )}
                          
                          {parsed.best_practices_related_to_this_issue && parsed.best_practices_related_to_this_issue.length > 0 && (
                            <>
                              <div>
                                <Text weight={600} size="sm" mb="xs" color="dimmed">
                                  Best practices:
                                </Text>
                                <List size="sm" spacing="xs">
                                  {parsed.best_practices_related_to_this_issue.map((item, idx) => (
                                    <List.Item key={idx}>{item}</List.Item>
                                  ))}
                                </List>
                              </div>
                              <Divider />
                            </>
                          )}
                          
                          {parsed.step_by_step_guide_to_fix_it && parsed.step_by_step_guide_to_fix_it.length > 0 && (
                            <div>
                              <Text weight={600} size="sm" mb="xs" color="dimmed">
                                Cum să rezolvi pas cu pas:
                              </Text>
                              <List size="sm" spacing="xs" type="ordered">
                                {parsed.step_by_step_guide_to_fix_it.map((item, idx) => (
                                  <List.Item key={idx}>{item}</List.Item>
                                ))}
                              </List>
                            </div>
                          )}
                        </>
                      );
                    } catch (e) {
                      return <Text size="sm" style={{ whiteSpace: "pre-line" }}>{explanation}</Text>;
                    }
                  })()}
                </Stack>
              </Paper>
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

