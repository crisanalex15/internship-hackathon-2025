import { Transition } from "@mantine/core";
import "./ViewTransition.css";

const ViewTransition = ({ children, mounted = true, view }) => {
  return (
    <Transition
      mounted={mounted}
      transition={{
        in: { opacity: 1, transform: "translateY(0)" },
        out: { opacity: 0, transform: "translateY(20px)" },
        transitionProperty: "opacity, transform",
      }}
      duration={400}
      timingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
    >
      {(styles) => (
        <div className="view-transition-wrapper" style={styles} data-view={view}>
          {children}
        </div>
      )}
    </Transition>
  );
};

export default ViewTransition;

