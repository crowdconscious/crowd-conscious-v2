/** @type {import('next').NextConfig} */

const nextConfig = {
  // Environment variables for basic monitoring
  env: {
    MONITORING_ENABLED: process.env.MONITORING_ENABLED || 'true',
    PAGE_LOAD_THRESHOLD: process.env.PAGE_LOAD_THRESHOLD || '3000',
    API_RESPONSE_THRESHOLD: process.env.API_RESPONSE_THRESHOLD || '3000'
  },
  // Headers for basic monitoring
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Monitoring-Enabled',
            value: 'true'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
