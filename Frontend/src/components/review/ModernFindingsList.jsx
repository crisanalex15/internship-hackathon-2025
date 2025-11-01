import { useState } from "react";
import {
  Stack,
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
  Box,
  Transition,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconBulb,
  IconCheck,
  IconAlertCircle,
  IconCopy,
  IconExternalLink,
  IconSparkles,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";
import FindingComments from "./FindingComments";
import ApplyFixModal from "./ApplyFixModal";
import "./ModernFindingsList.css";

const FindingItem = ({ finding, index, onApplyFix, isFixApplied }) => {
  const [expanded, setExpanded] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [fixModalOpened, setFixModalOpened] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "#ef4444";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      case "low":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "security":
        return "#dc2626";
      case "performance":
        return "#f59e0b";
      case "bug":
        return "#ec4899";
      case "style":
        return "#3b82f6";
      case "maintainability":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      security: "🔒",
      performance: "⚡",
      bug: "🐛",
      style: "🎨",
      maintainability: "🔧",
    };
    return icons[category?.toLowerCase()] || "📝";
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
              <Text component="span" weight={600} style={{ color: "var(--accent-color)" }}>
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
          <Text key={key++} size="sm" mb="xs" pl="md" style={{ color: "var(--text-primary)" }}>
            {line}
          </Text>
        );
      }
      // Check if it's a bullet list
      else if (line.startsWith('• ')) {
        elements.push(
          <Text key={key++} size="sm" mb="xs" pl="md" style={{ color: "var(--text-primary)" }}>
            {line}
          </Text>
        );
      }
      // Regular text
      else if (line.trim()) {
        elements.push(
          <Text key={key++} size="sm" mb="xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {line}
          </Text>
        );
      }
    }

    return elements;
  };

  const handleApplyFixClick = () => {
    // Open modal instead of applying directly
    setFixModalOpened(true);
  };

  const handleAcceptFix = async (finding) => {
    if (onApplyFix) {
      const success = onApplyFix(finding);
      if (success) {
        setFixResult({
          success: true,
          message: "✅ Fix aplicat cu succes în editor!",
        });
      } else {
        setFixResult({
          success: false,
          message: "❌ Nu s-a putut aplica fix-ul automat. Codul poate fi deja modificat.",
        });
      }
    }
  };

  const handleRejectFix = () => {
    // User rejected the fix - do nothing
    console.log("Fix rejected by user");
  };

  const handleCopy = () => {
    if (finding.patch) {
      navigator.clipboard.writeText(finding.patch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`modern-finding-item ${expanded ? "expanded" : ""}`}
      style={{
        "--severity-color": getSeverityColor(finding.severity),
        animationDelay: `${index * 0.05}s`,
      }}
    >
      <div className="finding-header" onClick={() => setExpanded(!expanded)}>
        <div className="finding-main">
          <div className="finding-indicator">
            <div
              className="severity-dot"
              style={{ background: getSeverityColor(finding.severity) }}
            />
          </div>

          <div className="finding-info">
            <Group spacing={8} mb={4}>
              <Badge
                size="sm"
                variant="dot"
                style={{
                  "--badge-color": getSeverityColor(finding.severity),
                }}
                className="severity-badge"
              >
                {finding.severity?.toUpperCase() || "UNKNOWN"}
              </Badge>
              {finding.category && (
                <Badge
                  size="sm"
                  variant="outline"
                  style={{
                    borderColor: getCategoryColor(finding.category),
                    color: getCategoryColor(finding.category),
                  }}
                  className="category-badge"
                  leftSection={<span>{getCategoryIcon(finding.category)}</span>}
                >
                  {finding.category}
                </Badge>
              )}
            </Group>

            <Text weight={500} className="finding-message">
              {finding.message}
            </Text>

            <Text size="xs" color="dimmed" className="finding-location">
              📄 {finding.file}:{finding.lineStart}
              {finding.lineEnd !== finding.lineStart && `-${finding.lineEnd}`}
            </Text>
          </div>
        </div>

        <ActionIcon
          variant="subtle"
          className="expand-button"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <IconChevronDown size={18} />
        </ActionIcon>
      </div>

      <Collapse in={expanded} transitionDuration={300} transitionTimingFunction="ease">
        <div className="finding-details">
          {finding.suggestion && (
            <div className="suggestion-box">
              <Group spacing={8} mb={8}>
                <IconBulb size={16} style={{ color: "#f59e0b" }} />
                <Text weight={600} size="sm">
                  Sugestie
                </Text>
              </Group>
              <Text size="sm" color="dimmed">
                {finding.suggestion}
              </Text>
            </div>
          )}

          {finding.patch && (
            <div className="patch-box">
              <Group position="apart" mb={8}>
                <Group spacing={8}>
                  <Text weight={600} size="sm">
                    Patch
                  </Text>
                </Group>
                <Group spacing={4}>
                  <Tooltip label={copied ? "Copiat!" : "Copiază patch"}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={handleCopy}
                      color={copied ? "green" : "gray"}
                    >
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              <Code block className="patch-code">
                {finding.patch}
              </Code>
            </div>
          )}

          {explanation && (
            <div className="explanation-box">
              <Group spacing={8} mb={8}>
                <IconSparkles size={16} style={{ color: "#8b5cf6" }} />
                <Text weight={600} size="sm">
                  Explicație detaliată
                </Text>
              </Group>
              <div className="explanation-content">
                {renderFormattedExplanation(explanation)}
              </div>
            </div>
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
              color={fixResult.success ? "blue" : "red"}
              className="fix-result-alert"
              title={fixResult.success ? "Patch pregătit!" : "Eroare"}
            >
              <Text size="sm" mb={fixResult.instructions ? "xs" : 0}>
                {fixResult.message}
              </Text>
              {fixResult.instructions && (
                <Text size="xs" style={{ whiteSpace: "pre-line", marginTop: "8px", fontFamily: "monospace" }}>
                  {fixResult.instructions}
                </Text>
              )}
            </Alert>
          )}

          <Group spacing={8} className="finding-actions">
            <Button
              variant="light"
              size="xs"
              leftSection={explaining ? <Loader size={12} /> : <IconBulb size={14} />}
              onClick={handleExplain}
              disabled={explaining}
              className="action-button"
            >
              {explaining ? "Se încarcă..." : "Explică mai mult"}
            </Button>

            {finding.patch && (
              <Button
                variant="light"
                color={isFixApplied ? "teal" : "green"}
                size="xs"
                leftSection={isFixApplied ? <IconCheck size={14} /> : <IconSparkles size={14} />}
                onClick={handleApplyFixClick}
                disabled={isFixApplied}
                className="action-button"
              >
                {isFixApplied ? "Fix Aplicat ✓" : "Aplică Fix"}
              </Button>
            )}

            <Button
              variant="light"
              color="violet"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
              onClick={() => setShowComments(!showComments)}
              className="action-button"
            >
              {showComments ? "Ascunde discuția" : "Discută"}
            </Button>
          </Group>

          {showComments && (
            <div className="comments-section">
              <FindingComments findingId={finding.lineStart} />
            </div>
          )}
        </div>
      </Collapse>

      {/* Apply Fix Modal */}
      <ApplyFixModal
        opened={fixModalOpened}
        onClose={() => setFixModalOpened(false)}
        finding={finding}
        onAccept={handleAcceptFix}
        onReject={handleRejectFix}
      />
    </div>
  );
};

