import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

import { getFullCommitHash } from './helpers'

interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

async function run(): Promise<void> {
  const checkId = await createCheck()
  core.debug(`Check ID ${checkId}`)

  const result = await runCheckDockerCommand()

  await updateCheck(checkId, result)

  if (result.exitCode > 0) {
    core.setFailed('Docker check command exited non-zero. See check for details.')
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

async function updateCheck(checkId: number, result: ExecResult): Promise<void> {

  const conclusion: Conclusion = result.exitCode > 0 ? 'failure' : 'success'

  // https://docs.github.com/en/rest/reference/checks#update-a-check-run
  core.debug(`Updating check ${checkId} to ${conclusion}`)
  const token = core.getInput('token')
  const ok = github.getOctokit(token)

  const title = result.exitCode > 0
    ? `Failed with exit code ${result.exitCode}`
    : 'Succeeded'

  const summary = undefined // Reserve for future
  const text = "# Command output"
   + "\n\n"
   + "## stdout"
   + "\n\n"
   + '```' + result.stdout + '```'
   + "\n\n"
   + "## stderr"
   + "\n\n"
   + '```' + result.stderr + '```'

  const updateParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    check_run_id: checkId,
    conclusion,
    status: 'completed',
    output: {
      title,
      summary,
      text,
      // annotations
      // images
    },
  }
  await ok.rest.checks.update(updateParams)
}

async function runCheckDockerCommand(): Promise<ExecResult> {
  // Docker run --rm {options} {image} {command}
  const image = core.getInput('image')
  const command = core.getInput('command')
  const options = core.getInput('options')

  let stdout = ''
  let stderr = ''

  const execOptions = {
    ignoreReturnCode: true, // Will do manual error handling
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

  return { stdout, stderr, exitCode }
}

run()
