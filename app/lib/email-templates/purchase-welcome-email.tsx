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

interface PurchaseWelcomeEmailProps {
  userName: string
  moduleName: string
  moduleDescription?: string
  coreValue?: string
  lessonCount?: number
  estimatedHours?: number
  moduleUrl: string
  certificatePreview?: boolean
}

/**
 * Purchase Welcome Email Template
 * 
 * Sent immediately after a user purchases a module
 * Includes module intro, first lesson preview, and tips
 */
export const PurchaseWelcomeEmail = ({ 
  userName,
  moduleName,
  moduleDescription = 'A comprehensive learning journey designed by ESG experts.',
  coreValue = 'sustainability',
  lessonCount = 5,
  estimatedHours = 3,
  moduleUrl,
  certificatePreview = true
}: PurchaseWelcomeEmailProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const title = `Welcome to ${moduleName}!`
  const previewText = `Your learning journey begins now - ${moduleName}`

  // Map core values to emojis and colors
  const coreValueMap: Record<string, { emoji: string; color: string; name: string }> = {
    'clean_air': { emoji: '🌬️', color: '#10b981', name: 'Clean Air' },
    'clean_water': { emoji: '💧', color: '#3b82f6', name: 'Clean Water' },
    'zero_waste': { emoji: '♻️', color: '#f59e0b', name: 'Zero Waste' },
    'safe_cities': { emoji: '🏙️', color: '#8b5cf6', name: 'Safe Cities' },
    'fair_trade': { emoji: '🤝', color: '#ec4899', name: 'Fair Trade' },
    'impact_integration': { emoji: '📊', color: '#14b8a6', name: 'Impact Integration' }
  }

  const coreValueInfo = coreValueMap[coreValue] || { emoji: '🌱', color: '#14b8a6', name: 'Sustainability' }

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Celebration Header */}
      <Section style={{
        textAlign: 'center' as const,
        backgroundColor: '#f0fdf4',
        padding: '30px 20px',
        borderRadius: '16px',
        border: '2px solid #bbf7d0',
        margin: '0 0 30px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
        <Heading style={{
          margin: '0 0 10px',
          fontSize: '26px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          ¡Bienvenido a tu nuevo módulo!
        </Heading>
        <Text style={{
          margin: '0',
          fontSize: '16px',
          color: '#16a34a',
          fontWeight: '600'
        }}>
          Your learning journey starts now, {userName}!
        </Text>
      </Section>

      {/* Module Info Card */}
      <Section style={{
        backgroundColor: '#ffffff',
        border: '2px solid #e5e7eb',
        borderRadius: '16px',
        padding: '30px',
        margin: '0 0 30px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <Row>
          <Column style={{ width: '80px', verticalAlign: 'top' }}>
            <div style={{
              width: '70px',
              height: '70px',
              background: `linear-gradient(135deg, ${coreValueInfo.color}, ${coreValueInfo.color}dd)`,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              {coreValueInfo.emoji}
            </div>
          </Column>
          <Column style={{ verticalAlign: 'top', paddingLeft: '20px' }}>
            <Text style={{
              margin: '0 0 8px',
              fontSize: '13px',
              color: coreValueInfo.color,
              fontWeight: '600',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px'
            }}>
              {coreValueInfo.name}
            </Text>
            <Heading style={{
              margin: '0 0 10px',
              fontSize: '22px',
              fontWeight: '700',
              color: '#1f2937',
              lineHeight: '1.3'
            }}>
              {moduleName}
            </Heading>
            <Text style={{
              margin: '0 0 15px',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              {moduleDescription}
            </Text>
            <Row>
              <Column>
                <Text style={{
                  margin: '0',
                  fontSize: '13px',
                  color: '#9ca3af'
                }}>
                  📚 <span style={{ fontWeight: '600', color: '#4b5563' }}>{lessonCount} lessons</span> • 
                  ⏱️ <span style={{ fontWeight: '600', color: '#4b5563' }}>{estimatedHours} hours</span> • 
                  🏆 <span style={{ fontWeight: '600', color: '#4b5563' }}>Certificate</span>
                </Text>
              </Column>
            </Row>
          </Column>
        </Row>
      </Section>

      {/* CTA Button - Start Learning */}
      <Section style={{
        textAlign: 'center' as const,
        margin: '0 0 40px'
      }}>
        <Button
          href={moduleUrl}
          style={{
            display: 'inline-block',
            padding: '16px 40px',
            background: `linear-gradient(135deg, ${coreValueInfo.color}, #8b5cf6)`,
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 4px 12px ${coreValueInfo.color}40`
          }}
        >
          Start Learning Now →
        </Button>
        <Text style={{
          margin: '15px 0 0',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Access your module anytime from your dashboard
        </Text>
      </Section>

      {/* What to Expect */}
      <Section>
        <Heading style={{
          margin: '0 0 25px',
          fontSize: '22px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          What to Expect 📖
        </Heading>

        <Row>
          <Column style={{ width: '100%' }}>
            {/* Expect Card 1 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '12px'
            }}>
              <Row>
                <Column style={{ width: '50px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    📝
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 4px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Interactive Lessons
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    Engage with quizzes, reflections, and practical activities designed by ESG experts
                  </Text>
                </Column>
              </Row>
            </div>

            {/* Expect Card 2 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '12px'
            }}>
              <Row>
                <Column style={{ width: '50px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    🛠️
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 4px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Practical Tools
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    Use calculators, assessments, and planning tools to apply concepts immediately
                  </Text>
                </Column>
              </Row>
            </div>

            {/* Expect Card 3 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '12px'
            }}>
              <Row>
                <Column style={{ width: '50px', verticalAlign: 'top' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    📊
                  </div>
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Heading style={{
                    margin: '0 0 4px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    ESG Impact Reports
                  </Heading>
                  <Text style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    Track your environmental impact and download professional ESG reports
                  </Text>
                </Column>
              </Row>
            </div>

            {certificatePreview && (
              /* Expect Card 4 */
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '12px'
              }}>
                <Row>
                  <Column style={{ width: '50px', verticalAlign: 'top' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      🏆
                    </div>
                  </Column>
                  <Column style={{ verticalAlign: 'top' }}>
                    <Heading style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      Professional Certificate
                    </Heading>
                    <Text style={{
                      margin: '0',
                      fontSize: '13px',
                      color: '#78350f',
                      lineHeight: '1.5'
                    }}>
                      Complete all lessons to earn a verified certificate you can share on LinkedIn
                    </Text>
                  </Column>
                </Row>
              </div>
            )}
          </Column>
        </Row>
      </Section>

      {/* Pro Tips Section */}
      <Section style={{
        backgroundColor: '#eff6ff',
        border: '2px solid #93c5fd',
        borderRadius: '16px',
        padding: '25px',
        margin: '30px 0'
      }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e40af'
        }}>
          💡 Pro Tips for Success
        </Heading>
        <Text style={{
          margin: '0 0 8px',
          fontSize: '14px',
          color: '#1e3a8a',
          lineHeight: '1.7'
        }}>
          <strong>✅ Set aside focused time:</strong> Complete lessons without distractions for better learning<br />
          <strong>✅ Engage with activities:</strong> Thoughtful responses lead to better ESG reports<br />
          <strong>✅ Track your progress:</strong> Visit your impact dashboard to see your environmental contribution<br />
          <strong>✅ Share your certificate:</strong> Show your ESG expertise to employers and colleagues
        </Text>
      </Section>

      {/* Footer CTA */}
      <Section style={{
        textAlign: 'center' as const,
        padding: '30px 20px',
        margin: '30px 0 0'
      }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Ready to Begin? 🚀
        </Heading>
        <Button
          href={moduleUrl}
          style={{
            display: 'inline-block',
            padding: '14px 35px',
            background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Go to Module
        </Button>
        <Text style={{
          margin: '20px 0 0',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Need help? Reply to this email - our team is here to support you! 💬
        </Text>
      </Section>
    </BaseEmailTemplate>
  )
}