const ModernFindingsList = ({ findings, onApplyFix, appliedFixes = new Set() }) => {
  if (!findings || findings.length === 0) {
    return null;
  }

  const sortedFindings = [...findings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (
      (severityOrder[a.severity?.toLowerCase()] || 4) -
      (severityOrder[b.severity?.toLowerCase()] || 4)
    );
  });

  const stats = {
    critical: sortedFindings.filter((f) => f.severity?.toLowerCase() === "critical")
      .length,
    high: sortedFindings.filter((f) => f.severity?.toLowerCase() === "high").length,
    medium: sortedFindings.filter((f) => f.severity?.toLowerCase() === "medium")
      .length,
    low: sortedFindings.filter((f) => f.severity?.toLowerCase() === "low").length,
  };

  return (
    <div className="modern-findings-list">
      <div className="findings-stats">
        {stats.critical > 0 && (
          <div className="stat-item critical">
            <div className="stat-count">{stats.critical}</div>
            <div className="stat-label">Critical</div>
          </div>
        )}
        {stats.high > 0 && (
          <div className="stat-item high">
            <div className="stat-count">{stats.high}</div>
            <div className="stat-label">High</div>
          </div>
        )}
        {stats.medium > 0 && (
          <div className="stat-item medium">
            <div className="stat-count">{stats.medium}</div>
            <div className="stat-label">Medium</div>
          </div>
        )}
        {stats.low > 0 && (
          <div className="stat-item low">
            <div className="stat-count">{stats.low}</div>
            <div className="stat-label">Low</div>
          </div>
        )}
      </div>

      <Stack spacing={12} className="findings-stack">
        {sortedFindings.map((finding, index) => (
          <FindingItem 
            key={index} 
            finding={finding} 
            index={index}
            onApplyFix={onApplyFix}
            isFixApplied={appliedFixes.has(finding.lineStart)}
          />
        ))}
      </Stack>
    </div>
  );
};

export default ModernFindingsList;

