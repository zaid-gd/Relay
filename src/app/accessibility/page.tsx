import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Accessibility | Relay",
  description:
    "Relay's accessibility goals, supported features, known limitations, and feedback contact.",
  alternates: {
    canonical: "/accessibility",
  },
};

export default function AccessibilityRoute() {
  return (
    <LegalPage
      title="Accessibility Statement"
      updatedAt="July 22, 2026"
      intro="Relay is working toward an inclusive editing workspace that can be used with a keyboard, assistive technology, zoom, and reduced motion settings."
      sections={[
        {
          title: "Our Target",
          body: (
            <p>
              We aim to support the Web Content Accessibility Guidelines (WCAG)
              2.2 Level AA where practical. This is a target and an ongoing
              effort, not a claim that every screen currently conforms.
            </p>
          ),
        },
        {
          title: "Current Support",
          body: (
            <p>
              The app includes semantic page regions, a skip link, visible
              keyboard focus, keyboard-accessible controls, responsive layouts,
              text alternatives for meaningful images, reduced motion handling,
              and light and dark themes.
            </p>
          ),
        },
        {
          title: "Known Limitations",
          body: (
            <p>
              Dense project tables, third-party sign-in dialogs, charts, and
              some legacy controls may need further testing with screen readers
              and high zoom. We are continuing to review contrast, labels,
              target sizes, and focus order across these surfaces.
            </p>
          ),
        },
        {
          title: "Accessibility Feedback",
          body: (
            <p>
              If a barrier prevents you from using Relay, use the{" "}
              <a href="/contact">contact page</a> and include the page, browser,
              assistive technology, and problem you encountered.
            </p>
          ),
        },
      ]}
    />
  );
}
