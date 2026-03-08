import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // On Vercel, the file layout is flattened or different. We try multiple locations.
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "public"),   // Local/Build default
    path.resolve(process.cwd(), "public"),          // Some serverless layouts
    path.resolve(__dirname, "..", "dist", "public"), // Relative from server/
    path.resolve(__dirname, "public"),              // Inside compiled output
  ];

  let distPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    // If none exist, default to the most likely one to throw its error
    distPath = path.resolve(process.cwd(), "dist", "public");
    if (!fs.existsSync(distPath)) {
      throw new Error(`Could not find the build directory. Checked: ${possiblePaths.join(", ")}`);
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
