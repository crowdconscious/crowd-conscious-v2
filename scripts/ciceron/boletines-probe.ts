/**
 * Read-only probe for one Cicerón bulletin registry row.
 *
 * Fetches robots.txt (once) and the landing page headers (once).
 * Prints HTTP status, content type, and any robots rule that applies
 * to the landing path. Does not download bulletins, submit forms,
 * log in, or touch captchas.
 *
 * Usage:
 *   npx tsx scripts/ciceron/boletines-probe.ts \
 *     --url https://example.gob.mx/listas \
 *     [--source-name "Label from REGISTRY.csv"]
 *
 * User-Agent includes a contact placeholder; replace before production use.
 */

const USER_AGENT =
  'CiceronBulletinProbe/0.1 (+contact: REPLACE_WITH_CONTACT@example.com; read-only registry probe; one request at a time)'

const TIMEOUT_MS = 25_000

type Args = {
  url: string
  sourceName: string | null
}

function parseArgs(argv: string[]): Args {
  let url: string | null = null
  let sourceName: string | null = null
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--url') {
      url = argv[++i] ?? null
    } else if (a === '--source-name') {
      sourceName = argv[++i] ?? null
    } else if (a === '--help' || a === '-h') {
      printHelpAndExit(0)
    }
  }
  if (!url) {
    console.error('Missing --url')
    printHelpAndExit(1)
  }
  try {
    new URL(url)
  } catch {
    console.error(`Invalid --url: ${url}`)
    process.exit(1)
  }
  return { url, sourceName }
}

function printHelpAndExit(code: number): never {
  console.log(`Usage: npx tsx scripts/ciceron/boletines-probe.ts --url <landing-url> [--source-name <label>]`)
  process.exit(code)
}

function robotsUrlFor(landing: URL): string {
  return `${landing.protocol}//${landing.host}/robots.txt`
}

/** Minimal robots.txt matcher for User-agent: * groups. */
function matchingRobotsRules(
  robotsBody: string,
  landingPath: string,
): string[] {
  const lines = robotsBody.split(/\r?\n/)
  const applicable: string[] = []
  let inStar = false
  let sawStar = false

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '').trim()
    if (!line) continue
    const ua = line.match(/^user-agent:\s*(.+)$/i)
    if (ua) {
      const agent = ua[1].trim()
      inStar = agent === '*'
      if (inStar) sawStar = true
      continue
    }
    if (!inStar) continue
    const rule = line.match(/^(allow|disallow):\s*(.*)$/i)
    if (!rule) continue
    const kind = rule[1].toLowerCase()
    const path = rule[2].trim()
    if (path === '') {
      // Disallow: with empty path means allow all — record it
      applicable.push(`${kind}: (empty)`)
      continue
    }
    if (landingPath.startsWith(path) || path === '/') {
      applicable.push(`${kind}: ${path}`)
    }
  }

  if (!sawStar) {
    return ['(no User-agent: * group found)']
  }
  if (applicable.length === 0) {
    return ['(no Allow/Disallow rule matched this path under User-agent: *)']
  }
  return applicable
}

async function fetchOnce(
  url: string,
): Promise<{ status: number; contentType: string | null; body: string; finalUrl: string; error: string | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,text/plain,*/*;q=0.8',
      },
    })
    const contentType = res.headers.get('content-type')
    // Cap body read — enough for robots.txt and a small HTML head check
    const buf = await res.arrayBuffer()
    const slice = buf.byteLength > 64_000 ? buf.slice(0, 64_000) : buf
    const body = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    return {
      status: res.status,
      contentType,
      body,
      finalUrl: res.url,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      status: 0,
      contentType: null,
      body: '',
      finalUrl: url,
      error: message,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function main(): Promise<void> {
  const { url, sourceName } = parseArgs(process.argv.slice(2))
  const landing = new URL(url)
  const robotsUrl = robotsUrlFor(landing)

  console.log('Cicerón bulletin probe (read-only)')
  console.log(`User-Agent: ${USER_AGENT}`)
  if (sourceName) console.log(`Source: ${sourceName}`)
  console.log(`Landing: ${landing.href}`)
  console.log(`Robots:  ${robotsUrl}`)
  console.log('---')

  const robots = await fetchOnce(robotsUrl)
  console.log('robots.txt')
  console.log(`  status:       ${robots.status || '(request failed)'}`)
  console.log(`  content-type: ${robots.contentType ?? '(none)'}`)
  console.log(`  final-url:    ${robots.finalUrl}`)
  if (robots.error) {
    console.log(`  error:        ${robots.error}`)
  } else if (robots.body) {
    const looksLikeRobots =
      /^user-agent:/im.test(robots.body) || /disallow:/im.test(robots.body)
    if (looksLikeRobots) {
      const rules = matchingRobotsRules(robots.body, landing.pathname || '/')
      console.log('  rules for landing path:')
      for (const rule of rules) console.log(`    - ${rule}`)
    } else {
      console.log(
        '  body does not look like robots.txt (no User-agent/Disallow lines in first 64 KiB)',
      )
    }
  } else if (robots.status) {
    console.log('  body skipped or empty')
  }

  // One request at a time: pause between robots and landing
  await new Promise((r) => setTimeout(r, 1000))

  const page = await fetchOnce(landing.href)
  console.log('landing')
  console.log(`  status:       ${page.status || '(request failed)'}`)
  console.log(`  content-type: ${page.contentType ?? '(none)'}`)
  console.log(`  final-url:    ${page.finalUrl}`)
  if (page.error) console.log(`  error:        ${page.error}`)
  if (page.body) {
    const title = page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (title) {
      const cleaned = title[1].replace(/\s+/g, ' ').trim().slice(0, 160)
      console.log(`  title:        ${cleaned}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
