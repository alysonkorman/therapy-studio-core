import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const serviceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = dirname(serviceDirectory);
const artifacts = [
  {
    artifactDirectory: join(serviceDirectory, ".aws-sam-room-handler"),
    entry: "live-service/src/aws.js",
    handler: "aws.js",
    name: "therapy-studio-live-room-handler",
    // RoomHandler must remain pinned to approved source until a Live Session change
    // is deliberately reviewed. Account Data builds independently from the worktree.
    source: "head",
    externals:
      "@aws-sdk/client-dynamodb,@aws-sdk/lib-dynamodb,@aws-sdk/client-apigatewaymanagementapi",
  },
  {
    artifactDirectory: join(serviceDirectory, ".aws-sam-account-data-handler"),
    entry: "live-service/src/accountData.js",
    handler: "accountData.js",
    name: "therapy-studio-account-data-handler",
    source: "worktree",
    externals: "@aws-sdk/client-dynamodb,@aws-sdk/lib-dynamodb",
  },
];
const rolldown = join(repositoryDirectory, "node_modules", ".bin", "rolldown");

function committedSourceDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "therapy-studio-room-handler-"));
  const archive = execFileSync(
    "git",
    [
      "archive",
      "--format=tar",
      "HEAD",
      "live-service/src",
      "src/models",
      "src/features/live-sessions/liveSessionAdapter.js",
      "src/features/live-sessions/liveSessionProtocol.js",
      "src/features/whiteboard/whiteboardLiveSessionAdapter.js",
    ],
    { cwd: repositoryDirectory }
  );
  execFileSync("tar", ["-xf", "-", "-C", directory], { input: archive });
  symlinkSync(join(repositoryDirectory, "node_modules"), join(directory, "node_modules"));
  return directory;
}

function buildArtifact({ artifactDirectory, entry, externals, handler, name, source }) {
  rmSync(artifactDirectory, { force: true, recursive: true });
  mkdirSync(artifactDirectory, { recursive: true });

  const sourceDirectory =
    source === "head" ? committedSourceDirectory() : repositoryDirectory;
  try {
    // Bundle only the handler's import closure. AWS SDK v3 clients remain external
    // because Node.js Lambda provides them; cloud-safe schemas are bundled.
    execFileSync(
      rolldown,
      [
        entry,
        "--file",
        join(artifactDirectory, handler),
        "--format",
        "esm",
        "--platform",
        "node",
        "--minify",
        "--no-codeSplitting",
        "--external",
        externals,
      ],
      { cwd: sourceDirectory, stdio: "inherit" }
    );
  } finally {
    if (source === "head") rmSync(sourceDirectory, { force: true, recursive: true });
  }

  writeFileSync(
    join(artifactDirectory, "package.json"),
    `${JSON.stringify({ name, private: true, type: "module", version: "0.0.0" }, null, 2)}\n`
  );
}

artifacts.forEach(buildArtifact);
