import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  TextInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Group,
  Anchor,
  Code,
} from "@mantine/core";
import { IconMailCheck } from "@tabler/icons-react";
import { authApi } from "../../services/api";

export const VerifyEmailForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Mesaj din state (din register sau login)
  const message = location.state?.message;

  useEffect(() => {
    const email = location.state?.email;
    if (!email) {
      navigate("/register");
      return;
    }
    setUserEmail(email);
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!code || code.length !== 6) {
      setError("Te rog introdu codul de 6 cifre");
      setIsLoading(false);
      return;
    }

    try {
      await authApi.verifyEmail({
        email: userEmail,
        code: code,
      });

      navigate("/login", {
        state: {
          message: "Email verificat cu succes! Te poți loga acum.",
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Verificarea a eșuat. Te rog încearcă din nou."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper shadow="md" p="xl" radius="md" withBorder>
      <Title order={2} ta="center" mb="md">
        Verificare Email
      </Title>

      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Am trimis un cod de verificare la:
      </Text>

      <Code block ta="center" mb="xl">
        {userEmail}
      </Code>

      <form onSubmit={handleSubmit}>
        {message && (
          <Alert color="blue" mb="md">
            {message}
          </Alert>
        )}

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        <TextInput
          label="Cod de Verificare"
          placeholder="123456"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          mb="md"
          maxLength={6}
          description="Introdu codul de 6 cifre primit pe email"
        />

        <Button
          type="submit"
          fullWidth
          leftSection={<IconMailCheck size={16} />}
          loading={isLoading}
          mb="md"
        >
          Verifică Email
        </Button>

        <Group justify="center" mt="xl">
          <Text size="sm">
            Nu ai primit codul?{" "}
            <Anchor component={Link} to="/register" size="sm">
              Înregistrează-te din nou
            </Anchor>
          </Text>
        </Group>

        <Group justify="center" mt="sm">
          <Anchor component={Link} to="/login" size="sm">
            Înapoi la Login
          </Anchor>
        </Group>
      </form>
    </Paper>
  );
};
