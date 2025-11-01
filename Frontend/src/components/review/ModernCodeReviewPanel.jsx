import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  Loader,
  Alert,
  Select,
  Textarea,
  ActionIcon,
  Tooltip,
  Paper,
  Transition,
  LoadingOverlay,
} from "@mantine/core";
import {
  IconCode,
  IconSend,
  IconCheck,
  IconAlertCircle,
  IconSparkles,
  IconX,
  IconRefresh,
  IconUpload,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";
import codeFileService from "../../services/codefile.service";
import ModernFindingsList from "./ModernFindingsList";
import FileUploadZone from "./FileUploadZone";
import AutoFixPanel from "./AutoFixPanel";
import "./ModernCodeReviewPanel.css";

const ModernCodeReviewPanel = () => {
  const [code, setCode] = useState("");
  const [gitDiff, setGitDiff] = useState("");
  const [fileName, setFileName] = useState("");
  const [reviewMode, setReviewMode] = useState("code");

  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState(new Set());
  const [showFixAppliedAnimation, setShowFixAppliedAnimation] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const editorRef = useRef(null);

  // Function to apply fix using backend API
  const applyFixToCode = async (finding) => {
    if (!finding.patch) return false;

    try {
      // If no file ID, create temp file first
      if (!currentFileId) {
        const currentCode = reviewMode === "code" ? code : gitDiff;
        const fileData = await codeFileService.createTempFile(
          fileName || "temp-code.txt",
          currentCode
        );
        setCurrentFileId(fileData.fileId);
        
        // Now apply patch
        const result = await codeFileService.applyPatch(fileData.fileId, finding.patch);
        
        if (result.success) {
          // Update editor with new content
          if (reviewMode === "code") {
            setCode(result.updatedContent);
          } else {
            setGitDiff(result.updatedContent);
          }
          
          // Mark this fix as applied
          setAppliedFixes(prev => new Set([...prev, finding.lineStart]));
          setHasUnsavedChanges(true);
          
          // Show animation
          setShowFixAppliedAnimation(true);
          setTimeout(() => setShowFixAppliedAnimation(false), 2000);
          
          return true;
        }
      } else {
        // Apply patch to existing file
        const result = await codeFileService.applyPatch(currentFileId, finding.patch);
        
        if (result.success) {
          // Update editor
          if (reviewMode === "code") {
            setCode(result.updatedContent);
          } else {
            setGitDiff(result.updatedContent);
          }
          
          setAppliedFixes(prev => new Set([...prev, finding.lineStart]));
          setHasUnsavedChanges(true);
          
          setShowFixAppliedAnimation(true);
          setTimeout(() => setShowFixAppliedAnimation(false), 2000);
          
          return true;
        }
      }
    } catch (error) {
      console.error("Error applying fix:", error);
    }

    return false;
  };

  // Reset to original code
  const handleResetToOriginal = async () => {
    if (!currentFileId) return;
    
    try {
      const result = await codeFileService.resetToOriginal(currentFileId);
      if (result.success) {
        if (reviewMode === "code") {
          setCode(result.content);
        } else {
          setGitDiff(result.content);
        }
        setAppliedFixes(new Set());
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error resetting:", error);
    }
  };

  const handleFileSelected = (fileData) => {
    setFileName(fileData.name);
    if (reviewMode === "code") {
      setCode(fileData.content);
    } else {
      setGitDiff(fileData.content);
    }
    setUploadMode(false);
  };

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const response = await reviewService.checkStatus();
      setOllamaStatus(response.data);
    } catch (err) {
      console.error("Eroare la verificarea status-ului Ollama:", err);
      setOllamaStatus({
        status: "error",
        message: "Nu se poate conecta la serviciul de review",
      });
    }
  };

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReviewResult(null);

    try {
      const requestData = {
        fileName: fileName || "unknown",
      };

      if (reviewMode === "code") {
        if (!code.trim()) {
          setError("Te rugăm să introduci cod pentru review");
          setLoading(false);
          return;
        }
        requestData.code = code;
      } else {
        if (!gitDiff.trim()) {
          setError("Te rugăm să introduci un git diff pentru review");
          setLoading(false);
          return;
        }
        requestData.gitDiff = gitDiff;
      }

      const response = await reviewService.performReview(requestData);
      setReviewResult(response.data);
    } catch (err) {
      console.error("Eroare la review:", err);
      setError(
        err.response?.data?.errorMessage ||
          "A apărut o eroare la efectuarea review-ului"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReviewResult(null);
    setCode("");
    setGitDiff("");
    setFileName("");
    setError(null);
  };

  const currentCode = reviewMode === "code" ? code : gitDiff;
  const setCurrentCode = reviewMode === "code" ? setCode : setGitDiff;

  // Calculate line numbers
  const lineCount = currentCode ? currentCode.split('\n').length : 1;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

  // Sync scroll between line numbers and code
  const handleScroll = (e) => {
    const lineNumbersEl = document.querySelector('.line-numbers');
    if (lineNumbersEl) {
      lineNumbersEl.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <div className="modern-review-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <Group spacing="md">
            <div className="header-icon">
              <IconSparkles size={32} />
            </div>
            <div>
              <Text size="xl" weight={700} className="header-title">
                AI Code Review
              </Text>
              <Text size="sm" color="dimmed">
                Analizează codul cu inteligență artificială
              </Text>
            </div>
          </Group>

          <Group spacing="sm">
            {ollamaStatus && (
              <Badge
                color={ollamaStatus.status === "healthy" ? "green" : "red"}
                variant="dot"
                size="lg"
                className="status-badge"
              >
                {ollamaStatus.status === "healthy" ? "Online" : "Offline"}
              </Badge>
            )}
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <IconMinimize size={20} /> : <IconMaximize size={20} />}
            </ActionIcon>
          </Group>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-button ${reviewMode === "code" ? "active" : ""}`}
          onClick={() => setReviewMode("code")}
        >
          <IconCode size={18} />
          <span>Full Code</span>
        </button>
        <button
          className={`mode-button ${reviewMode === "diff" ? "active" : ""}`}
          onClick={() => setReviewMode("diff")}
        >
          <IconUpload size={18} />
          <span>Git Diff</span>
        </button>
        <div
          className="mode-indicator"
          style={{
            transform: `translateX(${reviewMode === "code" ? "0" : "100%"})`,
          }}
        />
      </div>

      {/* Main Content Split View */}
      <div className={`split-container ${reviewResult ? "split-active" : ""}`}>
        {/* Left Panel - Editor */}
        <div className="editor-panel">
          <div className="editor-toolbar">
            <Group spacing="xs">
              <Textarea
                placeholder="nume-fisier.js (opțional)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                size="xs"
                variant="filled"
                className="filename-input"
                styles={{ input: { width: "240px" } }}
                rightSection={
                  hasUnsavedChanges && (
                    <Badge size="xs" color="orange" variant="dot">
                      Modified
                    </Badge>
                  )
                }
              />
              <Tooltip label={uploadMode ? "Editor manual" : "Upload fișier"}>
                <ActionIcon
                  variant={uploadMode ? "filled" : "subtle"}
                  color="blue"
                  onClick={() => setUploadMode(!uploadMode)}
                  size="lg"
                >
                  {uploadMode ? <IconCode size={18} /> : <IconUpload size={18} />}
                </ActionIcon>
              </Tooltip>
            </Group>

            <Group spacing="xs">
              {hasUnsavedChanges && currentFileId && (
                <Tooltip label="Reset la codul original">
                  <ActionIcon
                    variant="subtle"
                    color="orange"
                    onClick={handleResetToOriginal}
                    size="sm"
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {reviewResult && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={handleReset}
                  size="sm"
                >
                  <IconX size={16} />
                </ActionIcon>
              )}
              <Button
                leftSection={<IconSend size={16} />}
                onClick={handleReview}
                loading={loading}
                disabled={!currentCode.trim() || ollamaStatus?.status !== "healthy"}
                size="xs"
                className="review-button"
              >
                {loading ? "Analizez..." : "Review"}
              </Button>
            </Group>
          </div>

          <div className="editor-container" ref={editorRef}>
            {uploadMode ? (
              <div style={{ padding: "20px", width: "100%" }}>
                <FileUploadZone onFilesSelected={handleFileSelected} />
              </div>
            ) : (
              <>
                <div className="line-numbers">
                  {lineNumbers.map((num) => (
                    <div key={num} className="line-number">
                      {num}
                    </div>
                  ))}
                </div>
                <textarea
                  className={`code-editor ${showFixAppliedAnimation ? 'fix-applied' : ''}`}
                  placeholder={
                    reviewMode === "code"
                      ? "// Scrie sau inserează codul aici...\n\nfunction example() {\n  // Your code\n}"
                      : "# Inserează output-ul de la 'git diff' aici...\n\ndiff --git a/file.js b/file.js\nindex 123..456\n..."
                  }
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  onScroll={handleScroll}
                  spellCheck={false}
                />
              </>
            )}
            {loading && (
              <div className="editor-overlay">
                <div className="loading-indicator">
                  <Loader size="lg" variant="bars" />
                  <Text size="sm" mt="md">
                    AI-ul analizează codul...
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <Transition
          mounted={!!reviewResult || !!error}
          transition="slide-left"
          duration={400}
          timingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
        >
          {(styles) => (
            <div className="results-panel" style={styles}>
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Eroare"
                  color="red"
                  className="error-alert"
                  withCloseButton
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              {reviewResult && (
                <div className="results-content">
                  <div className="results-header">
                    <Group position="apart">
                      <div>
                        <Text size="lg" weight={600}>
                          Rezultate Analiză
                        </Text>
                        <Text size="sm" color="dimmed">
                          {reviewResult.findings?.length || 0} probleme găsite
                        </Text>
                      </div>
                      {reviewResult.effortEstimate && (
                        <Badge color="blue" size="lg" variant="light">
                          ~{reviewResult.effortEstimate.hours}h
                        </Badge>
                      )}
                    </Group>
                  </div>

                  {reviewResult.findings && reviewResult.findings.length > 0 ? (
                    <>
                      <Group position="apart" mb="md">
                        <Badge color="blue" size="lg" variant="light">
                          {reviewResult.findings.filter((f) => f.patch).length} cu fix-uri automate
                        </Badge>
                        {reviewResult.findings.some((f) => f.patch) && (
                          <Button
                            size="xs"
                            variant="light"
                            color="violet"
                            leftSection={<IconSparkles size={14} />}
                            onClick={() => setShowAutoFix(!showAutoFix)}
                          >
                            {showAutoFix ? "Ascunde Auto-Fix" : "Arată Auto-Fix"}
                          </Button>
                        )}
                      </Group>

                      {showAutoFix && reviewResult.findings.some((f) => f.patch) && (
                        <div style={{ marginBottom: "16px" }}>
                          <AutoFixPanel findings={reviewResult.findings} />
                        </div>
                      )}

                      <ModernFindingsList 
                        findings={reviewResult.findings} 
                        onApplyFix={applyFixToCode}
                        appliedFixes={appliedFixes}
                      />
                    </>
                  ) : (
                    <div className="no-findings">
                      <IconCheck size={48} color="var(--accent-color)" />
                      <Text size="lg" weight={600} mt="md">
                        Cod curat!
                      </Text>
                      <Text size="sm" color="dimmed">
                        Nu s-au găsit probleme în codul analizat
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Transition>
      </div>
    </div>
  );
};

export default ModernCodeReviewPanel;

