import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { withAdmin } from "@/lib/utils/route-handlers";
import { executeGroqJson } from "@/lib/integrations/groq";

export const dynamic = "force-dynamic";

interface ReleaseSourceData {
  tag: string;
  name: string;
  changelog: string;
  source: string;
  commitCount: number;
}

async function fetchGitHubRelease(targetTag?: string): Promise<ReleaseSourceData | null> {
  const isSpecific = targetTag && targetTag !== "latest" && targetTag !== "auto" && targetTag !== "upcoming";
  const url = isSpecific
    ? `https://api.github.com/repos/fal3n-4ngel/personal-dashboard/releases/tags/${encodeURIComponent(targetTag)}`
    : `https://api.github.com/repos/fal3n-4ngel/personal-dashboard/releases/latest`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Continuum-App" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.tag_name) {
        const body = (data.body || "").trim();
        const lines = body.split("\n").filter((l: string) => l.trim().startsWith("*") || l.trim().startsWith("-"));
        return {
          tag: data.tag_name,
          name: data.name || data.tag_name,
          changelog: body,
          source: `GitHub Release ${data.tag_name}`,
          commitCount: lines.length || 1,
        };
      }
    }
  } catch {}
  return null;
}

function getGitTagRelease(targetTag?: string): ReleaseSourceData {
  let tag = targetTag && targetTag !== "latest" && targetTag !== "auto" && targetTag !== "upcoming" ? targetTag : "";
  if (!tag) {
    try {
      tag = execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
    } catch {
      tag = "v1.3.0";
    }
  }

  let prevTag = "";
  try {
    prevTag = execSync(`git describe --tags --abbrev=0 ${tag}^`, { encoding: "utf-8" }).trim();
  } catch {}

  const cmd = prevTag
    ? `git log ${prevTag}..${tag} --pretty=format:"%h - %s"`
    : `git log ${tag} -n 15 --pretty=format:"%h - %s"`;

  try {
    const raw = execSync(cmd, { encoding: "utf-8" });
    const commits = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      tag,
      name: `Release ${tag}`,
      changelog: commits.map((c) => `* ${c}`).join("\n"),
      source: `git ${prevTag ? `${prevTag}..${tag}` : tag}`,
      commitCount: commits.length,
    };
  } catch {
    return {
      tag,
      name: `Release ${tag}`,
      changelog: "",
      source: `git tag ${tag}`,
      commitCount: 0,
    };
  }
}

export const POST = withAdmin("POST /api/admin/release-notes/generate", async (req) => {
  const body = await req.json().catch(() => ({}));
  const manualCommits: string[] = Array.isArray(body.commits) ? body.commits : [];

  let releaseData: ReleaseSourceData;

  if (manualCommits.length > 0) {
    const customTag = typeof body.version === "string" && body.version.trim() ? body.version.trim() : "v1.3.0";
    releaseData = {
      tag: customTag,
      name: `Release ${customTag}`,
      changelog: manualCommits.join("\n"),
      source: "Manual commits payload",
      commitCount: manualCommits.length,
    };
  } else {
    const gh = await fetchGitHubRelease(body.version);
    if (gh && gh.changelog.length > 0) {
      releaseData = gh;
    } else {
      releaseData = getGitTagRelease(body.version);
    }
  }

  if (!releaseData.changelog && releaseData.commitCount === 0) {
    return NextResponse.json({
      error: `No changelog or git commits found for release ${releaseData.tag}.`,
    }, { status: 400 });
  }

  const prompt = `You are a product release engineer and technical copywriter for Continuum Home, a calm, privacy-first personal dashboard (expenses, investments, subscriptions, watchlist, health analytics).

Below is the release changelog for version ${releaseData.tag}:
${releaseData.changelog}

Analyze this release changelog and generate polished, user-facing in-app release notes for version ${releaseData.tag}.
CRITICAL INSTRUCTIONS:
1. The version tag MUST be exactly "${releaseData.tag}". DO NOT invent or increment this tag.
2. DO NOT simply copy-paste PR titles, raw URLs, or commit hashes.
3. Group related changes and extract ACTUAL user-facing features, UX enhancements, bug fixes, and performance improvements.
4. Ignore internal chores, documentation updates, or test adjustments unless they directly benefit the end user.
5. Format "content" in clean markdown with categorized bullet points using bold feature titles (e.g. "- **Feature Title**: Friendly, engaging explanation of what was added or improved.").
6. Return a concise, compelling release headline in "title" (e.g. "Pro Analytics, Enhanced Alerts & Account Controls").

Return ONLY a valid JSON object with:
{
  "version": "${releaseData.tag}",
  "title": "Concise User-Facing Release Headline",
  "content": "### What's New\\n- **Feature Name**: User-friendly description.\\n\\n### Improvements & Fixes\\n- **Fix Name**: Description of fix."
}`;

  try {
    const result = await executeGroqJson(prompt);
    if (!result || !result.title || !result.content) {
      throw new Error("Invalid response structure from AI");
    }

    return NextResponse.json({
      version: releaseData.tag,
      title: result.title,
      content: result.content,
      commitCount: releaseData.commitCount,
      source: releaseData.source,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Failed to generate release notes with AI.",
    }, { status: 500 });
  }
});
