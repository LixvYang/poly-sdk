#!/bin/bash
# NPM Package Publishing Script

set -e  # Exit on error

echo "📦 Publishing @lixvyang/poly-sdk to npm..."
echo ""

# 1. Check if on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️  Warning: You are not on the main branch (current: $BRANCH)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
  git status -s
  exit 1
fi

# 3. Pull latest changes
echo "🔄 Pulling latest changes..."
git pull origin $BRANCH

# 4. Run tests
echo "🧪 Running tests..."
pnpm test

# 5. Ask for version type
echo ""
echo "Current version: $(node -p "require('./package.json').version")"
echo ""
echo "Select version bump type:"
echo "1) patch (0.3.2 -> 0.3.3) - Bug fixes"
echo "2) minor (0.3.2 -> 0.4.0) - New features (backward compatible)"
echo "3) major (0.3.2 -> 1.0.0) - Breaking changes"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
  1)
    VERSION_TYPE="patch"
    ;;
  2)
    VERSION_TYPE="minor"
    ;;
  3)
    VERSION_TYPE="major"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

# 6. Bump version
echo ""
echo "📝 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE -m "chore: bump version to %s"

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# 7. Build
echo ""
echo "🔨 Building project..."
pnpm run build

# 8. Check if logged in to npm
echo ""
echo "🔐 Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ Not logged in to npm. Please run: npm login"
  exit 1
fi

# 9. Publish
echo ""
echo "🚀 Publishing to npm..."
npm publish

# 10. Push to git
echo ""
echo "📤 Pushing to git..."
git push && git push --tags

echo ""
echo "✅ Successfully published @lixvyang/poly-sdk@$NEW_VERSION to npm!"
echo ""
echo "📋 Next steps:"
echo "  - Check npm: https://www.npmjs.com/package/@lixvyang/poly-sdk"
echo "  - Update changelog if needed"
echo "  - Announce the release"
echo ""
