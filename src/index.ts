import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

import { getFullCommitHash } from './helpers'

async function run(): Promise<void> {
  const checkId = await createCheck()
  core.debug(`Check ID ${checkId}`)

  try {
    await runCheckDockerCommand()
    await updateCheck(checkId, 'success')
  } catch (error) {
    core.debug('Docker command threw - updating to failure')
    await updateCheck(checkId, 'failure')
    core.setFailed(error.message)
  }
}

async function createCheck(): Promise<number> {
  // https://docs.github.com/en/rest/reference/checks#create-a-check-run
  const token = core.getInput('token')
  const name = core.getInput('name')
  const ok = github.getOctokit(token)

  const createParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    head_sha: getFullCommitHash(),
    name,
    status: 'in_progress',
  }
  const check = await ok.rest.checks.create(createParams)
  return check.data.id
}

type Conclusion =
  | 'action_required'
  | 'cancelled'
  | 'failure'
  | 'neutral'
  | 'success'
  | 'skipped'
  | 'stale'
  | 'timed_out'

async function updateCheck(checkId: number, conclusion: Conclusion): Promise<void> {
  // https://docs.github.com/en/rest/reference/checks#update-a-check-run
  core.debug(`Updating check ${checkId} to ${conclusion}`)
  const token = core.getInput('token')
  const ok = github.getOctokit(token)
  const updateParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    check_run_id: checkId,
    conclusion,
    status: 'completed',
    output: {
      title: 'Title',
      summary: 'Summary *one* **two**',
      text: 'Text *one* **two**',
      // annotations
      // images
    },
  }
  await ok.rest.checks.update(updateParams)
}

async function runCheckDockerCommand(): Promise<string> {
  // Docker run --rm {options} {image} {command}
  const image = core.getInput('image')
  const command = core.getInput('command')
  const options = core.getInput('options')

  let stdout = ''
  let stderr = ''

  const execOptions = {
    listeners: {
      stderr: (data: Buffer) => {
        stderr += data.toString()
      },
      stdout: (data: Buffer) => {
        stdout += data.toString()
      },
    }
  }

  const exitCode = await exec.exec(`docker run --rm ${options} ${image} ${command}`, [], execOptions)
  stderr // quiet tsc
  exitCode // quiet tsc

  return stdout
}

run()
