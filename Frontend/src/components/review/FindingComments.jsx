import { useState } from "react";
import {
  Stack,
  Textarea,
  Button,
  Text,
  Group,
  Avatar,
  ActionIcon,
  Tooltip,
  Badge,
} from "@mantine/core";
import {
  IconSend,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconMessage,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import "./FindingComments.css";

const FindingComments = ({ findingId, initialComments = [] }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      author: user?.email || "Anonymous",
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    setComments([...comments, comment]);
    setNewComment("");
  };

  const handleDeleteComment = (commentId) => {
    setComments(comments.filter((c) => c.id !== commentId));
  };

  const handleEditComment = (commentId) => {
    const comment = comments.find((c) => c.id === commentId);
    setEditingId(commentId);
    setEditText(comment.text);
  };

  const handleSaveEdit = (commentId) => {
    setComments(
      comments.map((c) =>
        c.id === commentId ? { ...c, text: editText, edited: true } : c
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleToggleResolved = (commentId) => {
    setComments(
      comments.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      )
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Acum";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} ore`;
    if (diffDays < 7) return `${diffDays} zile`;
    return date.toLocaleDateString("ro-RO");
  };

  return (
    <div className="finding-comments">
      <Group spacing="xs" mb="md">
        <IconMessage size={18} style={{ color: "var(--accent-color)" }} />
        <Text size="sm" weight={600}>
          Discuție ({comments.length})
        </Text>
      </Group>

      {comments.length > 0 && (
        <Stack spacing="sm" mb="md">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.resolved ? "resolved" : ""}`}
            >
              <Group position="apart" mb="xs">
                <Group spacing="xs">
                  <Avatar size={24} radius="xl" color="blue">
                    {comment.author[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Text size="xs" weight={600}>
                      {comment.author}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {formatTimestamp(comment.timestamp)}
                      {comment.edited && " (editat)"}
                    </Text>
                  </div>
                </Group>
                <Group spacing={4}>
                  {comment.resolved && (
                    <Badge size="xs" color="green" variant="filled">
                      Rezolvat
                    </Badge>
                  )}
                  <Tooltip label={comment.resolved ? "Marchează nerezolvat" : "Marchează rezolvat"}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color={comment.resolved ? "gray" : "green"}
                      onClick={() => handleToggleResolved(comment.id)}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Editează">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => handleEditComment(comment.id)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Șterge">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {editingId === comment.id ? (
                <div className="comment-edit">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    size="xs"
                    minRows={2}
                    autosize
                    mb="xs"
                  />
                  <Group spacing="xs">
                    <Button
                      size="xs"
                      leftSection={<IconCheck size={14} />}
                      onClick={() => handleSaveEdit(comment.id)}
                    >
                      Salvează
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconX size={14} />}
                      onClick={handleCancelEdit}
                    >
                      Anulează
                    </Button>
                  </Group>
                </div>
              ) : (
                <Text size="sm" className="comment-text">
                  {comment.text}
                </Text>
              )}
            </div>
          ))}
        </Stack>
      )}

      <div className="comment-input">
        <Textarea
          placeholder="Adaugă un comentariu sau întrebare..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          size="sm"
          minRows={2}
          autosize
          mb="xs"
        />
        <Button
          size="xs"
          leftSection={<IconSend size={14} />}
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          fullWidth
        >
          Trimite comentariu
        </Button>
      </div>
    </div>
  );
};

export default FindingComments;

