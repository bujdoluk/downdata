import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

const run = promisify(execFile);

// Playwright's own video recording is hardcoded to .webm (it pipes frames
// through a stripped-down internal ffmpeg build that only has the
// webm/libvpx_vp8 muxer/encoder compiled in — confirmed by running
// -encoders against ms-playwright's bundled binary, no libx264, no mp4
// muxer at all). There's no config option to make it emit .mp4 directly.
// This reporter re-encodes every recorded video to .mp4 right after each
// test finishes, using the full ffmpeg build @ffmpeg-installer/ffmpeg
// installs (real libx264 + mp4 muxer, confirmed the same way) — so
// playwright.config.ts's use.video keeps working exactly as documented,
// it just also gets a playable .mp4 sitting next to (replacing) the .webm.
export default class Mp4VideoReporter implements Reporter {
  // Playwright's own Multiplexer dispatches onTestEnd without awaiting its
  // returned promise, and the CLI can exit once the run's onEnd has
  // resolved — not once this reporter's own async work is done. Every
  // conversion started in onTestEnd is tracked here and awaited from
  // onEnd, which Playwright *does* await (per the Reporter interface's own
  // docs), so the process can't exit mid-conversion and silently lose the
  // very evidence this reporter exists to produce.
  private pending: Promise<void>[] = [];

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (attachment.name !== "video" || attachment.contentType !== "video/webm" || !attachment.path) continue;
      // Kicked off, not awaited, here — collected into `pending` instead so
      // multiple attachments (this test's own, or across tests) convert
      // concurrently rather than paying each ffmpeg run's wall-clock cost
      // one after another.
      this.pending.push(this.convert(attachment));
    }
  }

  async onEnd(): Promise<void> {
    await Promise.all(this.pending);
  }

  private async convert(attachment: TestResult["attachments"][number]): Promise<void> {
    const webmPath = attachment.path!;
    const mp4Path = webmPath.replace(/\.webm$/, ".mp4");

    try {
      // -pix_fmt yuv420p: without it libx264 keeps whatever pixel format
      // came out of vp8 decoding, which QuickTime/most non-ffmpeg-based
      // players can't handle — this is the single most common reason a
      // libx264 .mp4 still won't play. -movflags +faststart moves the
      // moov atom to the front so the file is seekable/streamable
      // immediately instead of only after a full download.
      await run(ffmpeg.path, ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path]);
      await rm(webmPath);
      attachment.path = mp4Path;
      attachment.contentType = "video/mp4";
    } catch (error) {
      // Never fail the run over a video conversion problem — the .webm
      // recording is still a valid (if less playable) artifact of what
      // actually happened, and losing it on a conversion hiccup would be
      // worse than leaving it as .webm.
      console.warn(`[mp4VideoReporter] Failed to convert ${webmPath} to .mp4, keeping the original:`, error);
    }
  }
}
