import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Group,
  Anchor,
  Container,
} from "@mantine/core";
import {
  IconLogin,
  IconBrandGoogle,
  IconBrandFacebook,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import sessionLogger from "../../services/sessionLogger";

export const LoginForm = () => {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Mesaj de succes din reset password
  const successMessage = location.state?.message;

  // Log page visit
  useEffect(() => {
    sessionLogger.logPageVisit("login_form");
  }, []);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Te rog completează toate câmpurile");
      setIsLoading(false);
      return;
    }

    const result = await login(formData);

    if (result.success) {
      navigate("/profile");
    } else {
      if (result.error === "Email not verified, please verify your email") {
        navigate("/verify-email", {
          state: {
            email: formData.email,
            message: "Email-ul nu este verificat. Te rog verifică-ți email-ul.",
          },
        });
      } else {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  return (
    <Container size={420} my={40}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title ta="center" fw={900} mb="md">
          Autentificare
        </Title>

        <Text c="dimmed" size="sm" ta="center" mt={5} mb="xl">
          Bun venit înapoi! Te rog introdu datele tale.
        </Text>

        <form onSubmit={handleSubmit}>
          {successMessage && (
            <Alert color="green" mb="md">
              {successMessage}
            </Alert>
          )}

          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <TextInput
            label="Email"
            placeholder="email@example.com"
            required
            value={formData.email}
            onChange={handleChange("email")}
            mb="md"
            type="email"
          />

          <PasswordInput
            label="Parolă"
            placeholder="Parola ta"
            required
            value={formData.password}
            onChange={handleChange("password")}
            mb="md"
          />

          <Group justify="space-between" mb="xl">
            <div></div>
            <Anchor component={Link} to="/forgot-password" size="sm">
              Ai uitat parola?
            </Anchor>
          </Group>

          <Button
            type="submit"
            fullWidth
            leftSection={<IconLogin size={16} />}
            loading={isLoading}
            mb="xl"
          >
            Autentificare
          </Button>

          {/* Separator */}
          <Group justify="center" mb="xl">
            <Text size="sm" c="dimmed">
              sau continuă cu
            </Text>
          </Group>

          {/* Social Auth Buttons */}
          <Group grow mb="xl">
            <Button
              leftSection={<IconBrandGoogle size={18} />}
              variant="outline"
              onClick={loginWithGoogle}
              style={{
                borderColor: "#4285f4",
                color: "#4285f4",
              }}
            >
              Google
            </Button>
            <Button
              leftSection={<IconBrandFacebook size={18} />}
              variant="outline"
              onClick={loginWithFacebook}
              style={{
                borderColor: "#1877f2",
                color: "#1877f2",
              }}
            >
              Facebook
            </Button>
          </Group>

          <Text c="dimmed" size="sm" ta="center" mt="xl">
            Nu ai cont?{" "}
            <Anchor component={Link} to="/register" size="sm">
              Înregistrează-te
            </Anchor>
          </Text>
        </form>
      </Paper>
    </Container>
  );
};
