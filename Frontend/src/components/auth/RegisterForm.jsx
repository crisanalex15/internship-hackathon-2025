import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Grid,
  Container,
} from "@mantine/core";
import {
  IconUserPlus,
  IconBrandGoogle,
  IconBrandFacebook,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";

export const RegisterForm = () => {
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

    // Validare
    if (
      !formData.email ||
      !formData.password ||
      !formData.firstName ||
      !formData.lastName
    ) {
      setError("Te rog completează toate câmpurile");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere");
      setIsLoading(false);
      return;
    }

    const result = await register(formData);

    if (result.success) {
      navigate("/verify-email", {
        state: {
          email: formData.email,
          message:
            "Contul a fost creat cu succes! Te rog verifică-ți email-ul.",
        },
      });
    } else {
      if (result.errors) {
        setError(result.errors.join(", "));
      } else {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  return (
    <Container size={420} my={40}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="md">
          Înregistrare
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Creează-ți un cont nou pentru a continua
        </Text>

        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Prenume"
                placeholder="Prenumele tău"
                required
                value={formData.firstName}
                onChange={handleChange("firstName")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Nume"
                placeholder="Numele tău"
                required
                value={formData.lastName}
                onChange={handleChange("lastName")}
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Email"
            placeholder="email@example.com"
            required
            value={formData.email}
            onChange={handleChange("email")}
            mt="md"
            type="email"
          />

          <PasswordInput
            label="Parolă"
            placeholder="Parola ta"
            required
            value={formData.password}
            onChange={handleChange("password")}
            mt="md"
            description="Parola trebuie să aibă cel puțin 6 caractere"
          />

          <Button
            type="submit"
            fullWidth
            leftSection={<IconUserPlus size={16} />}
            loading={isLoading}
            mt="xl"
            mb="xl"
          >
            Înregistrare
          </Button>

          {/* Separator */}
          <Group justify="center" mb="xl">
            <Text size="sm" c="dimmed">
              sau înregistrează-te cu
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

          <Group justify="center" mt="xl">
            <Text size="sm">
              Ai deja cont?{" "}
              <Anchor component={Link} to="/login" size="sm">
                Autentifică-te
              </Anchor>
            </Text>
          </Group>
        </form>
      </Paper>
    </Container>
  );
};
