#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'

import { parseArgs } from 'node:util'

import prompts from 'prompts'
import { red, green, bold } from 'kolorist'
import { postOrderDirectoryTraverse, preOrderDirectoryTraverse } from './utils/directoryTraverse'
import msgData from './messages'
import renderTemplate from './utils/renderTemplate'
import getCommand from './utils/getCommand'

// #region 辅助方法
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

function canSkipEmptying(dir: string) {
  if (!fs.existsSync(dir)) {
    return true
  }

  const files = fs.readdirSync(dir)
  if (files.length === 0) {
    return true
  }
  if (files.length === 1 && files[0] === '.git') {
    return true
  }

  return false
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  )
}
// #endregion

// #region 初始化逻辑
async function init() {
  const cwd = process.cwd()
  const args = process.argv.slice(2)
  const options = {} as const

  const { values: argv, positionals } = parseArgs({
    args,
    options,
    strict: false
  })

  let targetDir = positionals[0]
  const defaultProjectName = !targetDir ? 'zto-project' : targetDir

  const forceOverwrite = argv.force

  let result: {
    projectName?: string
    packageName?: string
    shouldOverwrite?: boolean
    templateType?: string
  } = {}

  try {
    result = await prompts([
      {
        name: 'projectName',
        type: targetDir ? null : 'text',
        message: msgData.projectName.message,
        initial: defaultProjectName,
        onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
      },
      {
        name: 'shouldOverwrite',
        type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'toggle'),
        message: () => {
          const dirForPrompt =
            targetDir === '.'
              ? msgData.shouldOverwrite.dirForPrompts.current
              : `${msgData.shouldOverwrite.dirForPrompts.target} "${targetDir}"`
  
          return `${dirForPrompt} ${msgData.shouldOverwrite.message}`
        },
        initial: true,
        active: msgData.defaultToggleOptions.active,
        inactive: msgData.defaultToggleOptions.inactive
      },
      {
        name: 'packageName',
        type: () => (isValidPackageName(targetDir) ? null : 'text'),
        message: msgData.packageName.message,
        initial: () => toValidPackageName(targetDir),
        validate: (dir) => isValidPackageName(dir) || msgData.packageName.invalidMessage
      },
      {
        name: 'overwriteChecker',
        type: (prev, values) => {
          if (values.shouldOverwrite === false) {
            throw new Error(red('✖') + ` ${msgData.errors.operationCancelled}`)
          }
          return null
        }
      },
      {
        name: 'templateType',
        type: 'select',
        hint: msgData.templateType.hint,
        message: msgData.templateType.message,
        initial: 0,
        choices: (prev, answers) => [
          {
            title: msgData.templateType.selectOptions['vue2-admin-webpack'].title,
            description: msgData.templateType.selectOptions['vue2-admin-webpack'].desc,
            value: 'vue2-admin-webpack'
          },
          {
            title: msgData.templateType.selectOptions['vue3-admin-vite'].title,
            description: msgData.templateType.selectOptions['vue3-admin-vite'].desc,
            value: 'vue3-admin-vite'
          },
          {
            title: msgData.templateType.selectOptions['vue2-h5-webpack'].title,
            description: msgData.templateType.selectOptions['vue2-h5-webpack'].desc,
            value: 'vue2-h5-webpack'
          },
          {
            title: msgData.templateType.selectOptions['vue3-h5-vite'].title,
            description: msgData.templateType.selectOptions['vue3-h5-vite'].desc,
            value: 'vue3-h5-vite'
          },
          {
            title: msgData.templateType.selectOptions['uni-vue2'].title,
            description: msgData.templateType.selectOptions['uni-vue2'].desc,
            value: 'uni-vue2'
          },
          {
            title: msgData.templateType.selectOptions['uni-vue3'].title,
            description: msgData.templateType.selectOptions['uni-vue3'].desc,
            value: 'uni-vue3'
          },
        ]
      },
      
    ])
    {
      onCancel: () => {
        throw new Error(red('✖') + ` ${msgData.errors.operationCancelled}`)
      }
    }
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
  console.log("🚀 ~ init ~ result:", result)

  const { 
    projectName,
    shouldOverwrite,
    packageName = projectName ?? defaultProjectName, 
    templateType
  } = result
  
  const root = path.join(cwd, targetDir)

  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }

  console.log(`\n${msgData.infos.scaffolding} ${root}...`)

  const pkg = { name: packageName, version: '0.0.0' }
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

  const templateRoot = path.resolve(__dirname, 'templates/vue')
  const callbacks = []
  const render = function render(templateName) {
    const templateDir = path.resolve(templateRoot, templateName)
    renderTemplate(templateDir, root, callbacks)
  }
  render(templateType)

  const dataStore = {}
  for (const cb of callbacks) {
    await cb(dataStore)
  }

  const userAgent = process.env.npm_config_user_agent ?? ''
  const packageManager = /pnpm/.test(userAgent)
    ? 'pnpm'
    : /yarn/.test(userAgent)
      ? 'yarn'
      : /bun/.test(userAgent)
        ? 'bun'
        : 'npm'

  console.log(`\n${msgData.infos.done}\n`)
  if (root !== cwd) {
    const cdProjectName = path.relative(cwd, root)
    console.log(
      `  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`
    )
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`)
  console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`)
  console.log()
}
// #endregion

init().catch((e) => {
  console.error(e)
})