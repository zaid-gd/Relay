import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { siteUrl } from "@/lib/site";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = {
  title: "Contact | Relay",
  description:
    "Contact Relay for product support, account help, privacy requests, or business inquiries.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactRoute() {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Relay",
    url: `${siteUrl}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "Relay",
      email: "zns.studios@gmail.com",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactSchema).replace(/</g, "\\u003c"),
        }}
      />
      <LegalPage
        title="Contact Relay"
        updatedAt="July 22, 2026"
        intro="Get help with the product, your account, privacy requests, or a business inquiry. We review the messages & try to reply under 24 hours."
        sections={[
          {
            title: "Email",
            body: (
              <p>
                Email us directly at{" "}
                <a href="mailto:zns.studios@gmail.com">zns.studios@gmail.com</a>
                .
              </p>
            ),
          },
          {
            title: "Send A Message",
            body: <ContactForm />,
          },
          {
            title: "Response Expectations",
            body: (
              <p>
                Include the page or feature involved, what you expected, and
                what happened. Please do not send passwords, API keys, private
                client files, or payment details.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
