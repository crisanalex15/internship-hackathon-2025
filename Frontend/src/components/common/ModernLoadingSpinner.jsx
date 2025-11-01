import { Box, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import "./ModernLoadingSpinner.css";

export const ModernLoadingSpinner = ({ message = "Se încarcă..." }) => {
  return (
    <div className="modern-loading-container">
      <div className="loading-content">
        <div className="loading-icon-wrapper">
          <IconSparkles size={48} className="loading-icon" />
          <div className="loading-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>
        <Text size="lg" weight={500} className="loading-text">
          {message}
        </Text>
        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default ModernLoadingSpinner;

