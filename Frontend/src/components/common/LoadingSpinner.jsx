import { Loader, Center, Text } from "@mantine/core";

export const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <Center style={{ height: "200px", flexDirection: "column" }}>
      <Loader size="lg" />
      <Text mt="md" color="dimmed">
        {message}
      </Text>
    </Center>
  );
};
