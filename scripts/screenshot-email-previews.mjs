import { chromium } from "playwright";
import path from "node:path";

const files = ["confirm-email.html", "incident-created.html", "incident-update.html"];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 700 } });

for (const file of files) {
  const filePath = path.resolve("scratch-email-preview", file);
  const fileUrl = "file:///" + filePath.split(path.sep).join("/");
  await page.goto(fileUrl);
  const outPath = path.resolve("scratch-email-preview", file.replace(".html", ".png"));
  await page.screenshot({ path: outPath, fullPage: true });
  console.log("saved", outPath);
}

await browser.close();
