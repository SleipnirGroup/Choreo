# Release Process

Let TAG be the new tag name (e.g., `v2025.0.0-beta-1`) and VERSION be the
version (e.g., `2025.0.0-beta-1`).

## Dependencies

* Python
* Git
* GitHub CLI

## Manual setup

```bash
git clone git@github.com:SleipnirGroup/Choreo
git clone git@github.com:SleipnirGroup/ChoreoLib
```

Update the vendordep JSON in ChoreoLib/dep.

1. Update the Choreo version keys to VERSION
2. Update the frcYear key if needed

## Choreo Release

```bash
pushd Choreo

# Bump versions
./update_version.py TAG

# Format .json files updated by update_version.py
pnpm run fmtJs

# Update Cargo.lock
cargo update -w

# Commit and push
git commit -a -m "Bump version to TAG"
git push

# Tag release
git tag TAG
git push origin TAG

popd
```

Wait for the Choreo release CI to complete before continuing.

## ChoreoLib Release

`[<run-id>]` in the following script should be the ChoreoLib workflow run ID
from the previous Choreo tag push.

```bash
pushd Choreo

# Download ChoreoLib maven artifacts
gh run download [<run-id>] -n ChoreoLib-Maven

# Place maven artifacts
cp -r maven/development/choreo/* ../ChoreoLib/dep/choreo
rm -r maven

popd
pushd ChoreoLib

# Commit and push
git commit -a -m "Add ChoreoLib VERSION"
git push

popd
```
