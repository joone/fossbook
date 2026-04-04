param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Level = "patch"
)

npm version $Level -m "Bump version to %s"

$answer = Read-Host "Would you like to push the tag? (y or n)"
if ($answer -eq "y") {
  git push --tags
}
