import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Textarea,
  Stack,
  Text,
  Group,
  Badge,
  Alert,
  Tabs,
  Code,
  ScrollArea,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconDeviceFloppy,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import './CustomRulesModal.css';

const STORAGE_KEY = 'ai_review_custom_rules';

const DEFAULT_EXAMPLES = `Exemple de reguli personalizate:

1. Pentru proiecte Java:
- Verifică ca toate clasele să aibă comentarii JavaDoc
- Asigură-te că metodele publice au @param și @return tags
- Flag orice uso de System.out.println() pentru logging

2. Pentru proiecte web:
- Verifică că toate endpointurile au validare de input
- Asigură-te că parolele sunt hash-uite cu bcrypt
- Flag orice hardcoded URLs sau credentials

3. Pentru performanță:
- Detectează loop-uri nested care pot fi optimizate
- Verifică dacă se folosesc cache-uri unde e necesar
- Flag orice query N+1 în baze de date

4. Pentru cod specific organizației:
- Verifică naming conventions specifice (ex: camelCase pentru variabile)
- Asigură-te că se respectă arhitectura proiectului
- Flag orice cod duplicat peste 5 linii`;

const CustomRulesModal = ({ opened, onClose }) => {
  const [customRules, setCustomRules] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');

  // Load saved rules on mount
  useEffect(() => {
    const savedRules = localStorage.getItem(STORAGE_KEY);
    if (savedRules) {
      setCustomRules(savedRules);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, customRules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setCustomRules('');
    localStorage.removeItem(STORAGE_KEY);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      styles={{
        overlay: {
          zIndex: 199,
        },
        root: {
          zIndex: 200,
        },
        inner: {
          zIndex: 200,
        },
      }}
      title={
        <Group spacing="xs">
          <IconSparkles size={20} color="var(--accent-color)" />
          <Text weight={600} size="lg">
            Reguli Personalizate pentru AI Review
          </Text>
        </Group>
      }
      size="xl"
      className="custom-rules-modal"
    >
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="rules">Regulile Tale</Tabs.Tab>
          <Tabs.Tab value="examples">Exemple</Tabs.Tab>
          <Tabs.Tab value="info">Info</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="rules" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              Aceste reguli vor fi adăugate la regulile default ale AI-ului.
              Folosește-le pentru a specifica cerințe specifice proiectului tău.
            </Alert>

            <Textarea
              placeholder="Scrie regulile tale personalizate aici...

Exemple:
- Verifică că toate variabilele sunt în camelCase
- Asigură-te că metodele au comentarii JavaDoc
- Flag orice hardcoded passwords
- Verifică că se folosește async/await pentru operații I/O
- etc."
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              minRows={15}
              maxRows={20}
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: '13px',
                },
              }}
            />

            <Group position="apart">
              <Group spacing="xs">
                <Badge color="blue" variant="light">
                  {customRules.length} caractere
                </Badge>
                {customRules.trim() && (
                  <Badge color="green" variant="light">
                    Reguli active
                  </Badge>
                )}
              </Group>

              <Group spacing="xs">
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleReset}
                  disabled={!customRules.trim()}
                >
                  Resetează
                </Button>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={handleSave}
                  color={saved ? 'green' : 'blue'}
                >
                  {saved ? 'Salvat!' : 'Salvează'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="examples" pt="md">
          <ScrollArea h={400}>
            <Stack spacing="md">
              <Text size="sm" color="dimmed">
                Iată câteva exemple de reguli personalizate pe care le poți folosi:
              </Text>
              <Code block>{DEFAULT_EXAMPLES}</Code>
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="info" pt="md">
          <Stack spacing="md">
            <div>
              <Text weight={600} mb="xs">
                Cum funcționează?
              </Text>
              <Text size="sm" color="dimmed">
                Regulile tale personalizate sunt concatenate cu regulile default ale AI-ului.
                Acestea vor fi luate în considerare la fiecare review de cod pe care îl faci.
              </Text>
            </div>

            <div>
              <Text weight={600} mb="xs">
                Sfaturi pentru reguli eficiente:
              </Text>
              <Stack spacing={4}>
                <Text size="sm" color="dimmed">
                  • Fii specific - descrie exact ce vrei să verifice AI-ul
                </Text>
                <Text size="sm" color="dimmed">
                  • Folosește bullet points pentru claritate
                </Text>
                <Text size="sm" color="dimmed">
                  • Menționează severity-ul (critical, high, medium, low)
                </Text>
                <Text size="sm" color="dimmed">
                  • Dă exemple concrete de ce să caute AI-ul
                </Text>
              </Stack>
            </div>

            <div>
              <Text weight={600} mb="xs">
                Exemple de reguli bune:
              </Text>
              <Code block>
                {`✅ "Verifică că toate metodele publice au comentarii JavaDoc cu @param și @return"
✅ "Flag orice hardcoded database credentials - severity: critical"
✅ "Asigură-te că se folosește PreparedStatement în loc de Statement pentru queries"

❌ "Verifică codul"  (prea vag)
❌ "Fă-l mai bun"   (nespecific)`}
              </Code>
            </div>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};

export default CustomRulesModal;

