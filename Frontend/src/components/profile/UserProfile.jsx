import {
  Paper,
  Text,
  Button,
  Stack,
  Group,
  Badge,
  Avatar,
  Title,
  Divider,
  Grid,
  Card,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconUser,
  IconMail,
  IconShieldCheck,
  IconCalendar,
  IconLogout,
  IconEdit,
  IconKey,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sessionLogger from "../../services/sessionLogger";

export const UserProfile = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Page visit logging
  useEffect(() => {
    sessionLogger.logPageVisit("user_profile", { userId: user?.id });
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner message="Se încarcă profilul..." />;
  }

  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return first || last
      ? `${first}${last}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() || "U";
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const getDisplayValue = (value, fallback = "Nu este specificat") => {
    return value && value.trim() !== "" ? value : fallback;
  };

  return (
    <Stack spacing="xl">
      {/* Header cu avatar și informații de bază */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Group align="center" mb="xl">
          <Avatar
            size={80}
            radius="xl"
            color="blue"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            {getInitials(user?.firstName, user?.lastName)}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Title order={2}>
              {getDisplayValue(
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                user?.email || "Utilizator"
              )}
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              {user?.email}
            </Text>
            <Group mt="xs" gap="xs">
              {user?.isEmailVerified ? (
                <Badge
                  color="green"
                  variant="light"
                  leftSection={<IconShieldCheck size={12} />}
                >
                  Email Verificat
                </Badge>
              ) : (
                <Badge color="orange" variant="light">
                  Email Neverificat
                </Badge>
              )}
              {user?.emailConfirmed && (
                <Badge color="blue" variant="light">
                  Cont Confirmat
                </Badge>
              )}
            </Group>
          </div>
        </Group>

        <Group justify="flex-end">
          <Tooltip label="Resetează parola">
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => {
                logout();
                navigate("/forgot-password");
              }}
            >
              <IconKey size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Editează profilul">
            <ActionIcon variant="light" size="lg">
              <IconEdit size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>

      {/* Detalii profil */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="md">
              <IconUser size={20} />
              <Text fw={500}>Informații Personale</Text>
            </Group>
            <Stack spacing="sm">
              {user?.firstName && (
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Prenume:
                  </Text>
                  <Text>{user.firstName}</Text>
                </Group>
              )}
              {user?.lastName && (
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Nume:
                  </Text>
                  <Text>{user.lastName}</Text>
                </Group>
              )}
              {user?.userName && (
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Nume utilizator:
                  </Text>
                  <Text>{user.userName}</Text>
                </Group>
              )}
              {user?.phoneNumber && (
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Telefon:
                  </Text>
                  <Text>{user.phoneNumber}</Text>
                </Group>
              )}
              {!user?.firstName &&
                !user?.lastName &&
                !user?.userName &&
                !user?.phoneNumber && (
                  <Text c="dimmed" size="sm" ta="center">
                    Informațiile personale nu sunt completate
                  </Text>
                )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="md">
              <IconMail size={20} />
              <Text fw={500}>Informații Cont</Text>
            </Group>
            <Stack spacing="sm">
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Email:
                </Text>
                <Text>{user?.email}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  ID Utilizator:
                </Text>
                <Text size="xs" c="dimmed">
                  {user?.id}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Email confirmat:
                </Text>
                <Badge
                  color={user?.emailConfirmed ? "green" : "orange"}
                  variant="light"
                  size="sm"
                >
                  {user?.emailConfirmed ? "Da" : "Nu"}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Email verificat:
                </Text>
                <Badge
                  color={user?.isEmailVerified ? "green" : "orange"}
                  variant="light"
                  size="sm"
                >
                  {user?.isEmailVerified ? "Da" : "Nu"}
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Informații temporale */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group mb="md">
          <IconCalendar size={20} />
          <Text fw={500}>Activitate Cont</Text>
        </Group>
        <Grid>
          {user?.emailVerifiedAt && formatDate(user.emailVerifiedAt) && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Text c="dimmed" size="sm">
                Data verificării email:
              </Text>
              <Text size="sm">{formatDate(user.emailVerifiedAt)}</Text>
            </Grid.Col>
          )}
          {user?.lastModifiedAt && formatDate(user.lastModifiedAt) && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Text c="dimmed" size="sm">
                Ultima modificare:
              </Text>
              <Text size="sm">{formatDate(user.lastModifiedAt)}</Text>
            </Grid.Col>
          )}
          {user?.createdAt && formatDate(user.createdAt) && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Text c="dimmed" size="sm">
                Cont creat la:
              </Text>
              <Text size="sm">{formatDate(user.createdAt)}</Text>
            </Grid.Col>
          )}
          {user?.lockoutEnd && formatDate(user.lockoutEnd) && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Text c="dimmed" size="sm">
                Blocare până la:
              </Text>
              <Text size="sm" c="red">
                {formatDate(user.lockoutEnd)}
              </Text>
            </Grid.Col>
          )}
          {!user?.emailVerifiedAt &&
            !user?.lastModifiedAt &&
            !user?.createdAt &&
            !user?.lockoutEnd && (
              <Grid.Col span={12}>
                <Text c="dimmed" size="sm" ta="center">
                  Informații despre activitatea contului nu sunt disponibile
                </Text>
              </Grid.Col>
            )}
        </Grid>
      </Card>

      {/* Acțiuni */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="center">
          <Button
            leftSection={<IconLogout size={16} />}
            color="red"
            variant="light"
            onClick={logout}
            size="md"
          >
            Deconectare
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
};
