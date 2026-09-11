import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReleaseNotesModal } from "@/components/modals";

describe("ReleaseNotesModal Component Tests", () => {
  const sampleNote = {
    id: "rel_v1_3_0",
    version: "v1.3.0",
    title: "Historical Spend & In-App Release Notes",
    content: "### Highlights\n- Deep dive into historical cycle spend.\n- **Privacy**: Full deterministic computations.\n- Mobile improvements.",
    publishedAt: 1773200000000,
    active: true,
  };

  it("does not render when isOpen is false", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ReleaseNotesModal isOpen={false} onClose={onClose} releaseNote={sampleNote} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render when releaseNote is null", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ReleaseNotesModal isOpen={true} onClose={onClose} releaseNote={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders release note details and formatted content", () => {
    const onClose = vi.fn();
    render(
      <ReleaseNotesModal isOpen={true} onClose={onClose} releaseNote={sampleNote} />
    );

    expect(screen.getByText("v1.3.0")).toBeInTheDocument();
    expect(screen.getByText("Historical Spend & In-App Release Notes")).toBeInTheDocument();
    expect(screen.getByText("Highlights")).toBeInTheDocument();
    expect(screen.getByText("Deep dive into historical cycle spend.")).toBeInTheDocument();
    expect(screen.getByText("Privacy:")).toBeInTheDocument();
    expect(screen.getByText("Got It, Explore Now")).toBeInTheDocument();
  });

  it("triggers onClose when primary button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ReleaseNotesModal isOpen={true} onClose={onClose} releaseNote={sampleNote} />
    );

    const button = screen.getByText("Got It, Explore Now");
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ReleaseNotesModal isOpen={true} onClose={onClose} releaseNote={sampleNote} />
    );

    const closeBtn = screen.getByLabelText("Close release notes");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <ReleaseNotesModal isOpen={true} onClose={onClose} releaseNote={sampleNote} />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
