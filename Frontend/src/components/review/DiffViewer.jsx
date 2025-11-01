import { useState, useEffect } from "react";
import {
  Paper,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Code,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import {
  IconGitCompare,
  IconFileText,
  IconRefresh,
} from "@tabler/icons-react";
import codeFileService from "../../services/codefile.service";
import "./DiffViewer.css";

const DiffViewer = ({ fileId, onRefresh }) => {
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("split");

  useEffect(() => {
    if (fileId) {
      loadDiff();
    }
  }, [fileId]);

  const loadDiff = async () => {
    if (!fileId) return;
    
    setLoading(true);
    try {
      const data = await codeFileService.getDiff(fileId);
      setDiffData(data);
    } catch (error) {
      console.error("Error loading diff:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!fileId) {
    return (
      <Paper p="md" withBorder className="diff-viewer-empty">
        <Text size="sm" color="dimmed" align="center">
          Nu există fișier activ pentru diff
        </Text>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" align="center">Se încarcă diff-ul...</Text>
      </Paper>
    );
  }

  if (!diffData) {
    return null;
  }

  const { originalContent, currentContent, hasChanges } = diffData;

  return (
    <div className="diff-viewer">
      <Paper p="md" withBorder className="diff-header">
        <Group position="apart">
          <Group spacing="xs">
            <IconGitCompare size={20} style={{ color: "var(--accent-color)" }} />
            <Text size="sm" weight={600}>
              Diff Viewer
            </Text>
            {hasChanges ? (
              <Badge color="orange" size="sm" variant="filled">
                {" "}
                Modificat
              </Badge>
            ) : (
              <Badge color="green" size="sm" variant="light">
                Nemodificat
              </Badge>
            )}
          </Group>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconRefresh size={14} />}
            onClick={loadDiff}
          >
            Refresh
          </Button>
        </Group>
      </Paper>

      <Tabs value={activeTab} onChange={setActiveTab} className="diff-tabs">
        <Tabs.List>
          <Tabs.Tab value="split" leftSection={<IconGitCompare size={14} />}>
            Split View
          </Tabs.Tab>
          <Tabs.Tab value="original" leftSection={<IconFileText size={14} />}>
            Original
          </Tabs.Tab>
          <Tabs.Tab value="current" leftSection={<IconFileText size={14} />}>
            Current
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="split" pt="md">
          <div className="split-diff">
            <div className="diff-side">
              <Text size="xs" weight={600} mb="xs" color="red">
                ❌ Original
              </Text>
              <Paper p="sm" withBorder className="code-container original">
                <ScrollArea style={{ maxHeight: 400 }}>
                  <Code block className="diff-code">
                    {originalContent}
                  </Code>
                </ScrollArea>
              </Paper>
            </div>

            <div className="diff-side">
              <Text size="xs" weight={600} mb="xs" color="green">
                ✅ Current (Modified)
              </Text>
              <Paper p="sm" withBorder className="code-container current">
                <ScrollArea style={{ maxHeight: 400 }}>
                  <Code block className="diff-code">
                    {currentContent}
                  </Code>
                </ScrollArea>
              </Paper>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="original" pt="md">
          <Paper p="sm" withBorder>
            <ScrollArea style={{ maxHeight: 400 }}>
              <Code block className="diff-code">
                {originalContent}
              </Code>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="current" pt="md">
          <Paper p="sm" withBorder>
            <ScrollArea style={{ maxHeight: 400 }}>
              <Code block className="diff-code">
                {currentContent}
              </Code>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default DiffViewer;

