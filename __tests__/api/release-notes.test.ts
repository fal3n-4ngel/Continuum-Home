import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getLatestReleaseNote } from "@/app/api/(core)/release-notes/latest/route";
import {
  GET as adminGetReleaseNotes,
  POST as adminPostReleaseNotes,
  DELETE as adminDeleteReleaseNotes,
} from "@/app/api/(ops)/admin/release-notes/route";
import { POST as adminGenerateReleaseNotes } from "@/app/api/(ops)/admin/release-notes/generate/route";
import * as firebaseAdmin from "@/lib/firebase/firebase-admin";
import * as groqIntegration from "@/lib/integrations/groq";

describe("Release Notes API Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
  });

  describe("GET /api/release-notes/latest", () => {
    it("returns null when no release note is active", async () => {
      vi.spyOn(firebaseAdmin, "adminGetLatestReleaseNote").mockResolvedValueOnce(null);

      const res = await getLatestReleaseNote();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.releaseNote).toBeNull();
    });

    it("returns active release note when available", async () => {
      const mockNote = {
        id: "rel_v1_3_0_12345",
        version: "v1.3.0",
        title: "Historical Analytics",
        content: "### What is new\n- Features",
        publishedAt: 1773200000000,
        active: true,
      };
      vi.spyOn(firebaseAdmin, "adminGetLatestReleaseNote").mockResolvedValueOnce(mockNote);

      const res = await getLatestReleaseNote();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.releaseNote).toEqual(mockNote);
    });
  });

  describe("Admin /api/admin/release-notes endpoints", () => {
    it("rejects POST with missing version, title, or content", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/release-notes", {
        method: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({ version: "v1.0.0", title: "" }),
      });

      const res = await adminPostReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Missing or invalid");
    });

    it("publishes release note successfully when valid payload is provided", async () => {
      const saveSpy = vi.spyOn(firebaseAdmin, "adminSaveReleaseNote").mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/admin/release-notes", {
        method: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          version: "v1.3.0",
          title: "Privacy Controls & History",
          content: "- Better charts\n- Offline math",
        }),
      });

      const res = await adminPostReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.releaseNote.version).toBe("v1.3.0");
      expect(data.releaseNote.title).toBe("Privacy Controls & History");
      expect(data.releaseNote.active).toBe(true);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it("retrieves active note via admin GET endpoint", async () => {
      const mockNote = {
        id: "rel_active",
        version: "v1.3.0",
        title: "Active",
        content: "Content",
        publishedAt: 12345,
        active: true,
      };
      vi.spyOn(firebaseAdmin, "adminGetLatestReleaseNote").mockResolvedValueOnce(mockNote);

      const req = new NextRequest("http://localhost:3000/api/admin/release-notes", {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
      });

      const res = await adminGetReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.releaseNote).toEqual(mockNote);
    });

    it("deactivates active note via admin DELETE endpoint", async () => {
      const deactSpy = vi.spyOn(firebaseAdmin, "adminDeactivateReleaseNote").mockResolvedValueOnce(undefined);

      const req = new NextRequest("http://localhost:3000/api/admin/release-notes", {
        method: "DELETE",
        headers: { Authorization: "Bearer valid-token" },
      });

      const res = await adminDeleteReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deactSpy).toHaveBeenCalledTimes(1);
    });

    it("generates user-friendly release notes with AI from git commits", async () => {
      const groqSpy = vi.spyOn(groqIntegration, "executeGroqJson").mockResolvedValueOnce({
        version: "v1.2.1",
        title: "Historical Spend Evolution & Calm Polish",
        content: "### What's New\n- **Historical Spend Analytics**: Deep-dive historical spend evolution.\n\n### Improvements\n- **Zero Comment Rule**: Verified across codebase.",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/release-notes/generate", {
        method: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({
          version: "v1.2.1",
          commits: [
            "8ad30fc feat: ux improvements and folder restructure",
            "d4cad9c fix: theme issues and unwanted audit events",
            "0b044b6 fix: custom filter not applying filters based on payday",
          ],
        }),
      });

      const res = await adminGenerateReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.version).toBe("v1.2.1");
      expect(data.title).toBe("Historical Spend Evolution & Calm Polish");
      expect(data.content).toContain("### What's New");
      expect(data.commitCount).toBe(3);
      expect(groqSpy).toHaveBeenCalledTimes(1);
    });

    it("generates release notes for latest release without custom commits payload", async () => {
      const groqSpy = vi.spyOn(groqIntegration, "executeGroqJson").mockResolvedValueOnce({
        version: "v1.2.1",
        title: "Release v1.2.1",
        content: "### What's New\n- **Audit Logs**: Clearer audit logs.\n\n### Fixes\n- **Timeouts**: Fixed timeout alerts.",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/release-notes/generate", {
        method: "POST",
        headers: { Authorization: "Bearer valid-token" },
        body: JSON.stringify({}),
      });

      const res = await adminGenerateReleaseNotes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.version).toBe("v1.2.1");
      expect(data.title).toBe("Release v1.2.1");
      expect(data.content).toContain("### What's New");
      expect(groqSpy).toHaveBeenCalledTimes(1);
    });
  });
});

