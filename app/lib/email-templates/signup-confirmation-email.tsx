import React from 'react'
import {
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Button
} from '@react-email/components'
import { BaseEmailTemplate } from './base-template'

interface SignupConfirmationEmailProps {
  userName?: string
  confirmLink: string
}

/**
 * Signup Confirmation Email Template
 * 
 * Sent when a user signs up to confirm their email address
 * Matches the design pattern of other platform emails
 */
export const SignupConfirmationEmail = ({ 
  userName = 'there',
  confirmLink 
}: SignupConfirmationEmailProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const title = 'Confirm Your Email - Crowd Conscious'
  const previewText = 'Please confirm your email address to get started with Crowd Conscious'

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Welcome Message */}
      <Section>
        <Heading style={{
          margin: '0 0 20px',
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          Welcome to Crowd Conscious! 🌍
        </Heading>
        
        <Text style={{
          margin: '0 0 30px',
          fontSize: '16px',
          color: '#4b5563',
          textAlign: 'center' as const,
          lineHeight: '1.7'
        }}>
          Hi {userName}, we're excited to have you join our platform! 
          To get started, please confirm your email address by clicking the button below.
        </Text>
      </Section>

      {/* Confirmation Button - Prominent */}
      <Section style={{
        textAlign: 'center' as const,
        backgroundColor: '#f8fafc',
        padding: '40px 30px',
        borderRadius: '16px',
        margin: '0 0 40px',
        border: '2px solid #e5e7eb'
      }}>
        <Heading style={{
          margin: '0 0 20px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Confirm your email address
        </Heading>
        
        <Button
          href={confirmLink}
          style={{
            display: 'inline-block',
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
          }}
        >
          Confirm Email Address →
        </Button>
        
        <Text style={{
          margin: '20px 0 0',
          fontSize: '13px',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          This link will expire in 24 hours for your security.
        </Text>
      </Section>

      {/* What's Next Section */}
      <Section>
        <Heading style={{
          margin: '0 0 25px',
          fontSize: '22px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          What's waiting for you inside? ✨
        </Heading>

        <Row>
          <Column style={{ width: '100%' }}>
            {/* Feature Card 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <Row>
                <Column style={{ width: '60px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    🏘️
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 6px',
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Join Impact Communities
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.6'
                  }}>
                    Connect with local communities working on environmental and social impact projects
                  </Text>
                </Column>
              </Row>
            </div>

            {/* Feature Card 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <Row>
                <Column style={{ width: '60px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    📚
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 6px',
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Learn ESG & Sustainability
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.6'
                  }}>
                    Access expert-designed modules on clean air, water, zero waste, and more
                  </Text>
                </Column>
              </Row>
            </div>

            {/* Feature Card 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <Row>
                <Column style={{ width: '60px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    📊
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 6px',
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Track Your Impact
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.6'
                  }}>
                    Download professional ESG reports showing your environmental contribution
                  </Text>
                </Column>
              </Row>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Alternate Link (for accessibility) */}
      <Section style={{
        textAlign: 'center' as const,
        padding: '30px 20px',
        backgroundColor: '#fef3c7',
        borderRadius: '10px',
        border: '1px solid #fbbf24',
        margin: '30px 0 0'
      }}>
        <Text style={{
          margin: '0 0 10px',
          fontSize: '14px',
          color: '#92400e',
          fontWeight: '500'
        }}>
          Button not working?
        </Text>
        <Text style={{
          margin: '0',
          fontSize: '12px',
          color: '#78350f',
          lineHeight: '1.6'
        }}>
          Copy and paste this link into your browser:<br />
          <Link 
            href={confirmLink}
            style={{
              color: '#1f2937',
              textDecoration: 'underline',
              wordBreak: 'break-all' as const
            }}
          >
            {confirmLink}
          </Link>
        </Text>
      </Section>

      {/* Help Section */}
      <Section style={{
        textAlign: 'center' as const,
        margin: '40px 0 0'
      }}>
        <Text style={{
          margin: '0',
          fontSize: '13px',
          color: '#6b7280',
          lineHeight: '1.6'
        }}>
          Didn't create an account? You can safely ignore this email.<br />
          Questions? Reply to this email - we're here to help! 💬
        </Text>
      </Section>
    </BaseEmailTemplate>
  )
}

