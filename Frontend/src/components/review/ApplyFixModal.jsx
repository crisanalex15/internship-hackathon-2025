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

const ApplyFixModal = ({ opened, onClose, finding, onAccept, onReject, originalCode }) => {
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
  const parsePatch = (patch, originalCodeText) => {
    if (!patch || !patch.trim()) {
      return { oldCode: '', newCode: '', noChanges: true, hasChanges: false };
    }

    // Check if patch is in unified diff format (has - or + lines)
    const hasDiffFormat = patch.includes('\n-') || patch.includes('\n+') || 
                          patch.startsWith('-') || patch.startsWith('+');

    if (!hasDiffFormat) {
      // Patch is just the corrected code, not a unified diff
      // We need to extract the original code from the editor
      if (originalCodeText && finding.lineStart && finding.lineEnd) {
        const codeLines = originalCodeText.split('\n');
        const startIdx = Math.max(0, finding.lineStart - 1);
        const endIdx = Math.min(codeLines.length, finding.lineEnd);
        const originalLines = codeLines.slice(startIdx, endIdx);
        const oldCode = originalLines.join('\n').trim();
        const newCode = patch.trim();
        
        return {
          oldCode: oldCode || 'Fără modificări',
          newCode: newCode || 'Fără modificări',
          noChanges: oldCode === newCode,
          hasChanges: oldCode !== newCode
        };
      } else {
        // Can't extract original code, so we can't determine changes
        return {
          oldCode: 'Nu se poate determina codul original',
          newCode: patch.trim(),
          noChanges: false, // Assume there are changes if we can't verify
          hasChanges: true
        };
      }
    }

    // Patch is in unified diff format - parse normally
    const lines = patch.split('\n');
    const oldLines = []; // Lines marked with -
    const newLines = []; // Lines marked with +
    let hasAdd = false;
    let hasRemove = false;

    lines.forEach((line) => {
      // Skip headers
      if (line.startsWith('diff') || 
          line.startsWith('index') || 
          line.startsWith('---') || 
          line.startsWith('+++')) {
        return;
      }
      
      // Skip @@ headers (but note we're in a patch block)
      if (line.startsWith('@@')) {
        return;
      }

      // Extract removed lines (marked with -)
      if (line.startsWith('-') && !line.startsWith('---')) {
        oldLines.push(line.substring(1));
        hasRemove = true;
      } 
      // Extract added lines (marked with +)
      else if (line.startsWith('+') && !line.startsWith('+++')) {
        newLines.push(line.substring(1));
        hasAdd = true;
      } 
      // Context lines (marked with space) - we can include them for display, but not for change detection
      else if (line.startsWith(' ') || line.trim() === '') {
        // Skip context lines - they cause false positives
      }
    });

    const oldCode = oldLines.join('\n').trim();
    const newCode = newLines.join('\n').trim();

    // If there are + or - lines, there ARE changes (regardless of content comparison)
    // Only no changes if: no + and no - lines at all
    const hasChanges = hasAdd || hasRemove;
    const noChanges = !hasChanges;

    return { 
      oldCode: oldCode || 'Fără modificări', 
      newCode: newCode || 'Fără modificări', 
      noChanges, 
      hasChanges 
    };
  };

  const { oldCode, newCode, noChanges, hasChanges } = finding.patch
    ? parsePatch(finding.patch, originalCode)
    : { oldCode: '', newCode: '', noChanges: true, hasChanges: false };
  
  // Debug logging
  if (finding.patch) {
    console.log('Patch content:', finding.patch);
    console.log('Original code available:', !!originalCode);
    console.log('Parsed - oldCode:', oldCode);
    console.log('Parsed - newCode:', newCode);
    console.log('hasChanges:', hasChanges, 'noChanges:', noChanges);
  }

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
            {noChanges ? "Nu există modificări propuse pentru acest fix." : finding.message}
          </Text>
          {finding.suggestion && !noChanges && (
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
                  {oldCode}
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
                  {newCode}
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
              disabled={noChanges}
            >
              {noChanges ? "Fără schimbări" : "Acceptă & Aplică"}
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

