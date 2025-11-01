import { useState, useEffect } from "react";
import {
  Stack,
  Paper,
  Text,
  Badge,
  Group,
  Button,
  Loader,
  Alert,
  Title,
  Timeline,
  Code,
} from "@mantine/core";
import {
  IconHistory,
  IconAlertCircle,
  IconClock,
  IconFile,
} from "@tabler/icons-react";
import { reviewService } from "../../services/review.service";

const ReviewHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reviewService.getHistory(20);
      setHistory(response.data);
    } catch (err) {
      console.error("Eroare la încărcarea istoricului:", err);
      setError("Nu s-a putut încărca istoricul review-urilor");
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Paper shadow="sm" p="xl" withBorder>
        <Group position="center" spacing="md">
          <Loader size="lg" />
          <Text>Se încarcă istoricul...</Text>
        </Group>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Eroare"
        color="red"
        withCloseButton
        onClose={() => setError(null)}
      >
        {error}
        <Button variant="light" size="xs" mt="md" onClick={fetchHistory}>
          Reîncearcă
        </Button>
      </Alert>
    );
  }

  if (history.length === 0) {
    return (
      <Paper shadow="sm" p="xl" withBorder>
        <Stack align="center" spacing="md">
          <IconHistory size={48} color="gray" />
          <Text color="dimmed">Nu există review-uri în istoric</Text>
          <Text size="sm" color="dimmed">
            Efectuează primul tău code review pentru a începe!
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" withBorder>
      <Stack spacing="lg">
        <Group position="apart">
          <Title order={3}>
            <IconHistory
              size={24}
              style={{ verticalAlign: "middle", marginRight: "8px" }}
            />
            Istoric Review-uri
          </Title>
          <Button variant="light" size="xs" onClick={fetchHistory}>
            Reîmprospătează
          </Button>
        </Group>

        <Timeline active={-1} bulletSize={24} lineWidth={2}>
          {history.map((review) => {
            let effortEstimate = null;
            try {
              effortEstimate = review.effortEstimate
                ? JSON.parse(review.effortEstimate)
                : null;
            } catch (e) {
              console.error("Eroare la parsarea effort estimate:", e);
            }

            return (
              <Timeline.Item
                key={review.id}
                bullet={<IconFile size={12} />}
                title={review.file}
              >
                <Group spacing="xs" mt="xs">
                  <Badge color={getSeverityColor(review.maxSeverity)} size="sm">
                    {review.issuesCount} {review.issuesCount === 1 ? "problemă" : "probleme"}
                  </Badge>
                  {review.maxSeverity && (
                    <Badge
                      color={getSeverityColor(review.maxSeverity)}
                      variant="outline"
                      size="sm"
                    >
                      Max: {review.maxSeverity}
                    </Badge>
                  )}
                  {review.reviewType && (
                    <Badge color="gray" variant="outline" size="sm">
                      {review.reviewType === "full" ? "Full Review" : "Git Diff"}
                    </Badge>
                  )}
                </Group>

                {effortEstimate && (
                  <Group spacing="xs" mt="xs">
                    <IconClock size={14} />
                    <Text size="sm" color="dimmed">
                      Efort estimat: {effortEstimate.hours}h (
                      {effortEstimate.complexity})
                    </Text>
                  </Group>
                )}

                <Text size="xs" color="dimmed" mt="xs">
                  {formatDate(review.timestamp)}
                </Text>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Stack>
    </Paper>
  );
};

export default ReviewHistory;

