# Build tools for Github Actions

## Docker Check

This step runs a Docker command and captures the output into a Check in Github Actions.
The main use-case is pairing with the above `docker-multistage-build` to perform additional optimizations that avoid image pulls, performing multiple test stages while retaining clear outputs on what is passing and failing in the Checks UI.

### Inputs

| Input | Required | Description |
|---|---|---|---|
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

### Known issues

- Due to current limitations in the Checks API, the check is attached to a random workflow, not necessarily the one this is in.
  This requires an upstream fix.
