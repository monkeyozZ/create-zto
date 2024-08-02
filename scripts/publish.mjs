#!/usr/bin/env zx
import 'zx/globals'

// 读取 package.json 中的版本信息
let { version, name } = JSON.parse(await fs.readFile('./package.json'))

// 确保所有更改已提交
const status = await $`git status --porcelain`
if (status.stdout.trim()) {
  console.error("There are uncommitted changes in the working directory. Please commit or stash them before releasing.")
  process.exit(1)
}

// 确保没有未完成的更改
await $`git fetch origin`
const localHash = await $`git rev-parse HEAD`
const remoteHash = await $`git rev-parse origin/main`
if (localHash.stdout.trim() !== remoteHash.stdout.trim()) {
  console.error("The local branch is not up-to-date with the remote branch. Please pull the latest changes.")
  process.exit(1)
}

// 构建项目
await $`npm run build`

// 更新版本号
await $`npm version patch`

// 推送更改和标签到远程
await $`git push --follow-tags`

// 发布到 npm
await $`npm publish`

// 打印发布成功信息
console.log(`Successfully released ${name}@${version}`)