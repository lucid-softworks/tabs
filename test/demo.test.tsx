import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../demo/src/app.js";

describe("tabs demo", () => {
  it("demonstrates preserved and active-only panel mounting", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: /Activity/u }));
    const note = screen.getByRole("textbox", { name: "Private note" });
    fireEvent.change(note, { target: { value: "Remember this" } });
    fireEvent.click(screen.getByRole("tab", { name: /Overview/u }));
    fireEvent.click(screen.getByRole("tab", { name: /Activity/u }));
    expect(screen.getByDisplayValue("Remember this")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Active only"));
    expect(
      screen.getByText(
        "Only the active panel is mounted; inactive state is discarded.",
      ),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: /Members/u }));
    expect(screen.getByText("Luna Morgan")).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: /Activity/u }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Private note",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    fireEvent.click(screen.getByLabelText("Preserve all"));
    expect(
      screen.getByText("Hidden panels stay mounted, preserving local state."),
    ).toBeDefined();
  });
});
