import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

const run = promisify(execFile);

// Playwright can only record .webm (its bundled ffmpeg has no mp4 muxer), so re-encode with a full ffmpeg.
export default class Mp4VideoReporter implements Reporter {
  // onTestEnd isn't awaited but onEnd is, so conversions are awaited there or the CLI exits mid-convert.
  private pending: Promise<void>[] = [];

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (attachment.name !== "video" || attachment.contentType !== "video/webm" || !attachment.path) continue;
      this.pending.push(this.convert(attachment));
    }
  }

  async onEnd(): Promise<void> {
    await Promise.all(this.pending);
  }

  private async convert(attachment: TestResult["attachments"][number]): Promise<void> {
    // onTestEnd only passes attachments with a path.
    const webmPath = attachment.path!;
    const mp4Path = webmPath.replace(/\.webm$/, ".mp4");

    try {
      // yuv420p so non-ffmpeg players (QuickTime) can play it; faststart makes it seekable before full download.
      await run(ffmpeg.path, ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path]);
      await rm(webmPath);
      attachment.path = mp4Path;
      attachment.contentType = "video/mp4";
    } catch (error) {
      // Never fail the run over conversion; the .webm is still a valid artifact.
      console.warn(`[mp4VideoReporter] Failed to convert ${webmPath} to .mp4, keeping the original:`, error);
    }
  }
}
