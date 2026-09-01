import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Relay",
  description: "How Relay collects, uses, stores, and shares information.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyRoute() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="June 1, 2026"
      intro="This Privacy Policy explains how Relay handles information when you use the website and app. Relay is designed to be local-first, with optional account-backed sync when Clerk and Convex are enabled."
      sections={[
        {
          title: "Information We Collect",
          body: (
            <>
              <p>
                We collect the information needed to provide the tracker and
                keep your workspace usable. This may include project titles,
                client names, work type, status, dates, earnings, notes, salary
                batch details, profile settings, organization settings, team
                member names and emails, workflow stages, notification settings,
                theme settings, and integration configuration fields you choose
                to save.
              </p>
              <p>
                If you create or sign in to an account, Clerk may provide
                authentication information such as your user ID, name, email
                address, username, profile image, session data, and connected
                account details. If cloud sync is enabled, Convex stores synced
                workspace records associated with your authenticated user ID.
              </p>
              <p>
                We may also receive basic technical data from hosting, security,
                and app infrastructure, such as IP address, device and browser
                information, request logs, error information, and approximate
                usage events needed to operate and secure the service.
              </p>
            </>
          ),
        },
        {
          title: "Local-First Storage",
          body: (
            <p>
              Relay works in local mode without requiring an account. In local
              mode, your tracker data is stored in your browser storage on the
              device you use. Clearing browser storage, changing browsers, or
              using another device may remove or separate that local data. When
              you choose account-backed sync, selected workspace records are
              copied to Convex so they can be restored for the signed-in
              account.
            </p>
          ),
        },
        {
          title: "How We Use Information",
          body: (
            <p>
              We use information to run the app, save your workspace,
              authenticate users, sync data when enabled, personalize profile
              and organization pages, support integrations you configure,
              maintain security, diagnose errors, prevent abuse, and respond to
              support or privacy requests.
            </p>
          ),
        },
        {
          title: "Cookies And Similar Technologies",
          body: (
            <>
              <p>
                Relay uses browser storage for local workspace data and app
                preferences. Account mode may use cookies, local storage, or
                similar technologies from Clerk to keep you signed in and
                protect sessions. We do not use these technologies to sell
                personal information.
              </p>
            </>
          ),
        },
        {
          title: "How We Share Information",
          body: (
            <>
              <p>
                We do not sell your personal information. We share information
                only when needed to operate the service, comply with law,
                protect rights and security, or when you direct us to do so.
              </p>
              <p>
                Service providers may include Cloudflare for hosting, edge
                delivery, and security, Clerk for authentication, Convex for
                optional cloud sync, and any third-party integration providers
                you choose to connect or configure. Those providers process
                information under their own terms and privacy commitments.
              </p>
            </>
          ),
        },
        {
          title: "Integrations",
          body: (
            <p>
              The app includes settings for services such as Google Drive,
              Dropbox, Slack, and Frame.io. Saving an integration account name,
              folder, channel, workspace, or webhook URL stores the
              configuration in your workspace. Connecting an external service
              may cause that service to receive information according to its own
              privacy policy and account permissions.
            </p>
          ),
        },
        {
          title: "Retention And Deletion",
          body: (
            <p>
              Local mode data remains in your browser until you edit it, delete
              it, reset settings, or clear browser storage. Cloud-synced data
              remains until you delete it in the app, request deletion, or the
              account is removed according to our operational and legal needs.
              Backup, security, and audit copies may persist for a limited
              period where reasonably necessary.
            </p>
          ),
        },
        {
          title: "Your Choices And Rights",
          body: (
            <p>
              You can use Relay in local mode, update or delete project records,
              edit profile and organization settings, disconnect integrations,
              clear browser storage, or stop using account sync. Depending on
              where you live, you may have rights to access, correct, delete,
              export, restrict, object to, or appeal decisions about your
              personal information. California, other U.S. state, EEA, UK, and
              similar privacy rights can be exercised by contacting us.
            </p>
          ),
        },
        {
          title: "Children",
          body: (
            <p>
              Relay is not directed to children. We do not knowingly collect
              personal information from children under 13, or under 16 where
              that higher age applies. If you believe a child provided personal
              information, contact us so we can review and delete it where
              required.
            </p>
          ),
        },
        {
          title: "Security",
          body: (
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards for the service. No online service or local device
              storage is completely secure, so you should keep your account
              credentials safe, use trusted devices, and avoid entering
              sensitive client material that is not needed for tracking work.
            </p>
          ),
        },
        {
          title: "International Use",
          body: (
            <p>
              Relay and its providers may process information in the United
              States or other countries where infrastructure and support
              providers operate. Those countries may have data protection laws
              that differ from your location.
            </p>
          ),
        },
        {
          title: "Changes And Contact",
          body: (
            <p>
              We may update this Privacy Policy as the product or legal
              requirements change. The updated date shows when it was last
              revised. For privacy requests, reports, or questions, use the{" "}
              <a href="/contact">Relay contact page</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
