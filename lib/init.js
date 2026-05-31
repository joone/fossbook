const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

const DEPLOY_WORKFLOW = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npx fossbook build

      - name: Setup Pages
        uses: actions/configure-pages@v4
        with:
          enablement: true

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

function initProject(options = {}) {
  let cwd = process.cwd();

  // If a project name is given, create the directory and work inside it
  if (options.name) {
    const projectDir = path.join(cwd, options.name);
    if (fs.existsSync(projectDir)) {
      console.error(`Error: Directory "${options.name}" already exists.`);
      process.exit(1);
    }
    fs.mkdirSync(projectDir, { recursive: true });
    cwd = projectDir;
    console.log(`Creating new site in ${cwd}\n`);
  }

  // Create directories
  const dirs = [
    "content/posts",
    "static/images",
  ];

  dirs.forEach((dir) => {
    const dirPath = path.join(cwd, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created: ${dir}/`);
    }
  });

  // Create .github/workflows/deploy.yml
  const workflowDir = path.join(cwd, ".github", "workflows");
  const workflowPath = path.join(workflowDir, "deploy.yml");
  if (!fs.existsSync(workflowPath)) {
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(workflowPath, DEPLOY_WORKFLOW);
    console.log("Created: .github/workflows/deploy.yml");
  }

  // Create .gitignore
  const gitignorePath = path.join(cwd, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, "node_modules/\npublic/\n");
    console.log("Created: .gitignore");
  }

  // Create fossbook.config.js
  const configPath = path.join(cwd, "fossbook.config.js");
  if (!fs.existsSync(configPath)) {
    const configContent = `module.exports = {
  blogName: "My Blog",
  authorName: "",
  authorDescription: "",
  authorWebsite: "",
  blogDescription: "A blog powered by fossbook",
  blogsite: "http://localhost:3000",

  // Optional
  githubCNAME: "",
  googleAnalyticsID: "",
  authorTwitter: "",
  siteTwitter: "",
  githubRepository: "",
  image: "",
  theme: "archie",

  // Comment system (optional)
  // comments: { provider: "utterances", repo: "user/repo", issueTerm: "pathname", theme: "github-light" },

  // Deployment
  // deploy: { branch: "main", remote: "origin" },

  // Directory overrides (defaults shown)
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",
};
`;
    fs.writeFileSync(configPath, configContent);
    console.log("Created: fossbook.config.js");
  }

  // Create content/about.md
  const aboutPath = path.join(cwd, "content", "about.md");
  if (!fs.existsSync(aboutPath)) {
    const aboutContent = `---
title: About
---

Welcome to my blog!
`;
    fs.writeFileSync(aboutPath, aboutContent);
    console.log("Created: content/about.md");
  }

  // Create package.json if it doesn't exist
  const pkgPath = path.join(cwd, "package.json");
  const createdPkg = !fs.existsSync(pkgPath);
  if (createdPkg) {
    const pkg = {
      name: path.basename(cwd),
      version: "1.0.0",
      private: true,
      scripts: {
        build: "fossbook build",
        start: "fossbook serve",
        deploy: "fossbook deploy",
      },
      dependencies: {
        fossbook: "latest",
      },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log("Created: package.json");
  }

  // Generate package-lock.json (required by CI/CD npm ci + cache)
  const lockPath = path.join(cwd, "package-lock.json");
  if (!fs.existsSync(lockPath)) {
    console.log("Running npm install to generate package-lock.json...");
    try {
      execSync("npm install", { cwd, stdio: "inherit" });
      console.log("Created: package-lock.json");
    } catch {
      console.warn("Warning: npm install failed. You may need to run it manually.");
    }
  }

  // Handle --github flag: create repo and push
  if (options.github) {
    initGitHub(cwd);
  }

  console.log("\nSite initialized! Next steps:");
  if (!options.github) {
    console.log('  1. Edit fossbook.config.js with your site settings');
    console.log('  2. Run: fossbook new "My First Post"');
    console.log("  3. Edit your post in content/posts/");
    console.log("  4. Run: fossbook build");
    console.log("  5. Run: fossbook serve");
  } else {
    console.log('  1. Edit fossbook.config.js with your site settings');
    console.log('  2. Run: fossbook new "My First Post"');
    console.log("  3. Edit your post in content/posts/");
    console.log("  4. Run: fossbook deploy");
  }
}

function initGitHub(cwd) {
  // Check if gh CLI is available
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    console.error(
      "Error: GitHub CLI (gh) is not installed.\n" +
      "Install it: https://cli.github.com/\n" +
      "  Linux:   sudo apt install gh\n" +
      "  macOS:   brew install gh\n" +
      "  Windows: winget install GitHub.cli"
    );
    process.exit(1);
  }

  // Check if gh is authenticated
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    console.error("Error: GitHub CLI is not authenticated. Run: gh auth login");
    process.exit(1);
  }

  // Initialize git repo if needed
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    console.log("Initializing git repository...");
    execSync("git init", { cwd, stdio: "inherit" });
    execSync("git branch -M main", { cwd, stdio: "inherit" });
  }

  // Create GitHub repository
  const repoName = path.basename(cwd);
  console.log(`Creating GitHub repository: ${repoName}...`);
  try {
    execSync(`gh repo create ${repoName} --public --source=. --remote=origin`, {
      cwd,
      stdio: "inherit",
    });
  } catch {
    // Repo may already exist — ask user what to do
    console.warn(`\nA GitHub repository named "${repoName}" already exists on your account.`);
    const answer = promptSync("Push to the existing repo? (y/n): ");
    if (answer.toLowerCase() !== "y") {
      console.log("Cancelled. Your local site files are still available.");
      return;
    }
    // Ensure the remote is set
    try {
      // Check if origin remote already exists
      execSync("git remote get-url origin", { cwd, stdio: "ignore" });
    } catch {
      // Add origin remote using the authenticated user's repo URL
      try {
        const ghUser = execSync("gh api user --jq .login", {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        const remoteUrl = `git@github.com:${ghUser}/${repoName}.git`;
        execSync(`git remote add origin ${remoteUrl}`, { cwd, stdio: "inherit" });
        console.log(`Added remote: ${remoteUrl}`);
      } catch {
        console.warn("Warning: Could not add git remote. Add it manually with:");
        console.warn(`  git remote add origin git@github.com:<user>/${repoName}.git`);
      }
    }
  }

  // Initial commit and push
  console.log("Committing and pushing to GitHub...");
  execSync("git add -A", { cwd, stdio: "inherit" });
  try {
    execSync('git commit -m "Initial fossbook site"', { cwd, stdio: "inherit" });
  } catch {
    // Nothing to commit
  }
  try {
    execSync("git push -u origin main", { cwd, stdio: "inherit" });
  } catch (e) {
    console.warn("Warning: Could not push to origin. You may need to push manually.");
  }

  console.log("\nGitHub repository created and pushed!");
  console.log("Enable GitHub Pages in your repo settings:");
  console.log("  Settings → Pages → Source → GitHub Actions");
}

/**
 * Synchronous prompt that reads a single line from stdin.
 */
function promptSync(question) {
  const buf = Buffer.alloc(256);
  process.stdout.write(question);
  const fd = fs.openSync("/dev/tty", "r");
  let str = "";
  // Read one byte at a time until newline
  while (true) {
    const bytesRead = fs.readSync(fd, buf, 0, 1);
    if (bytesRead === 0) break;
    const char = buf.toString("utf-8", 0, 1);
    if (char === "\n") break;
    str += char;
  }
  fs.closeSync(fd);
  return str.trim();
}

module.exports = { initProject };
