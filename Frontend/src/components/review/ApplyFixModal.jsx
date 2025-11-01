import { useState } from "react";
import {
  Modal,
  Text,
  Button,
  Group,
  Badge,
  Stack,
  Code,
  Paper,
  ScrollArea,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconAlertCircle,
  IconArrowRight,
} from "@tabler/icons-react";
import "./ApplyFixModal.css";

const ApplyFixModal = ({ opened, onClose, finding, onAccept, onReject }) => {
  const [applying, setApplying] = useState(false);

  const handleAccept = async () => {
    setApplying(true);
    try {
      await onAccept(finding);
      onClose();
    } catch (error) {
      console.error("Error applying fix:", error);
    } finally {
      setApplying(false);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(finding);
    }
    onClose();
  };

  if (!finding) return null;

  // Parse patch to extract old and new code
  const parsePatch = (patch) => {
    const lines = patch.split('\n');
    const oldLines = [];
    const newLines = [];

    lines.forEach(line => {
      if (line.startsWith('-') && !line.startsWith('---')) {
        oldLines.push(line.substring(1));
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        newLines.push(line.substring(1));
      }
    });

    return {
      oldCode: oldLines.join('\n'),
      newCode: newLines.join('\n'),
    };
  };

  const { oldCode, newCode } = finding.patch ? parsePatch(finding.patch) : { oldCode: '', newCode: '' };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "red";
      case "high": return "orange";
      case "medium": return "yellow";
      case "low": return "blue";
      default: return "gray";
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group spacing="sm">
          <IconAlertCircle size={24} style={{ color: `var(--mantine-color-${getSeverityColor(finding.severity)}-6)` }} />
          <Text size="lg" weight={600}>
            Aplică Fix Automat
          </Text>
        </Group>
      }
      className="apply-fix-modal"
    >
      <Stack spacing="md">
        {/* Problem Description */}
        <Paper p="md" withBorder className="problem-section">
          <Group spacing="xs" mb="xs">
            <Badge size="sm" color={getSeverityColor(finding.severity)}>
              {finding.severity?.toUpperCase()}
            </Badge>
            <Text size="xs" color="dimmed">
              {finding.file}:{finding.lineStart}
            </Text>
          </Group>
          <Text size="sm" weight={500}>
            {finding.message}
          </Text>
          {finding.suggestion && (
            <Text size="sm" color="dimmed" mt="xs">
              💡 {finding.suggestion}
            </Text>
          )}
        </Paper>

        {/* Code Comparison */}
        <div className="code-comparison">
          <div className="comparison-side old-code">
            <Group spacing="xs" mb="xs">
              <IconX size={16} color="#ef4444" />
              <Text size="sm" weight={600} color="red">
                Cod Actual
              </Text>
            </Group>
            <Paper p="md" withBorder className="code-paper old">
              <ScrollArea style={{ maxHeight: 200 }}>
                <Code block className="diff-code">
                  {oldCode || "No changes to remove"}
                </Code>
              </ScrollArea>
            </Paper>
          </div>

          <div className="arrow-divider">
            <IconArrowRight size={32} className="arrow-icon" />
          </div>

          <div className="comparison-side new-code">
            <Group spacing="xs" mb="xs">
              <IconCheck size={16} color="#22c55e" />
              <Text size="sm" weight={600} color="green">
                Cod Corectat
              </Text>
            </Group>
            <Paper p="md" withBorder className="code-paper new">
              <ScrollArea style={{ maxHeight: 200 }}>
                <Code block className="diff-code">
                  {newCode || "No changes to add"}
                </Code>
              </ScrollArea>
            </Paper>
          </div>
        </div>

        {/* Actions */}
        <Group position="apart" mt="md">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleReject}
            disabled={applying}
          >
            Renunță
          </Button>
          <Group spacing="xs">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={applying}
            >
              Revizuiește mai târziu
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleAccept}
              loading={applying}
              className="accept-button"
            >
              Acceptă & Aplică
            </Button>
          </Group>
        </Group>

        {/* Warning */}
        <Paper p="sm" withBorder className="warning-section">
          <Text size="xs" color="dimmed">
            ⚠️ Această acțiune va modifica codul din editor. Poți face Undo (Ctrl+Z) dacă e nevoie.
          </Text>
        </Paper>
      </Stack>
    </Modal>
  );
};

export default ApplyFixModal;

