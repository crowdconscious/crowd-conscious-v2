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

interface SponsorshipNotificationProps {
  brandName: string
  needTitle: string
  communityName: string
  fundingGoal: number
  currentFunding: number
  description: string
  deadline?: string
  communityImage?: string
  sponsorshipId: string
  isApproval?: boolean
}

export const SponsorshipNotification = ({ 
  brandName,
  needTitle,
  communityName,
  fundingGoal,
  currentFunding,
  description,
  deadline,
  sponsorshipId,
  isApproval = false
}: SponsorshipNotificationProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const progressPercentage = Math.min((currentFunding / fundingGoal) * 100, 100)
  const remainingAmount = Math.max(fundingGoal - currentFunding, 0)
  
  const title = isApproval 
    ? `Sponsorship Approved - Payment Required`
    : `New Sponsorship Opportunity: ${needTitle}`
  
  const previewText = isApproval
    ? `Your sponsorship of ${needTitle} has been approved by ${communityName}. Complete payment to finalize.`
    : `${communityName} community needs support: ${needTitle} - $${remainingAmount.toLocaleString()} remaining`

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Alert Header */}
      <Section style={{
        backgroundColor: isApproval ? '#f0fdf4' : '#fef3c7',
        border: `2px solid ${isApproval ? '#10b981' : '#f59e0b'}`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center' as const,
        marginBottom: '30px'
      }}>
        <Text style={{
          margin: '0 0 10px',
          fontSize: '36px'
        }}>
          {isApproval ? '🎉' : '🚨'}
        </Text>
        
        <Heading style={{
          margin: '0 0 10px',
          fontSize: '24px',
          fontWeight: '700',
          color: isApproval ? '#065f46' : '#92400e'
        }}>
          {isApproval ? 'Sponsorship Approved!' : 'New Opportunity Alert!'}
        </Heading>
        
        <Text style={{
          margin: '0',
          fontSize: '16px',
          color: isApproval ? '#047857' : '#a16207',
          fontWeight: '500'
        }}>
          {isApproval 
            ? `${communityName} has approved your sponsorship application`
            : `A new sponsorship opportunity matches your brand values`
          }
        </Text>
      </Section>

      {/* Community Card */}
      <Section style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '0',
        marginBottom: '30px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Community Header */}
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          padding: '20px',
          color: '#ffffff'
        }}>
          <Row>
            <Column>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                fontWeight: '500'
              }}>
                Community
              </Text>
              <Heading style={{
                margin: '0 0 10px',
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff'
              }}>
                {communityName}
              </Heading>
              <Text style={{
                margin: '0',
                fontSize: '16px',
                color: 'rgba(255,255,255,0.95)',
                fontWeight: '500'
              }}>
                Funding Need: {needTitle}
              </Text>
            </Column>
          </Row>
        </div>

        {/* Need Details */}
        <div style={{ padding: '25px' }}>
          <Text style={{
            margin: '0 0 20px',
            fontSize: '15px',
            color: '#4b5563',
            lineHeight: '1.6'
          }}>
            {description}
          </Text>

          {/* Funding Progress */}
          <div style={{ marginBottom: '25px' }}>
            <Row style={{ marginBottom: '10px' }}>
              <Column>
                <Text style={{
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Funding Progress
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#14b8a6'
                }}>
                  ${currentFunding.toLocaleString()} / ${fundingGoal.toLocaleString()}
                </Text>
              </Column>
            </Row>

            <div style={{
              backgroundColor: '#f3f4f6',
              height: '12px',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #14b8a6, #10b981)',
                height: '100%',
                width: `${progressPercentage}%`,
                borderRadius: '6px',
                transition: 'width 0.5s ease'
              }}></div>
            </div>

            <Row>
              <Column>
                <Text style={{
                  margin: '0',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {progressPercentage.toFixed(1)}% funded
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: remainingAmount > 0 ? '#dc2626' : '#059669'
                }}>
                  {remainingAmount > 0 
                    ? `$${remainingAmount.toLocaleString()} remaining`
                    : 'Fully funded!'
                  }
                </Text>
              </Column>
            </Row>
          </div>

          {/* Urgency Indicator */}
          {deadline && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px'
            }}>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#dc2626',
                fontWeight: '500'
              }}>
                ⏰ Deadline: {deadline}
              </Text>
            </div>
          )}

          {/* Impact Preview */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <Text style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#065f46'
            }}>
              🌟 Potential Impact
            </Text>
            <Text style={{
              margin: '0',
              fontSize: '14px',
              color: '#047857',
              lineHeight: '1.5'
            }}>
              Your sponsorship will directly support community initiatives and create measurable environmental and social impact. Receive detailed impact reports upon completion.
            </Text>
          </div>
        </div>
      </Section>

      {/* Platform Fee Notice */}
      <Section style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '30px'
      }}>
        <Text style={{
          margin: '0 0 8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#475569'
        }}>
          💡 Transparent Pricing
        </Text>
        <Text style={{
          margin: '0',
          fontSize: '14px',
          color: '#64748b',
          lineHeight: '1.5'
        }}>
          Platform fee: 15% • Community receives: 85% • Full payment transparency and impact tracking included
        </Text>
      </Section>

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center' as const }}>
        {isApproval ? (
          <>
            <Heading style={{
              margin: '0 0 20px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Complete Your Sponsorship 💳
            </Heading>
            
            <Button
              href={`${APP_URL}/brand/payment/${sponsorshipId}`}
              style={{
                display: 'inline-block',
                padding: '14px 35px',
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              Complete Payment
            </Button>
            
            <Text style={{
              margin: '0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Secure payment powered by Stripe
            </Text>
          </>
        ) : (
          <>
            <Heading style={{
              margin: '0 0 20px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Ready to make an impact? 🚀
            </Heading>
            
            <div style={{ marginBottom: '15px' }}>
              <Button
                href={`${APP_URL}/brand/discover`}
                style={{
                  display: 'inline-block',
                  padding: '14px 35px',
                  background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: '12px'
                }}
              >
                Apply to Sponsor
              </Button>

              <Button
                href={`${APP_URL}/communities/${communityName.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  display: 'inline-block',
                  padding: '14px 35px',
                  backgroundColor: '#ffffff',
                  color: '#14b8a6',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: '2px solid #14b8a6',
                  cursor: 'pointer'
                }}
              >
                Learn More
              </Button>
            </div>
            
            <Text style={{
              margin: '0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Applications reviewed within 24-48 hours
            </Text>
          </>
        )}
      </Section>

      {/* Benefits */}
      <Section style={{
        backgroundColor: '#f8fafc',
        padding: '25px',
        borderRadius: '12px',
        marginTop: '30px'
      }}>
        <Heading style={{
          margin: '0 0 20px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          What You Get as a Sponsor 🎁
        </Heading>

        <Row>
          <Column style={{ width: '50%', paddingRight: '10px' }}>
            <div style={{ marginBottom: '15px' }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#14b8a6'
              }}>
                📊 Impact Reports
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                Detailed analytics on your contribution's real-world impact
              </Text>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#8b5cf6'
              }}>
                🏆 Brand Recognition
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                Community appreciation and sponsor badge
              </Text>
            </div>
          </Column>
          
          <Column style={{ width: '50%', paddingLeft: '10px' }}>
            <div style={{ marginBottom: '15px' }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#3b82f6'
              }}>
                💬 Community Access
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                Direct engagement with community members
              </Text>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#10b981'
              }}>
                📸 Content Rights
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                Use impact stories in your marketing
              </Text>
            </div>
          </Column>
        </Row>
      </Section>
    </BaseEmailTemplate>
  )
}
