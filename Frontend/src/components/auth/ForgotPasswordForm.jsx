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
  Container,
  Stepper,
} from "@mantine/core";
import { authApi } from "../../services/api";

export const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = email, 1 = code + password
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.email) {
      setError("Te rog introdu adresa de email");
      setIsLoading(false);
      return;
    }

    try {
      await authApi.forgotPassword({ email: formData.email });
      setStep(1); // Treci la pasul 2
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "A apărut o eroare. Te rog încearcă din nou."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.code || !formData.newPassword || !formData.confirmPassword) {
      setError("Te rog completează toate câmpurile");
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Parolele nu se potrivesc");
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere");
      setIsLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
      });

      navigate("/login", {
        state: {
          message: "Parola a fost resetată cu succes. Te poți loga acum.",
        },
      });
    } catch (err) {
      if (err.response?.status === 402) {
        setError("Codul de resetare a expirat. Te rog solicită un cod nou.");
      } else {
        setError(
          err.response?.data?.message ||
            "A apărut o eroare. Te rog încearcă din nou."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title ta="center" fw={900} mb="md">
          Resetare Parolă
        </Title>

        <Stepper active={step} size="sm" mb="xl">
          <Stepper.Step label="Email" description="Introdu email-ul" />
          <Stepper.Step label="Cod & Parolă" description="Resetează parola" />
        </Stepper>

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        {step === 0 && (
          <form onSubmit={handleEmailSubmit}>
            <Text c="dimmed" size="sm" ta="center" mb="xl">
              Introdu adresa de email pentru a primi codul de resetare
            </Text>

            <TextInput
              label="Email"
              placeholder="email@example.com"
              required
              value={formData.email}
              onChange={handleChange("email")}
              mb="md"
              type="email"
            />

            <Button type="submit" fullWidth loading={isLoading} mb="md">
              Trimite Cod de Resetare
            </Button>

            <Text c="dimmed" size="sm" ta="center" mt="xl">
              <Anchor component={Link} to="/login" size="sm">
                Înapoi la Login
              </Anchor>
            </Text>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleResetSubmit}>
            <Text c="dimmed" size="sm" ta="center" mb="xl">
              Am trimis un cod la <strong>{formData.email}</strong>. Introdu
              codul și noua parolă.
            </Text>

            <TextInput
              label="Cod de Resetare"
              placeholder="Introdu codul de 6 cifre"
              required
              value={formData.code}
              onChange={handleChange("code")}
              mb="md"
              maxLength={6}
            />

            <PasswordInput
              label="Parolă Nouă"
              placeholder="Parola nouă"
              required
              value={formData.newPassword}
              onChange={handleChange("newPassword")}
              mb="md"
            />

            <PasswordInput
              label="Confirmă Parola"
              placeholder="Confirmă parola nouă"
              required
              value={formData.confirmPassword}
              onChange={handleChange("confirmPassword")}
              mb="md"
            />

            <Button type="submit" fullWidth loading={isLoading} mb="md">
              Resetează Parola
            </Button>

            <Group justify="center" mt="xl">
              <Anchor
                onClick={() => setStep(0)}
                size="sm"
                style={{ cursor: "pointer" }}
              >
                Înapoi la Email
              </Anchor>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Anchor component={Link} to="/login" size="sm">
                Înapoi la Login
              </Anchor>
            </Group>
          </form>
        )}
      </Paper>
    </Container>
  );
};
