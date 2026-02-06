# FSH Alias Validator Action

![CI](https://github.com/patrick-werner/alias-duplicate-checker/actions/workflows/ci.yml/badge.svg)
![Release](https://img.shields.io/github/v/release/patrick-werner/alias-duplicate-checker?sort=semver)
![Node](https://img.shields.io/badge/node-20.x-339933)
![FHIR](https://img.shields.io/badge/FHIR-required-0b7285)
![FSH](https://img.shields.io/badge/FSH-aliases-6f42c1)

Validate FSH alias consistency across all `.fsh` files under a directory (recursively).

## What it checks
- Alias name duplicates that map to different URLs.
- URL duplicates mapped by different alias names.
- Protocol mismatches (`http` vs `https`) for otherwise identical URLs.

## Inputs

| Name | Description | Default |
| --- | --- | --- |
| `fsh_directory` | Path to the folder containing `.fsh` files | `input/fsh` |

## Usage

```yaml
name: Validate FSH Aliases
on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          fsh_directory: input/fsh
```

## Development

```bash
npm install
npm test
```

## Release

Tag with a `v` prefixed semver (e.g., `v0.2.0` or `v1.0.0`). The release workflow:
- runs the tests
- creates a GitHub release
- updates the major tag `v0` or `v1` to the new tag

## Notes
- Replace `OWNER` in the badges with your GitHub org/user name.
