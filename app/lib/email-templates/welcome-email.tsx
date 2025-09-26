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

interface WelcomeEmailProps {
  userName: string
  userType?: 'user' | 'brand'
  initialXP?: number
}

export const WelcomeEmail = ({ 
  userName, 
  userType = 'user',
  initialXP = 25 
}: WelcomeEmailProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const isBrand = userType === 'brand'
  const title = isBrand ? `Welcome ${userName} to Crowd Conscious!` : `Welcome to Crowd Conscious, ${userName}!`
  const previewText = isBrand 
    ? "Discover meaningful sponsorship opportunities and create measurable impact"
    : "Join communities, create content, and track your impact journey"

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Welcome Message */}
      <Section>
        <Heading style={{
          margin: '0 0 20px',
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          {isBrand ? `Welcome aboard, ${userName}! 🏢` : `Welcome to the movement, ${userName}! 🌱`}
        </Heading>
        
        <Text style={{
          margin: '0 0 30px',
          fontSize: '16px',
          color: '#4b5563',
          textAlign: 'center' as const,
          lineHeight: '1.6'
        }}>
          {isBrand 
            ? "You're now ready to discover meaningful community needs to sponsor and create measurable social impact."
            : "You've joined a community-driven platform where local groups organize around environmental and social impact. Let's get started!"
          }
        </Text>
      </Section>

      {!isBrand && (
        /* XP Progress Bar for Users */
        <Section style={{
          backgroundColor: '#f8fafc',
          padding: '20px',
          borderRadius: '12px',
          margin: '0 0 30px'
        }}>
          <Text style={{
            margin: '0 0 10px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#6b7280',
            textAlign: 'center' as const
          }}>
            Your Impact Journey Starts Now
          </Text>
          
          <Row>
            <Column style={{ textAlign: 'center' as const }}>
              <div style={{
                background: 'linear-gradient(90deg, #14b8a6, #8b5cf6)',
                height: '8px',
                borderRadius: '4px',
                margin: '0 0 10px',
                position: 'relative' as const
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #10b981, #7c3aed)',
                  height: '100%',
                  width: '25%',
                  borderRadius: '4px',
                  position: 'relative' as const
                }}></div>
              </div>
              
              <Text style={{
                margin: '0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#14b8a6'
              }}>
                🎯 {initialXP} XP Earned • Level 1 Changemaker
              </Text>
            </Column>
          </Row>
        </Section>
      )}

      {/* Action Cards */}
      <Section>
        <Heading style={{
          margin: '0 0 25px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          {isBrand ? "Ready to Make an Impact?" : "Here's how to get started:"}
        </Heading>

        <Row>
          <Column style={{ width: '100%' }}>
            {/* Action Card 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <Row>
                <Column style={{ width: '80px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {isBrand ? '🎯' : '🏘️'}
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {isBrand ? 'Discover Opportunities' : 'Browse Communities'}
                  </Heading>
                  <Text style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {isBrand 
                      ? 'Find community needs that align with your brand values and create meaningful partnerships.'
                      : 'Explore local communities working on environmental and social impact projects near you.'
                    }
                  </Text>
                  <Link
                    href={isBrand ? `${APP_URL}/brand/discover` : `${APP_URL}/communities`}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {isBrand ? 'Browse Needs' : 'Explore Communities'}
                  </Link>
                </Column>
              </Row>
            </div>

            {/* Action Card 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <Row>
                <Column style={{ width: '80px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {isBrand ? '💰' : '✨'}
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {isBrand ? 'Start Sponsoring' : 'Create Content'}
                  </Heading>
                  <Text style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {isBrand 
                      ? 'Apply to sponsor community needs and receive impact reports showing your contribution.'
                      : 'Share needs, organize events, create polls, and engage with your community members.'
                    }
                  </Text>
                  <Link
                    href={isBrand ? `${APP_URL}/brand/dashboard` : `${APP_URL}/dashboard`}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {isBrand ? 'View Dashboard' : 'Get Started'}
                  </Link>
                </Column>
              </Row>
            </div>

            {/* Action Card 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <Row>
                <Column style={{ width: '80px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    borderRadius: '12px',
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
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Track Your Impact
                  </Heading>
                  <Text style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {isBrand 
                      ? 'Monitor the real-world impact of your sponsorships with detailed analytics and community feedback.'
                      : 'See how your contributions create measurable change in your community and beyond.'
                    }
                  </Text>
                  <Link
                    href={`${APP_URL}/dashboard`}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    View Impact
                  </Link>
                </Column>
              </Row>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Call to Action */}
      <Section style={{
        textAlign: 'center' as const,
        backgroundColor: '#f8fafc',
        padding: '30px 20px',
        borderRadius: '12px',
        margin: '30px 0 0'
      }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Ready to create impact? 🚀
        </Heading>
        
        <Button
          href={isBrand ? `${APP_URL}/brand/discover` : `${APP_URL}/communities`}
          style={{
            display: 'inline-block',
            padding: '12px 30px',
            background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isBrand ? 'Start Sponsoring' : 'Join a Community'}
        </Button>
        
        <Text style={{
          margin: '15px 0 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Questions? Reply to this email - we're here to help! 💬
        </Text>
      </Section>
    </BaseEmailTemplate>
  )
}
