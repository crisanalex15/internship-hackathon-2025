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
  Card,
  ThemeIcon,
  Title,
  Box,
  Divider,
  TextInput,
} from "@mantine/core";
import {
  IconWand,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconX,
  IconDownload,
  IconCopy,
  IconSparkles,
  IconCheckbox,
  IconSquare,
  IconSearch,
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
  const [searchQuery, setSearchQuery] = useState("");

  const fixableFindings = findings
    .filter((f) => f.patch)
    .filter((f) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        f.message?.toLowerCase().includes(query) ||
        f.suggestion?.toLowerCase().includes(query) ||
        f.severity?.toLowerCase().includes(query) ||
        f.file?.toLowerCase().includes(query)
      );
    });

  const handleAutoFix = async () => {
    setFixing(true);
    setFixProgress(0);
    setFixResults([]);

    const findingsToFix = findings.filter((f) =>
      selectedFindings.includes(f.lineStart)
    );

    // Collect all patches
    let allPatches = "";
    
    for (let i = 0; i < findingsToFix.length; i++) {
      const finding = findingsToFix[i];
      
      await new Promise((resolve) => setTimeout(resolve, 300));

      allPatches += `\n\n# Fix ${i + 1}: ${finding.message}\n`;
      allPatches += `# Fișier: ${finding.file}:${finding.lineStart}\n`;
      allPatches += finding.patch + "\n";

      const result = {
        finding: finding,
        success: true,
        message: "Patch pregătit pentru aplicare manuală",
      };

      setFixResults((prev) => [...prev, result]);
      setFixProgress(((i + 1) / findingsToFix.length) * 100);
    }

    // Copy all patches to clipboard
    if (navigator.clipboard && allPatches) {
      try {
        await navigator.clipboard.writeText(allPatches);
        console.log("All patches copied to clipboard!");
      } catch (e) {
        console.log("Clipboard copy failed");
      }
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

  const getSeverityIcon = (severity) => {
    const emojis = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🔵",
    };
    return emojis[severity?.toLowerCase()] || "⚪";
  };

  const successCount = fixResults.filter((r) => r.success).length;
  const failureCount = fixResults.filter((r) => !r.success).length;

  if (fixableFindings.length === 0) {
    return (
      <Alert
        icon={<IconAlertCircle size={20} />}
        title="Nu există fix-uri automate disponibile"
        color="blue"
        variant="light"
        styles={{ root: { padding: 20 } }}
      >
        Nu s-au găsit probleme cu patch-uri automate în acest review.
      </Alert>
    );
  }

  return (
    <div className="auto-fix-panel">
      {/* Hero Header */}
      <Card shadow="lg" padding="xl" radius="md" className="fix-header-card">
        <Stack spacing="md">
          <Group position="apart" align="flex-start" wrap="nowrap">
            <Group spacing="md" style={{ flex: 1 }}>
              <ThemeIcon
                size={60}
                radius="xl"
                variant="gradient"
                gradient={{ from: "violet", to: "purple", deg: 135 }}
                className="wand-icon-large"
              >
                <IconWand size={32} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Title order={3} weight={700} mb={4}>
                  ✨ Automatic Fixes
                </Title>
                <Text size="md" color="dimmed">
                  {fixableFindings.length} {fixableFindings.length === 1 ? 'problemă' : 'probleme'} cu fix-uri automate disponibile
                </Text>
              </div>
            </Group>

            {/* Search Bar in Header */}
            <Box style={{ flex: 1, maxWidth: 400 }}>
              <TextInput
                placeholder="🔍 Caută după mesaj, severity, fișier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="lg"
                radius="xl"
                leftSection={<IconSearch size={20} />}
                rightSection={
                  searchQuery && (
                    <ActionIcon
                      size="sm"
                      radius="xl"
                      variant="subtle"
                      onClick={() => setSearchQuery("")}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  )
                }
                styles={{
                  input: {
                    fontSize: 15,
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                    border: '2px solid #e9d5ff',
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: '#a78bfa',
                      boxShadow: '0 0 0 3px rgba(167, 139, 250, 0.1)',
                      transform: 'translateY(-2px)',
                    },
                  },
                }}
                className="search-input-animated"
              />
            </Box>

            <Box>
              <Badge
                size="xl"
                variant="gradient"
                gradient={{ from: "violet", to: "purple", deg: 135 }}
                styles={{
                  root: {
                    fontSize: 16,
                    padding: '12px 20px',
                    height: 'auto',
                  }
                }}
              >
                {selectedFindings.length} / {fixableFindings.length} selectate
              </Badge>
            </Box>
          </Group>

          <Divider />

          <Group position="apart">
            <Group spacing="xs">
              <Button
                size="sm"
                variant="light"
                color="violet"
                onClick={selectAll}
                leftSection={<IconCheckbox size={16} />}
              >
                Selectează tot
              </Button>
              <Button
                size="sm"
                variant="subtle"
                color="gray"
                onClick={deselectAll}
                leftSection={<IconSquare size={16} />}
              >
                Deselectează tot
              </Button>
            </Group>

            <Switch
              label="Auto-apply după review"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.currentTarget.checked)}
              size="md"
              color="violet"
              styles={{
                label: { fontWeight: 600 },
              }}
            />
          </Group>
        </Stack>
      </Card>

      <Stack spacing="md" mt="lg">
        {/* Findings List */}
        {fixableFindings.length === 0 && searchQuery ? (
          <Card shadow="sm" padding="xl" radius="md" withBorder className="no-results-message">
            <Stack spacing="md" align="center">
              <ThemeIcon size={80} radius="xl" variant="light" color="gray">
                <IconSearch size={40} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={700} mb={8}>
                  Nu s-au găsit rezultate
                </Text>
                <Text size="sm" color="dimmed">
                  Nu există probleme care să corespundă cu "{searchQuery}"
                </Text>
              </div>
              <Button
                variant="light"
                onClick={() => setSearchQuery("")}
                leftSection={<IconX size={16} />}
              >
                Șterge filtrul
              </Button>
            </Stack>
          </Card>
        ) : (
          <div className="fixable-findings-list">
            {fixableFindings.map((finding, index) => {
            const isSelected = selectedFindings.includes(finding.lineStart);
            return (
              <Card
                key={index}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                className={`fixable-finding ${isSelected ? "selected" : ""}`}
                onClick={() => toggleFinding(finding.lineStart)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderColor: isSelected ? '#7c3aed' : undefined,
                  backgroundColor: isSelected ? '#f5f3ff' : undefined,
                  transform: isSelected ? 'translateY(-2px)' : undefined,
                  boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.2)' : undefined,
                }}
              >
                <Group position="apart">
                  <Group spacing="md" style={{ flex: 1 }}>
                    <ThemeIcon
                      size={40}
                      radius="md"
                      variant="light"
                      color={isSelected ? "violet" : "gray"}
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      {isSelected ? (
                        <IconCheckbox size={24} />
                      ) : (
                        <IconSquare size={24} />
                      )}
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Group spacing="xs" mb={8}>
                        <Text size="lg" weight={600}>
                          {getSeverityIcon(finding.severity)}
                        </Text>
                        <Badge
                          size="md"
                          color={getSeverityColor(finding.severity)}
                          variant="filled"
                        >
                          {finding.severity?.toUpperCase()}
                        </Badge>
                        <Badge size="md" color="gray" variant="light">
                          {finding.file || 'unknown'}:{finding.lineStart}
                        </Badge>
                      </Group>
                      <Text size="sm" weight={500} color={isSelected ? "violet" : "dark"}>
                        {finding.message}
                      </Text>
                      {finding.suggestion && (
                        <Text size="xs" color="dimmed" mt={4}>
                          💡 {finding.suggestion}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <ThemeIcon
                    size={40}
                    radius="xl"
                    variant="light"
                    color="violet"
                    style={{
                      animation: isSelected ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    <IconWand size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            );
          })}
          </div>
        )}

        {/* Progress */}
        {fixing && (
          <Card shadow="md" padding="lg" radius="md" withBorder className="fix-progress">
            <Stack spacing="md">
              <Group position="apart">
                <Text size="md" weight={700}>
                  🔧 Se pregătesc fix-urile...
                </Text>
                <Badge size="lg" variant="filled" color="violet">
                  {Math.round(fixProgress)}%
                </Badge>
              </Group>
              <Progress
                value={fixProgress}
                size="xl"
                radius="xl"
                striped
                animate
                color="violet"
              />
            </Stack>
          </Card>
        )}

        {/* Results */}
        {fixResults.length > 0 && !fixing && (
          <Card shadow="lg" padding="lg" radius="md" withBorder className="fix-results">
            <Stack spacing="md">
              <Group position="apart">
                <Text size="lg" weight={700}>
                  ✅ Rezultate
                </Text>
                <Group spacing="xs">
                  <Badge size="lg" color="green" variant="filled">
                    ✓ {successCount} succes
                  </Badge>
                  {failureCount > 0 && (
                    <Badge size="lg" color="red" variant="filled">
                      ✗ {failureCount} eșuate
                    </Badge>
                  )}
                </Group>
              </Group>

              <Divider />

              <Stack spacing="sm">
                {fixResults.map((result, index) => (
                  <Paper
                    key={index}
                    p="sm"
                    withBorder
                    className="fix-result-item"
                    style={{
                      borderLeft: `4px solid ${result.success ? '#22c55e' : '#ef4444'}`,
                    }}
                  >
                    <Group position="apart">
                      <Group spacing="sm">
                        <ThemeIcon
                          size={24}
                          radius="xl"
                          variant="light"
                          color={result.success ? "green" : "red"}
                        >
                          {result.success ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconX size={16} />
                          )}
                        </ThemeIcon>
                        <Text size="sm" weight={500}>
                          {result.finding.message}
                        </Text>
                      </Group>
                      <Text size="xs" color="dimmed">
                        {result.message}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Card>
        )}

        {/* Info Alert */}
        <Alert
          icon={<IconSparkles size={18} />}
          color="violet"
          variant="light"
          radius="md"
        >
          <Text size="sm">
            💡 Patch-urile vor fi copiate automat în clipboard. Aplică-le manual în fișierele tale folosind git apply sau un editor de text.
          </Text>
        </Alert>

        {/* Apply Button */}
        <Button
          leftSection={<IconCopy size={20} />}
          onClick={handleAutoFix}
          loading={fixing}
          disabled={selectedFindings.length === 0 || fixing}
          size="xl"
          fullWidth
          variant="gradient"
          gradient={{ from: "violet", to: "purple", deg: 135 }}
          className="apply-fixes-button"
          styles={{
            root: {
              height: 60,
              fontSize: 18,
              fontWeight: 700,
            }
          }}
        >
          {fixing
            ? "🔧 Pregătesc patch-urile..."
            : `📋 Copiază ${selectedFindings.length} patch-${selectedFindings.length === 1 ? '' : 'uri'} în Clipboard`}
        </Button>
      </Stack>
    </div>
  );
};

export default AutoFixPanel;
