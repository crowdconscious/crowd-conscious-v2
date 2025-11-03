/**
 * Script to import platform-owned modules
 * Run with: npx tsx scripts/import-platform-modules.ts
 */

import modulesData from './platform-modules-data.json'

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function importModules() {
  console.log('🚀 Starting platform modules import...\n')

  for (const module of modulesData.modules) {
    console.log(`📚 Importing: ${module.title}`)
    console.log(`   Lessons: ${module.lessons.length}`)
    console.log(`   Duration: ${module.estimatedHours} hours`)
    console.log(`   XP Reward: ${module.xpReward}`)

    try {
      const response = await fetch(`${API_URL}/api/admin/modules/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(module),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error(`   ❌ Error: ${error.error}`)
        console.error(`   Details: ${error.details}`)
        continue
      }

      const result = await response.json()
      console.log(`   ✅ Imported successfully!`)
      console.log(`   Module ID: ${result.module.id}`)
      console.log(`   Slug: ${result.module.slug}`)
      console.log(`   Lessons created: ${result.module.lessonCount}\n`)
    } catch (error) {
      console.error(`   ❌ Failed to import:`, error)
    }
  }

  console.log('✨ Import complete!')
}

// Run the import
importModules().catch(console.error)

