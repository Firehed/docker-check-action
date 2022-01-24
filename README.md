# Build tools for Github Actions

## Docker Check

This step runs a Docker command and captures the output into a Check in Github Actions.
The main use-case is pairing with the above `docker-multistage-build` to perform additional optimizations that avoid image pulls, performing multiple test stages while retaining clear outputs on what is passing and failing in the Checks UI.

### Inputs

| Input | Required | Description |
|---|---|---|
| `name` | **yes** | Check Name |
| `token` | **yes** | `GITHUB_TOKEN`. Normally, you will set this to `${{ secrets.GITHUB_TOKEN }}` |
| `image` | **yes** | The image to run |
| `command` | **yes** | Command to run inside of Docker |
| `options` | no | Additional options to pass to `docker run` |

### Example

```yaml
name: "Self-test: Docker check"

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  run-docker:
    name: Run docker
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - uses: firehed/actions/docker-check@v1
        with:
          name: 'Run llllls'
          token: ${{ secrets.GITHUB_TOKEN }}
          image: alpine:latest
          command: llllls

      - uses: firehed/actions/docker-check@v1
        # Do this even if the previous step failed
        if: ${{ always() }}
        with:
          name: 'Run ls'
          token: ${{ secrets.GITHUB_TOKEN }}
          image: alpine:latest
          command: ls
          options:
            --env-file .env
            --volume ${{ github.workspace }}/coverage:/coverage"
```

### Using with Dependabot

By default, Dependabot will run Actions with read-only permissions on private repositories (note: this applies to _any_ external user, not just Dependabot).
This means that since this action uses the Checks API to create and update statuses, the API calls will fail and the action will not complete.
To resolve this, ensure that in your workflow file, `permissions.checks` is set to `write`.
This can be done at the top level or within a job.
Be aware that configuring any permission results in all non-specified APIs being set to `none`, which will probably not work.
At minimum, you will also want `permissions.contents` set to `read` (so the repo can be checked out by the workflow); other values may need adjusting based on the contents of your workflow.
See the [official documentation](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#permissions) for additional information.

Note: there may be additional configuration requirements for organization-owned private repositories.
Still researching this...

### Known issues

- Due to current limitations in the Checks API, the check is attached to a random workflow, not necessarily the one this is in.
  This requires an upstream fix.
