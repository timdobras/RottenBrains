#!/bin/bash

# Script to help migrate console.log statements to logger utility
# Usage: ./scripts/migrate-to-logger.sh [--dry-run]

set -e

DRY_RUN=false

if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
  echo "🔍 Running in dry-run mode (no changes will be made)"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔄 Migrating console statements to logger utility..."
echo ""

# Find all TypeScript/TSX files (excluding node_modules, .next, etc.)
FILES=$(find app lib components hooks -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)

TOTAL_FILES=0
MODIFIED_FILES=0
TOTAL_REPLACEMENTS=0

for file in $FILES; do
  # Check if file contains console.log, console.error, console.warn
  if grep -q "console\.\(log\|error\|warn\|info\)" "$file"; then
    TOTAL_FILES=$((TOTAL_FILES + 1))

    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}Would modify:${NC} $file"
      grep -n "console\.\(log\|error\|warn\|info\)" "$file" | head -5
      echo ""
    else
      # Check if file already imports logger
      HAS_LOGGER_IMPORT=$(grep -c "from '@/lib/logger'" "$file" || true)

      # Count replacements
      COUNT=$(grep -c "console\.\(log\|error\|warn\|info\)" "$file" || true)

      if [ $COUNT -gt 0 ]; then
        echo -e "${GREEN}Modifying:${NC} $file (${COUNT} replacements)"

        # Add logger import if not present
        if [ $HAS_LOGGER_IMPORT -eq 0 ]; then
          # Find the last import statement line
          LAST_IMPORT=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

          if [ -n "$LAST_IMPORT" ]; then
            # Add logger import after last import
            sed -i "${LAST_IMPORT}a import { logger } from '@/lib/logger';" "$file"
          else
            # No imports found, add at top after 'use client' or 'use server' if present
            if grep -q "^['\"]use client['\"]" "$file"; then
              sed -i "/^['\"]use client['\"]/a import { logger } from '@/lib/logger';" "$file"
            elif grep -q "^['\"]use server['\"]" "$file"; then
              sed -i "/^['\"]use server['\"]/a import { logger } from '@/lib/logger';" "$file"
            else
              # Add at very top
              sed -i "1i import { logger } from '@/lib/logger';" "$file"
            fi
          fi
        fi

        # Replace console statements
        sed -i 's/console\.log/logger.debug/g' "$file"
        sed -i 's/console\.info/logger.info/g' "$file"
        sed -i 's/console\.warn/logger.warn/g' "$file"
        sed -i 's/console\.error/logger.error/g' "$file"

        MODIFIED_FILES=$((MODIFIED_FILES + 1))
        TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + COUNT))
      fi
    fi
  fi
done

echo ""
echo "================================"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
  echo "Files that would be modified: $TOTAL_FILES"
else
  echo -e "${GREEN}MIGRATION COMPLETE${NC}"
  echo "Files modified: $MODIFIED_FILES"
  echo "Total replacements: $TOTAL_REPLACEMENTS"
  echo ""
  echo "Next steps:"
  echo "1. Run: npm run type-check"
  echo "2. Run: npm run lint"
  echo "3. Test your application thoroughly"
  echo "4. Review changes with: git diff"
fi
echo "================================"
