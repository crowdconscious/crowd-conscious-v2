import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Hr,
  Img
} from '@react-email/components'

interface BaseEmailTemplateProps {
  children: React.ReactNode
  title: string
  previewText?: string
}

export const BaseEmailTemplate = ({ 
  children, 
  title, 
  previewText = "Crowd Conscious - Community Impact Platform" 
}: BaseEmailTemplateProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <Html>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .dark-mode-bg { background-color: #1f2937 !important; }
            .dark-mode-text { color: #f9fafb !important; }
            .dark-mode-card { background-color: #374151 !important; }
          }
          
          /* Mobile responsiveness */
          @media only screen and (max-width: 600px) {
            .mobile-hide { display: none !important; }
            .mobile-full { width: 100% !important; }
            .mobile-padding { padding: 20px !important; }
            .mobile-text-center { text-align: center !important; }
          }
        `}</style>
      </Head>
      <Body style={{
        margin: '0',
        padding: '0',
        backgroundColor: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: '1.6',
        color: '#1f2937'
      }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff'
        }}>
          {/* Header with Gradient */}
          <Section style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)',
            padding: '40px 20px',
            textAlign: 'center' as const,
            borderRadius: '10px 10px 0 0'
          }}>
            {/* Logo */}
            <Img
              src={`${APP_URL}/logo.png`}
              alt="Crowd Conscious Logo"
              width="60"
              height="60"
              style={{
                margin: '0 auto 20px',
                borderRadius: '12px'
              }}
            />
            <Heading style={{
              margin: '0',
              fontSize: '28px',
              fontWeight: '700',
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Crowd Conscious
            </Heading>
            <Text style={{
              margin: '8px 0 0',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '400'
            }}>
              Communities Creating Impact Together
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{
            padding: '40px 30px',
            backgroundColor: '#ffffff'
          }} className="mobile-padding">
            {children}
          </Section>

          {/* Footer */}
          <Section style={{
            padding: '30px 30px 40px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e5e7eb'
          }}>
            {/* Social Links */}
            <Row>
              <Column style={{ textAlign: 'center' as const }}>
                <Text style={{
                  margin: '0 0 20px',
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Follow our impact journey
                </Text>
                
                <Row style={{ marginBottom: '20px' }}>
                  <Column style={{ textAlign: 'center' as const }}>
                    <Link
                      href="#"
                      style={{
                        display: 'inline-block',
                        margin: '0 10px',
                        padding: '8px 12px',
                        backgroundColor: '#14b8a6',
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      Twitter
                    </Link>
                    <Link
                      href="#"
                      style={{
                        display: 'inline-block',
                        margin: '0 10px',
                        padding: '8px 12px',
                        backgroundColor: '#8b5cf6',
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      LinkedIn
                    </Link>
                    <Link
                      href="#"
                      style={{
                        display: 'inline-block',
                        margin: '0 10px',
                        padding: '8px 12px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      Facebook
                    </Link>
                  </Column>
                </Row>
              </Column>
            </Row>

            <Hr style={{
              border: 'none',
              borderTop: '1px solid #e5e7eb',
              margin: '20px 0'
            }} />

            {/* Footer Links */}
            <Row>
              <Column style={{ textAlign: 'center' as const }}>
                <Text style={{
                  margin: '0 0 10px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <Link href={`${APP_URL}/communities`} style={{ color: '#14b8a6', textDecoration: 'none', margin: '0 8px' }}>
                    Browse Communities
                  </Link>
                  •
                  <Link href={`${APP_URL}/brand/discover`} style={{ color: '#14b8a6', textDecoration: 'none', margin: '0 8px' }}>
                    Brand Partners
                  </Link>
                  •
                  <Link href={`${APP_URL}/about`} style={{ color: '#14b8a6', textDecoration: 'none', margin: '0 8px' }}>
                    About Us
                  </Link>
                </Text>

                <Text style={{
                  margin: '10px 0',
                  fontSize: '11px',
                  color: '#9ca3af',
                  lineHeight: '1.4'
                }}>
                  © 2024 Crowd Conscious. All rights reserved.<br />
                  Building communities, creating measurable impact.
                </Text>

                <Text style={{
                  margin: '15px 0 0',
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  <Link
                    href={`${APP_URL}/unsubscribe`}
                    style={{
                      color: '#6b7280',
                      textDecoration: 'underline'
                    }}
                  >
                    Unsubscribe
                  </Link>
                  {' • '}
                  <Link
                    href={`${APP_URL}/privacy`}
                    style={{
                      color: '#6b7280',
                      textDecoration: 'underline'
                    }}
                  >
                    Privacy Policy
                  </Link>
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>

        {/* Preview Text (hidden) */}
        <div style={{
          display: 'none',
          fontSize: '1px',
          color: '#ffffff',
          lineHeight: '1px',
          maxHeight: '0px',
          maxWidth: '0px',
          opacity: 0,
          overflow: 'hidden'
        }}>
          {previewText}
        </div>
      </Body>
    </Html>
  )
}
