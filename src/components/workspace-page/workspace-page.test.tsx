import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ContentSection,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "./index";

describe("workspace page primitives", () => {
  it("renders one semantic page heading and omits absent optional regions", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePage family="library">
        <PageHeader title="Projects" />
      </WorkspacePage>,
    );

    expect(markup).toContain("<h1");
    expect(markup).toContain(">Projects</h1>");
    expect(markup).not.toContain("page-header-actions");
  });

  it("renders supplied header actions, toolbar regions, metrics, and a flush section", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePage family="data-index">
        <PageHeader
          eyebrow="Workspace"
          title="Reports"
          description="Delivery and earnings."
          actions={<button type="button">Export</button>}
        />
        <PageToolbar primary={<input aria-label="Search" />} secondary={<button type="button">Filter</button>} />
        <MetricStrip columns={2}>
          <MetricItem label="Delivered" value="12" />
          <MetricItem label="Earned" value="$400" />
        </MetricStrip>
        <ContentSection title="Ledger" bodyMode="flush">
          <p>Rows</p>
        </ContentSection>
      </WorkspacePage>,
    );

    expect(markup).toContain("page-header-actions");
    expect(markup).toContain('aria-label="Search"');
    expect(markup).toContain(">Delivered</dt>");
    expect(markup).toContain(">Ledger</h2>");
  });

  it("exposes family and content-mode contracts", () => {
    const markup = renderToStaticMarkup(
      <WorkspacePage family="conversation" mode="fill">
        <PageHeader title="Team chat" />
        <PageContent mode="fill">Messages</PageContent>
      </WorkspacePage>,
    );

    expect(markup).toContain('data-family="conversation"');
    expect(markup).toContain('data-design="studio-split"');
    expect(markup).toContain('data-slot="page-content"');
    expect(markup).toContain('data-mode="fill"');
  });

});
