// setup-husky-hooks.js

const { execSync } = require("child_process")
const fs = require("fs")

// Initialize Husky
execSync("npx husky install", { stdio: "inherit" })

// Create .husky/pre-commit if it does not exist
if (!fs.existsSync(".husky/pre-commit")) {
  console.log("Creating .husky/pre-commit...")
  fs.writeFileSync(
    ".husky/pre-commit",
    `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
`
  )
  execSync("chmod +x .husky/pre-commit")
}

// Create .husky/commit-msg if it does not exist
if (!fs.existsSync(".husky/commit-msg")) {
  console.log("Creating .husky/commit-msg...")
  fs.writeFileSync(
    ".husky/commit-msg",
    `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
`
  )
  execSync("chmod +x .husky/commit-msg")
}
