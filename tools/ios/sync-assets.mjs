import fs from 'node:fs'
import path from 'node:path'

const srcDir = path.resolve('dist/web')
const destDir = path.resolve('ios/SWKBayut/public')

if (!fs.existsSync(srcDir)) {
  console.error('Error: dist/web does not exist. Run npm run build:web first.')
  process.exit(1)
}

fs.rmSync(destDir, { recursive: true, force: true })
fs.mkdirSync(destDir, { recursive: true })
fs.cpSync(srcDir, destDir, { recursive: true })

console.log(`Synced built web assets from ${srcDir} to ${destDir} for SWKBayut iOS app (ae.swkproperties.bayut).`)
