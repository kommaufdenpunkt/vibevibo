#!/usr/bin/env node
// CLI: Test-Bild in die Moderation-Queue legen (zum Testen ohne echten Upload).
//
// Usage:
//   node scripts/add-test-image-to-queue.mjs <user_id> <image_url> [source_type]
//
// Beispiel:
//   node scripts/add-test-image-to-queue.mjs 7 "https://picsum.photos/seed/1/600/800" profile
//
// source_type: profile | buschfunk | feed | comment | album | avatar | other

import { enqueueImageForReview } from "../lib/imageModeration.js";

const [, , userIdRaw, imageUrl, sourceType = "other"] = process.argv;

if (!userIdRaw || !imageUrl) {
  console.error("Usage:");
  console.error("  node scripts/add-test-image-to-queue.mjs <user_id> <image_url> [source_type]");
  console.error("");
  console.error("Beispiele (Random-Bilder von picsum.photos):");
  console.error("  node scripts/add-test-image-to-queue.mjs 7 'https://picsum.photos/seed/test1/600/800' profile");
  console.error("  node scripts/add-test-image-to-queue.mjs 7 'https://picsum.photos/seed/test2/600/800' buschfunk");
  console.error("  node scripts/add-test-image-to-queue.mjs 7 'https://picsum.photos/seed/test3/600/800' feed");
  process.exit(1);
}

const userId = parseInt(userIdRaw, 10);
if (!Number.isInteger(userId) || userId <= 0) {
  console.error("❌ user_id muss positive Ganzzahl sein.");
  process.exit(1);
}

try {
  const queueId = enqueueImageForReview({
    imageUrl,
    uploadedByUserId: userId,
    sourceType,
  });
  console.log(`✅ Test-Bild in Queue gelegt: #${queueId}`);
  console.log(`   User-ID:     ${userId}`);
  console.log(`   Image-URL:   ${imageUrl}`);
  console.log(`   Source-Type: ${sourceType}`);
  console.log(`\n📍 Im MCP sichtbar unter: https://mcp.vibevibo.de/mcp/bilder`);
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
}
