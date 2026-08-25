import { describe, expect, it } from "vitest";

import { mergeClientRecords } from "./clients";

describe("client records", () => {
  it("migrates legacy names into stable records without duplicating existing clients", () => {
    const clients = mergeClientRecords(
      [{ id: "client-northline", name: "Northline Foods", company: "Northline", contactName: "", email: "", phone: "", notes: "", archived: false }],
      ["northline foods", "Morrow Studio"],
    );

    expect(clients).toHaveLength(2);
    expect(clients[0]).toMatchObject({ id: "client-northline", name: "Northline Foods", company: "Northline" });
    expect(clients[1]).toMatchObject({ id: "client-morrow-studio", name: "Morrow Studio", archived: false });
  });
});
