#!/bin/bash
# Setup script to install git hooks
# Run this once on any machine to enable auto-deploy on git pull

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$ROOT_DIR/.git/hooks"

echo "Setting up git hooks..."

# Create the post-merge hook
cat > "$HOOKS_DIR/post-merge" << 'EOF'
#!/bin/bash
# Git post-merge hook - runs automatically after git pull
# Triggers the post-deploy script to rebuild and restart services

echo ""
echo "Git pull detected - running post-deploy..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Run the post-deploy script
"$ROOT_DIR/scripts/post-deploy.sh"
EOF

# Make both scripts executable
chmod +x "$HOOKS_DIR/post-merge"
chmod +x "$SCRIPT_DIR/post-deploy.sh"

echo "Done! Git hooks installed successfully."
echo ""
echo "The post-deploy script will now run automatically after every 'git pull'."
echo ""
echo "You can also run it manually with:"
echo "  ./scripts/post-deploy.sh"
