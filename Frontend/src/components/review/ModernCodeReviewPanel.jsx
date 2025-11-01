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
  TextInput,
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
  IconSearch,
  IconDownload,
  IconGitCompare,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";
import codeFileService from "../../services/codefile.service";
import ModernFindingsList from "./ModernFindingsList";
import FileUploadZone from "./FileUploadZone";
import AutoFixPanel from "./AutoFixPanel";
import DiffViewer from "./DiffViewer";
import "./ModernCodeReviewPanel.css";

const ModernCodeReviewPanel = ({ initialCode = "", initialFileName = "", projectId = null, readOnly = false }) => {
  const [code, setCode] = useState(initialCode);
  const [gitDiff, setGitDiff] = useState("");
  const [fileName, setFileName] = useState(initialFileName);
  const [reviewMode, setReviewMode] = useState("code");
  
  // Update code when initialCode prop changes
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
    if (initialFileName) {
      setFileName(initialFileName);
    }
  }, [initialCode, initialFileName]);

  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState(new Set());
  const [showFixAppliedAnimation, setShowFixAppliedAnimation] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const editorRef = useRef(null);

  // Function to download fixed file
  const handleDownloadFile = async () => {
    if (!currentFileId) {
      setError("Nu există fișier pentru descărcare. Uploadează un fișier mai întâi.");
      return;
    }

    try {
      const downloadFileName = fileName || `fixed_code_${new Date().getTime()}.txt`;
      await codeFileService.downloadFile(currentFileId, downloadFileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      setError("Eroare la descărcarea fișierului: " + (error.message || "Eroare necunoscută"));
    }
  };

  // Function to apply fix using backend API
  const applyFixToCode = async (finding) => {
    if (!finding.patch) {
      console.error("No patch provided in finding");
      return false;
    }

    const extractOldNewFromPatch = (patch) => {
      const lines = patch.split('\n');
      const oldLines = [];
      const newLines = [];
      for (const line of lines) {
        if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) continue;
        if (line.startsWith('@@')) continue;
        if (line.startsWith('-') && !line.startsWith('---')) oldLines.push(line.substring(1));
        else if (line.startsWith('+') && !line.startsWith('+++')) newLines.push(line.substring(1));
        else {
          // context
          oldLines.push(line.replace(/^ /, ''));
          newLines.push(line.replace(/^ /, ''));
        }
      }
      return {
        oldCode: oldLines.join('\n'),
        newCode: newLines.join('\n'),
      };
    };

    try {
      let fileIdToUse = currentFileId;

      // If no file ID, create temp file first
      if (!fileIdToUse) {
        const currentCode = reviewMode === "code" ? code : gitDiff;
        
        if (!currentCode || !currentCode.trim()) {
          console.error("No code content to save");
          return false;
        }

        console.log("Creating temp file...", { fileName: fileName || "temp-code.txt", contentLength: currentCode.length });
        
        let fileData;
        try {
          fileData = await codeFileService.createTempFile(
            fileName || "temp-code.txt",
            currentCode
          );
          console.log("Temp file created:", fileData);
          
          if (fileData && fileData.fileId) {
            fileIdToUse = fileData.fileId;
            setCurrentFileId(fileIdToUse);
          } else {
            console.warn("No fileId in response, will apply fix locally");
            fileIdToUse = null;
          }
        } catch (fileError) {
          console.error("Error creating temp file:", fileError);
          
          // If it's an auth error, show friendly message and skip backend
          if (fileError.name === "AuthenticationError" || fileError.message?.includes("Autentificare")) {
            console.warn("Authentication error, will apply fix locally without backend sync");
          } else {
            console.warn("Failed to create temp file, will apply fix locally:", fileError.message);
          }
          
          // Continue with local application only (skip backend)
          fileIdToUse = null;
        }
      }

      // Try to apply patch via backend if we have a file ID
      let result = null;
      if (fileIdToUse) {
        try {
          console.log("Applying patch to file:", fileIdToUse);
          result = await codeFileService.applyPatch(fileIdToUse, finding.patch);
          console.log("Patch result:", result);
        } catch (patchError) {
          console.warn("Backend patch application failed:", patchError);
          // Continue with local fallback
          result = null;
        }
      }

      if (result && result.success) {
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

      // Fallback: apply locally if backend patch failed
      console.log("Backend patch failed, trying local fallback...");
      const currentCodeValue = reviewMode === "code" ? code : gitDiff;
      
      // Check if patch is in unified diff format
      const hasDiffFormat = finding.patch.includes('\n-') || finding.patch.includes('\n+') || 
                            finding.patch.startsWith('-') || finding.patch.startsWith('+');
      
      let locallyUpdated = currentCodeValue;
      let replacementMade = false;

      if (hasDiffFormat) {
        // Patch is in unified diff format - extract old and new code
        const { oldCode, newCode } = extractOldNewFromPatch(finding.patch);
        
        if (oldCode && newCode && currentCodeValue.includes(oldCode)) {
          locallyUpdated = currentCodeValue.replace(oldCode, newCode);
          replacementMade = locallyUpdated !== currentCodeValue;
        }
      } else {
        // Patch is just corrected code - need to find and replace based on line numbers
        console.log("Patch is not unified diff format, using line-based replacement");
        
        if (finding.lineStart && finding.lineEnd && currentCodeValue) {
          const codeLines = currentCodeValue.split('\n');
          const startIdx = Math.max(0, finding.lineStart - 1);
          const endIdx = Math.min(codeLines.length, finding.lineEnd);
          
          // Extract original code at those lines
          const originalLines = codeLines.slice(startIdx, endIdx);
          const originalCode = originalLines.join('\n');
          const correctedCode = finding.patch.trim();
          
          console.log("Original code at lines:", originalCode);
          console.log("Corrected code:", correctedCode);
          
          // Replace the original code with corrected code
          if (originalCode !== correctedCode && currentCodeValue.includes(originalCode)) {
            locallyUpdated = currentCodeValue.replace(originalCode, correctedCode);
            replacementMade = locallyUpdated !== currentCodeValue;
            
            // If simple replace didn't work, try line-by-line replacement
            if (!replacementMade) {
              const newCodeLines = [...codeLines];
              newCodeLines.splice(startIdx, endIdx - startIdx, ...correctedCode.split('\n'));
              locallyUpdated = newCodeLines.join('\n');
              replacementMade = locallyUpdated !== currentCodeValue;
            }
          }
        }
      }

      if (replacementMade) {
        console.log("Local replacement successful");
        
        // Update editor
        if (reviewMode === "code") {
          setCode(locallyUpdated);
        } else {
          setGitDiff(locallyUpdated);
        }

        // Sync to backend current file
        try {
          await codeFileService.updateCurrentContent(fileIdToUse, locallyUpdated);
          console.log("Synced to backend successfully");
        } catch (syncErr) {
          console.warn("Sync to backend failed after local apply:", syncErr);
        }

        setAppliedFixes(prev => new Set([...prev, finding.lineStart]));
        setHasUnsavedChanges(true);
        setShowFixAppliedAnimation(true);
        setTimeout(() => setShowFixAppliedAnimation(false), 2000);
        return true;
      }

      console.error("Patch application failed and no local fallback possible.");
      console.error("Patch:", finding.patch);
      console.error("Current code length:", currentCodeValue?.length);
      return false;
    } catch (error) {
      console.error("Error applying fix:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Attempt fallback on exception
      try {
        const { oldCode, newCode } = extractOldNewFromPatch(finding.patch);
        const currentCodeValue = reviewMode === "code" ? code : gitDiff;
        if (oldCode && newCode && currentCodeValue.includes(oldCode)) {
          const locallyUpdated = currentCodeValue.replace(oldCode, newCode);
          if (reviewMode === "code") setCode(locallyUpdated); else setGitDiff(locallyUpdated);
          if (currentFileId) {
            try { await codeFileService.updateCurrentContent(currentFileId, locallyUpdated); } catch {}
          }
          setAppliedFixes(prev => new Set([...prev, finding.lineStart]));
          setHasUnsavedChanges(true);
          setShowFixAppliedAnimation(true);
          setTimeout(() => setShowFixAppliedAnimation(false), 2000);
          return true;
        }
      } catch {}

      return false;
    }
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

  // Filter findings based on search query
  const filterFindings = (findings) => {
    if (!searchQuery || !findings) return findings;
    const query = searchQuery.toLowerCase();
    return findings.filter((f) => {
      return (
        f.message?.toLowerCase().includes(query) ||
        f.suggestion?.toLowerCase().includes(query) ||
        f.severity?.toLowerCase().includes(query) ||
        f.category?.toLowerCase().includes(query) ||
        f.file?.toLowerCase().includes(query)
      );
    });
  };

  const filteredFindings = reviewResult?.findings ? filterFindings(reviewResult.findings) : [];

  return (
    <div className="modern-review-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <Group spacing="md" style={{ flex: 1 }}>
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

          {/* Search Bar */}
          {reviewResult?.findings && reviewResult.findings.length > 0 && (
            <Box style={{ flex: 1, maxWidth: 400, margin: '0 16px' }}>
              <TextInput
                placeholder="🔍 Caută în findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="md"
                radius="xl"
                leftSection={<IconSearch size={18} />}
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
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: 'var(--accent-color, #667eea)',
                      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                    },
                  },
                }}
                className="header-search-input"
              />
            </Box>
          )}

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
              {currentFileId && hasUnsavedChanges && (
                <Tooltip label="Descarcă fișierul cu fix-uri">
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    onClick={handleDownloadFile}
                    size="sm"
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
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
                          {searchQuery ? (
                            <>
                              {filteredFindings.length} din {reviewResult.findings?.length || 0} probleme
                              {filteredFindings.length < reviewResult.findings?.length && (
                                <Text component="span" color="dimmed" size="xs" ml={4}>
                                  (filtrate)
                                </Text>
                              )}
                            </>
                          ) : (
                            `${reviewResult.findings?.length || 0} probleme găsite`
                          )}
                        </Text>
                      </div>
                      {reviewResult.effortEstimate && (
                        <Badge color="blue" size="lg" variant="light">
                          ~{reviewResult.effortEstimate.hours}h
                        </Badge>
                      )}
                    </Group>
                  </div>

                  {filteredFindings && filteredFindings.length > 0 ? (
                    <>
                      <Group position="apart" mb="md">
                        <Badge color="blue" size="lg" variant="light">
                          {filteredFindings.filter((f) => f.patch).length} cu fix-uri automate
                        </Badge>
                        {filteredFindings.some((f) => f.patch) && (
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

                      {showAutoFix && filteredFindings.some((f) => f.patch) && (
                        <div style={{ marginBottom: "16px" }}>
                          <AutoFixPanel findings={filteredFindings} />
                        </div>
                      )}

                      <ModernFindingsList 
                        findings={filteredFindings} 
                        onApplyFix={applyFixToCode}
                        appliedFixes={appliedFixes}
                        originalCode={currentCode}
                      />

                      {/* Diff Viewer - mutat după findings pentru a nu bloca */}
                      {currentFileId && hasUnsavedChanges && (
                        <div style={{ marginTop: "24px", marginBottom: "16px" }}>
                          <Group position="apart" mb="xs">
                            <Text size="sm" weight={600} color="dimmed">
                              Diff Viewer
                            </Text>
                            <Button
                              size="xs"
                              variant="light"
                              color="blue"
                              leftSection={<IconGitCompare size={14} />}
                              onClick={() => setShowDiffViewer(!showDiffViewer)}
                            >
                              {showDiffViewer ? "Ascunde Diff" : "Arată Diff"}
                            </Button>
                          </Group>
                          {showDiffViewer && (
                            <DiffViewer fileId={currentFileId} />
                          )}
                        </div>
                      )}
                    </>
                  ) : searchQuery && reviewResult.findings && reviewResult.findings.length > 0 ? (
                    <div className="no-findings">
                      <IconSearch size={48} color="var(--accent-color)" />
                      <Text size="lg" weight={600} mt="md">
                        Nu s-au găsit rezultate
                      </Text>
                      <Text size="sm" color="dimmed">
                        Nu există probleme care să corespundă cu "{searchQuery}"
                      </Text>
                      <Button
                        variant="light"
                        size="sm"
                        mt="md"
                        onClick={() => setSearchQuery("")}
                        leftSection={<IconX size={16} />}
                      >
                        Șterge filtrul
                      </Button>
                    </div>
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

