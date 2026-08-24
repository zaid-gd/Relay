import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Relay",
  description: "The terms that apply when using Relay.",
  alternates: {
    canonical: "/terms"
  }
};

export default function TermsRoute() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt="June 1, 2026"
      intro="These Terms of Service govern your access to and use of Relay, a local-first work tracker for video editors with optional account-backed sync."
      sections={[
        {
          title: "Acceptance",
          body: (
            <p>By accessing or using Relay, you agree to these Terms and the Privacy Policy. If you use the service for a business, studio, team, or client workflow, you represent that you have authority to accept these Terms for that organization or workflow.</p>
          )
        },
        {
          title: "Eligibility",
          body: (
            <p>You must be able to form a binding agreement to use Relay. The service is not intended for children under 13, or under 16 where that higher age applies. If you are using the service under the age of majority in your location, you must have permission from a parent or legal guardian.</p>
          )
        },
        {
          title: "Accounts And Security",
          body: (
            <p>Relay can be used locally without an account. Account-backed features may require Clerk authentication and Convex sync. You are responsible for keeping your sign-in method secure, maintaining accurate account information, and notifying us if you believe your account or workspace has been accessed without permission.</p>
          )
        },
        {
          title: "Your Workspace Data",
          body: (
            <p>You keep ownership of the project, client, profile, team, notes, earnings, workflow, and configuration information you enter into Relay. You grant us the limited right to host, store, process, display, and transmit that information only as needed to provide, secure, maintain, and improve the service.</p>
          )
        },
        {
          title: "Local Mode",
          body: (
            <p>In local mode, data is stored in browser storage on your device. You are responsible for preserving local data, maintaining backups where needed, and understanding that clearing browser storage, changing devices, or using a different browser may make local data unavailable.</p>
          )
        },
        {
          title: "Acceptable Use",
          body: (
            <p>You may not misuse the service, attempt to bypass security, interfere with app infrastructure, reverse engineer restricted portions of the service, upload malicious code, violate another person's rights, store unlawful content, or use Relay to support illegal, abusive, or deceptive activity.</p>
          )
        },
        {
          title: "Client And Team Information",
          body: (
            <p>You are responsible for the information you enter about clients, team members, collaborators, and projects. Do not enter confidential, regulated, or highly sensitive information unless you have permission and the information is necessary for the workflow.</p>
          )
        },
        {
          title: "Integrations And Third-Party Services",
          body: (
            <p>Relay may include configuration fields or flows for third-party tools such as Google Drive, Dropbox, Slack, Frame.io, Clerk, and Convex. Third-party services are governed by their own terms and policies. We are not responsible for third-party services, outages, permissions, data handling, or changes.</p>
          )
        },
        {
          title: "No Professional Advice",
          body: (
            <p>Relay may show earnings, salary batch progress, delivery status, and reports, but those outputs are for workflow tracking only. The service does not provide legal, tax, accounting, payroll, employment, or financial advice.</p>
          )
        },
        {
          title: "Service Changes",
          body: (
            <p>We may add, change, limit, suspend, or discontinue features. We may also update these Terms when the product, law, or business needs change. Continued use after an update means you accept the revised Terms.</p>
          )
        },
        {
          title: "Intellectual Property",
          body: (
            <p>Relay, including its design, code, branding, documentation, and product structure, is owned by Relay or its licensors. These Terms do not grant you ownership of the service or permission to copy, resell, or create a competing service from protected parts of Relay.</p>
          )
        },
        {
          title: "Disclaimer",
          body: (
            <p>The service is provided as is and as available. To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted availability, error-free operation, and data preservation.</p>
          )
        },
        {
          title: "Limitation Of Liability",
          body: (
            <p>To the fullest extent permitted by law, Relay will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, business interruption, or replacement services. Our total liability for claims related to the service will not exceed the amount you paid to use Relay in the three months before the claim, or USD 100 if you paid nothing.</p>
          )
        },
        {
          title: "Termination",
          body: (
            <p>You may stop using Relay at any time. We may suspend or terminate access if you violate these Terms, create risk for the service or other users, or if we are required to do so by law. Sections that by their nature should survive termination will continue to apply.</p>
          )
        },
        {
          title: "Governing Rules And Contact",
          body: (
            <p>These Terms are governed by the laws applicable where Relay is operated, without limiting mandatory consumer protections that apply in your location. For reports, support requests, or questions about these Terms, contact Relay at Cutlab.Studios@gmail.com.</p>
          )
        }
      ]}
    />
  );
}
