/**
 * Migration script to convert existing display-widget relationships to layout-based system
 *
 * This script:
 * 1. Finds displays with existing widgets
 * 2. Creates layout templates from their widget configurations
 * 3. Updates displays to reference the new layouts
 * 4. Preserves all existing data
 */

import mongoose from "mongoose";
import dbConnect from "../lib/mongodb";
import Display from "../lib/models/Display";
import Widget from "../lib/models/Widget";
import Layout from "../lib/models/Layout";

interface MigrationResult {
  displaysProcessed: number;
  layoutsCreated: number;
  errors: string[];
}

export async function migrateDisplayLayouts(): Promise<MigrationResult> {
  const result: MigrationResult = {
    displaysProcessed: 0,
    layoutsCreated: 0,
    errors: [],
  };

  try {
    await dbConnect();

    // Find all displays that have widgets but no layout reference (ObjectId)
    const displaysToMigrate = await Display.find({
      widgets: { $exists: true, $ne: [] },
      $or: [
        { layout: { $type: "string" } }, // Legacy string layouts
        { layout: { $exists: false } },
      ],
    }).populate("widgets");

    console.log(`Found ${displaysToMigrate.length} displays to migrate`);

    for (const display of displaysToMigrate) {
      try {
        // Skip if display has no widgets
        if (!display.widgets || display.widgets.length === 0) {
          continue;
        }

        // Create a layout from this display's configuration
        const layoutName = `${display.name} Layout`;
        const layoutDescription = `Auto-generated layout from display: ${display.name}`;

        // Map widgets to layout widget format
        const layoutWidgets = display.widgets.map((widget: any) => ({
          widget_id: widget._id,
          x: widget.x || 0,
          y: widget.y || 0,
          w: widget.w || 1,
          h: widget.h || 1,
        }));

        // Create the layout
        const layout = new Layout({
          name: layoutName,
          description: layoutDescription,
          orientation: display.orientation || "landscape",
          layoutType: display.layout === "spaced" ? "spaced" : "compact",
          widgets: layoutWidgets,
          statusBar: {
            enabled: true,
            elements: display.statusBar?.elements || [],
          },
          isActive: true,
          isTemplate: false, // Not a template, specific to this display
          creator_id: display.creator_id,
          gridConfig: {
            cols: display.orientation === "portrait" ? 9 : 16,
            rows: display.orientation === "portrait" ? 16 : 9,
            margin: display.layout === "spaced" ? [12, 12] : [6, 6],
            rowHeight: display.orientation === "portrait" ? 40 : 60,
          },
        });

        await layout.save();

        // Update display to reference the new layout
        display.layout = layout._id;
        await display.save();

        result.layoutsCreated++;
        result.displaysProcessed++;

        console.log(
          `Migrated display: ${display.name} -> Layout: ${layout.name}`
        );
      } catch (error: unknown) {
        const errorMsg = `Failed to migrate display ${display.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log("Migration completed:", result);
    return result;
  } catch (error: unknown) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
    return result;
  }
}

// Create default layout templates for common use cases
export async function createDefaultLayoutTemplates(): Promise<void> {
  try {
    await dbConnect();

    // Find a user to assign as creator (use first admin user)
    const adminUser = await mongoose.connection.db
      .collection("users")
      .findOne({ role: "admin" });
    if (!adminUser) {
      console.log("No admin user found, skipping default template creation");
      return;
    }

    const defaultTemplates = [
      {
        name: "Corporate Dashboard",
        description: "Standard corporate information display",
        orientation: "landscape" as const,
        layoutType: "spaced" as const,
        widgets: [], // Will be populated after widget creation
        statusBar: {
          enabled: true,
          elements: ["clock", "date"],
        },
        isActive: true,
        isTemplate: true,
        creator_id: adminUser._id,
        gridConfig: {
          cols: 16,
          rows: 9,
          margin: [12, 12],
          rowHeight: 60,
        },
      },
      {
        name: "Meeting Room Display",
        description: "Portrait display for meeting room information",
        orientation: "portrait" as const,
        layoutType: "compact" as const,
        widgets: [], // Will be populated after widget creation
        statusBar: {
          enabled: true,
          elements: ["clock"],
        },
        isActive: true,
        isTemplate: true,
        creator_id: adminUser._id,
        gridConfig: {
          cols: 9,
          rows: 16,
          margin: [6, 6],
          rowHeight: 40,
        },
      },
    ];

    for (const template of defaultTemplates) {
      // Check if template already exists
      const existing = await Layout.findOne({ name: template.name });
      if (!existing) {
        const layout = new Layout(template);
        await layout.save();
        console.log(`Created default template: ${template.name}`);
      }
    }
  } catch (error: unknown) {
    console.error("Failed to create default templates:", error instanceof Error ? error.message : 'Unknown error');
  }
}

// Rollback function in case migration needs to be reversed
export async function rollbackMigration(): Promise<void> {
  try {
    await dbConnect();

    console.log(
      "WARNING: This will delete all auto-generated layouts and revert displays to string layouts"
    );
    console.log("This action cannot be undone. Make sure you have a backup.");

    // Find all layouts that were auto-generated (not templates)
    const autoGeneratedLayouts = await Layout.find({
      isTemplate: false,
      name: { $regex: /Layout$/ }, // Ends with "Layout"
    });

    console.log(
      `Found ${autoGeneratedLayouts.length} auto-generated layouts to remove`
    );

    for (const layout of autoGeneratedLayouts) {
      // Find displays using this layout
      const displays = await Display.find({ layout: layout._id });

      // Revert displays to string layout
      for (const display of displays) {
        display.layout = layout.layoutType; // 'spaced' or 'compact'
        await display.save();
        console.log(`Reverted display: ${display.name}`);
      }

      // Delete the layout
      await Layout.findByIdAndDelete(layout._id);
      console.log(`Deleted layout: ${layout.name}`);
    }

    console.log("Rollback completed");
  } catch (error: unknown) {
    console.error("Rollback failed:", error instanceof Error ? error.message : 'Unknown error');
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "migrate":
      migrateDisplayLayouts().then(() => process.exit(0));
      break;
    case "create-templates":
      createDefaultLayoutTemplates().then(() => process.exit(0));
      break;
    case "rollback":
      rollbackMigration().then(() => process.exit(0));
      break;
    default:
      console.log(
        "Usage: ts-node scripts/migrate-display-layouts.ts [migrate|create-templates|rollback]"
      );
      process.exit(1);
  }
}
