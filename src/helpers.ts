import * as github from '@actions/github'

const pullRequestEvents = [
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
]
export function getFullCommitHash(): string {
  // Github runs actions triggered by PRs on a merge commit. This populates
  // GITHUB_SHA and related fields with the merge commit hash, rather than the
  // hash of the commit that triggered the PR.
  //
  // For many situations, that results in very confusing mismatches, especially
  // when trying to use commit hashes for build targets

  if (pullRequestEvents.includes(github.context.eventName)) {
    const prEvent = github.context.payload.pull_request as unknown as any
    return prEvent.head.sha
  }
  return github.context.sha
}
