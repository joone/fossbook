const fs = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");
const { build } = require("./index");

/**
 * Deploy the blog: build → commit → push → poll CI → show URL.
 */
async function deploy(config, options = {}) {
  const cwd = process.cwd();
  const deployConfig = config.deploy || {};
  const branch = deployConfig.branch || "main";
  const remote = deployConfig.remote || "origin";

  // 1. Build the site
  console.log("Building site...");
  build(config);
  console.log("Build complete.\n");

  // 2. Check git is initialized
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    console.error("Error: Not a git repository. Run 'fossbook init --github' first.");
    process.exit(1);
  }

  // 3. Stage all changes
  execSync("git add -A", { cwd, stdio: "inherit" });

  // 4. Check if there are changes to commit
  try {
    execSync("git diff --cached --quiet", { cwd });
    console.log("No changes to commit.");
    return;
  } catch {
    // There are staged changes — continue
  }

  // 5. Determine commit message
  let commitMessage = options.message;
  if (!commitMessage) {
    commitMessage = detectNewPost(config) || "Update blog";
  }

  // 6. Commit
  console.log(`Committing: "${commitMessage}"`);
  execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
    cwd,
    stdio: "inherit",
  });

  // 7. If --draft, stop here
  if (options.draft) {
    console.log("\nDraft committed locally. Run 'fossbook deploy' again to push.");
    return;
  }

  // 8. Ensure GitHub Pages is enabled (source: GitHub Actions)
  ensureGitHubPages(cwd);

  // 9. Push
  console.log(`\nPushing to ${remote}/${branch}...`);
  try {
    execSync(`git push ${remote} ${branch}`, { cwd, stdio: "inherit" });
  } catch (e) {
    console.error(`Error: Failed to push to ${remote}/${branch}.`);
    console.error("Make sure the remote exists and you have push access.");
    process.exit(1);
  }

  // 10. Wait for CI/CD and show URL
  if (options.noWait) {
    console.log("\nPushed! Skipping CI/CD status check (--no-wait).");
    printSiteUrl(config);
    return;
  }

  await waitForDeployment(cwd, config);
}

/**
 * Detect if a new post was added and return a commit message.
 */
function detectNewPost(config) {
  try {
    const diffOutput = execSync("git diff --cached --name-only", {
      encoding: "utf-8",
    });
    const postsDir = config.postsDir || "./content/posts";
    const newPosts = diffOutput
      .split("\n")
      .filter((f) => f.startsWith(postsDir.replace("./", "")) && f.endsWith("index.md"))
      .map((f) => {
        // Extract post title from path like "content/posts/My Post/index.md"
        const parts = f.split(/[\/\\]/);
        return parts[parts.length - 2];
      });

    if (newPosts.length === 1) {
      return `Publish: ${newPosts[0]}`;
    } else if (newPosts.length > 1) {
      return `Publish ${newPosts.length} new posts`;
    }
  } catch {
    // Fall through
  }
  return null;
}

/**
 * Wait for GitHub Actions deployment to complete, then show the URL.
 */
async function waitForDeployment(cwd, config) {
  // Check if gh is available
  const hasGh = isGhAvailable();

  if (!hasGh) {
    console.log("\nGitHub CLI (gh) not found. Cannot monitor deployment status.");
    console.log("Install it to see live deployment progress: https://cli.github.com/");
    printSiteUrl(config);
    return;
  }

  console.log("\nWaiting for GitHub Pages deployment...");

  try {
    // Wait a moment for the workflow to be triggered
    await sleep(3000);

    // Get the latest workflow run
    const runJson = execSync(
      'gh run list --workflow=deploy.yml --limit=1 --json databaseId,status,conclusion',
      { cwd, encoding: "utf-8" }
    );
    const runs = JSON.parse(runJson);

    if (runs.length === 0) {
      console.log("No workflow runs found. The deployment may not be configured yet.");
      console.log("Enable GitHub Pages: Settings → Pages → Source → GitHub Actions");
      return;
    }

    const runId = runs[0].databaseId;

    // Watch the run
    console.log(`Monitoring workflow run #${runId}...`);
    execSync(`gh run watch ${runId}`, { cwd, stdio: "inherit" });

    // Check result
    const resultJson = execSync(
      `gh run view ${runId} --json conclusion`,
      { cwd, encoding: "utf-8" }
    );
    const result = JSON.parse(resultJson);

    if (result.conclusion === "success") {
      console.log("\n✅ Deployment successful!");
      printSiteUrl(config);
    } else {
      console.error(`\n❌ Deployment failed (conclusion: ${result.conclusion}).`);
      console.log(`View details: gh run view ${runId} --log`);
      process.exit(1);
    }
  } catch (e) {
    console.warn("\nCould not monitor deployment status.");
    console.log("Check your deployment at: https://github.com → Actions tab");
    printSiteUrl(config);
  }
}

/**
 * Print the site URL based on config.
 */
function printSiteUrl(config) {
  const siteUrl = config.blogsite || config.githubCNAME;
  if (siteUrl && siteUrl !== "http://localhost:3000") {
    console.log(`\nView your site at: ${siteUrl}`);
  } else {
    // Try to infer from git remote
    try {
      const remoteUrl = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
      const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
      if (match) {
        const [owner, repo] = match[1].split("/");
        console.log(`\nView your site at: https://${owner}.github.io/${repo}/`);
      }
    } catch {
      console.log("\nYour site will be available on GitHub Pages once deployment completes.");
    }
  }
}

function isGhAvailable() {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensure GitHub Pages is enabled with "GitHub Actions" as the build source.
 * Uses the GitHub CLI (gh) to check and create the Pages site if needed.
 */
function ensureGitHubPages(cwd) {
  if (!isGhAvailable()) return;

  try {
    // Try to get the current Pages config
    execSync("gh api repos/{owner}/{repo}/pages", {
      cwd,
      stdio: "ignore",
    });
    // Pages already enabled — nothing to do
  } catch {
    // Pages not enabled — try to create it with GitHub Actions source
    try {
      console.log("Enabling GitHub Pages (source: GitHub Actions)...");
      execSync(
        'gh api repos/{owner}/{repo}/pages -X POST -f build_type=workflow',
        { cwd, stdio: "ignore" }
      );
      console.log("GitHub Pages enabled successfully.");
    } catch (e) {
      console.warn(
        "Warning: Could not auto-enable GitHub Pages.\n" +
        "Please enable it manually: Settings → Pages → Source → GitHub Actions"
      );
    }
  }
}

module.exports = { deploy };
