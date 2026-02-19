#!/usr/bin/env node

const path = require("path");
const { loadConfig } = require("../lib/mod/config");

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
Usage: fossbook <command> [options]

Commands:
  build          Build the static site
  serve          Build and start a local dev server
  new <title>    Create a new post
  init           Create a new fossbook site project
  deploy         Build, commit, push, and monitor deployment

Options:
  -c, --config   Path to config file (default: ./fossbook.config.js)
  -o, --output   Output directory (default: ./public)
  -p, --port     Dev server port (default: 3000)
  --clean        Remove output directory before build (default: true)
  --github       (init) Also create a GitHub repo and push
  -m, --message  (deploy) Custom commit message
  --no-wait      (deploy) Push without waiting for CI status
  --draft        (deploy) Commit locally without pushing
  -v, --version  Show version number
  -h, --help     Show help
`);
}

function getOption(flag, alias) {
  const idx = args.indexOf(flag);
  const aliasIdx = alias ? args.indexOf(alias) : -1;
  const foundIdx = idx !== -1 ? idx : aliasIdx;
  if (foundIdx !== -1 && foundIdx + 1 < args.length) {
    return args[foundIdx + 1];
  }
  return null;
}

function hasFlag(flag, alias) {
  return args.includes(flag) || (alias && args.includes(alias));
}

if (hasFlag("-v", "--version")) {
  const pkg = require("../package.json");
  console.log(`fossbook v${pkg.version}`);
  process.exit(0);
}

if (hasFlag("-h", "--help") || !command) {
  printHelp();
  process.exit(0);
}

const configPath = getOption("-c", "--config");

switch (command) {
  case "build": {
    const config = loadConfig(configPath);
    const outputOverride = getOption("-o", "--output");
    if (outputOverride) config.dev.outdir = outputOverride;

    const { build } = require("../lib/index");
    build(config);
    break;
  }

  case "serve": {
    const config = loadConfig(configPath);
    const outputOverride = getOption("-o", "--output");
    if (outputOverride) config.dev.outdir = outputOverride;
    const port = getOption("-p", "--port") || 3000;

    const { build } = require("../lib/index");
    build(config);

    const { serve } = require("../lib/server");
    serve(config, Number(port));
    break;
  }

  case "new": {
    const title = args[1];
    if (!title) {
      console.error('Error: Please provide a post title. Usage: fossbook new "My Post Title"');
      process.exit(1);
    }
    const config = loadConfig(configPath);
    const { createPost } = require("../lib/new");
    createPost(config, title);
    break;
  }

  case "init": {
    const { initProject } = require("../lib/init");
    initProject({ github: hasFlag("--github") });
    break;
  }

  case "deploy": {
    const config = loadConfig(configPath);
    const { deploy } = require("../lib/deploy");
    deploy(config, {
      message: getOption("-m", "--message"),
      noWait: hasFlag("--no-wait"),
      draft: hasFlag("--draft"),
    });
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
