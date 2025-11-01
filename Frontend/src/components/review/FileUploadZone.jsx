import { useState, useRef } from "react";
import { Text, Group, Button, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconUpload, IconFile, IconX, IconFileCode, IconFolderOpen } from "@tabler/icons-react";
import "./FileUploadZone.css";

const FileUploadZone = ({ onFilesSelected, acceptedTypes = [".js", ".jsx", ".ts", ".tsx", ".py", ".cs", ".java", ".go", ".cpp", ".c", ".h"] }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleChange = (e) => {
    e.preventDefault();
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter((file) => {
      const ext = "." + file.name.split(".").pop();
      return acceptedTypes.includes(ext) || acceptedTypes.length === 0;
    });

    setFiles((prev) => [...prev, ...validFiles]);
    
    // Read file contents and pass to parent
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        onFilesSelected({
          name: file.name,
          content: e.target.result,
          size: file.size,
          type: file.type,
        });
      };
      reader.readAsText(file);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="file-upload-zone">
      <div
        className={`dropzone ${dragActive ? "active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleChange}
          style={{ display: "none" }}
        />
        
        <div className="dropzone-content">
          <IconUpload size={48} className="upload-icon" />
          <Text size="lg" weight={600} mt="md">
            Drop fișiere aici sau click pentru a selecta
          </Text>
          <Text size="sm" color="dimmed" mt="xs">
            Acceptă: {acceptedTypes.join(", ")}
          </Text>
        </div>
      </div>

      {files.length > 0 && (
        <div className="files-list">
          <Group position="apart" mb="sm">
            <Text size="sm" weight={600}>
              Fișiere selectate ({files.length})
            </Text>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => setFiles([])}
            >
              Șterge toate
            </Button>
          </Group>

          <div className="files-items">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <Group spacing="sm">
                  <IconFileCode size={20} className="file-icon" />
                  <div className="file-info">
                    <Text size="sm" weight={500}>
                      {file.name}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {formatFileSize(file.size)}
                    </Text>
                  </div>
                </Group>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => removeFile(index)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;

