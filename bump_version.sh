#!/bin/bash

level="${1:-patch}"

case "$level" in
  patch|minor|major) ;;
  *)
    echo "Usage: $0 [patch|minor|major]" >&2
    exit 1
    ;;
esac

npm version "$level" -m "Bump version to %s" || exit $?
tag="v$(node -p "require('./package.json').version")"

echo "Would you like to push the tag? (y or n)"
read answer

if [ "$answer" == "y" ]; then
  git push origin "refs/tags/$tag"
fi
