#!/bin/bash

# Install missing shadcn/ui dependencies
echo "Installing missing shadcn/ui dependencies..."

# Install Radix UI components
bun add @radix-ui/react-checkbox
bun add @radix-ui/react-select  
bun add @radix-ui/react-navigation-menu
bun add @radix-ui/react-separator

# Install next-themes for dark mode support
bun add next-themes

echo "✅ All shadcn/ui dependencies installed successfully!"
echo ""
echo "🎨 Your Digital Signage app is now ready with:"
echo "   - Modern shadcn/ui components"
echo "   - Dark mode support"
echo "   - Consistent design system"
echo "   - Improved accessibility"
echo ""
echo "🚀 Run 'bun dev' to see the beautiful new interface!"
