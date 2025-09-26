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

interface MonthlyImpactReportProps {
  userName: string
  month: string
  year: number
  stats: {
    communitiesJoined: number
    xpEarned: number
    contentCreated: number
    votesCount: number
    impactContributed: number
    currentLevel: number
    leaderboardPosition: number
    achievementsEarned: string[]
  }
  upcomingEvents: Array<{
    title: string
    community: string
    date: string
  }>
  monthlyProgress: Array<{
    week: string
    funding: number
  }>
}

export const MonthlyImpactReport = ({ 
  userName,
  month,
  year,
  stats,
  upcomingEvents = [],
  monthlyProgress = []
}: MonthlyImpactReportProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const title = `Your ${month} ${year} Impact Report`
  const previewText = `${userName}, here's your monthly impact summary: ${stats.xpEarned} XP earned, ${stats.contentCreated} content created`

  const maxFunding = Math.max(...monthlyProgress.map(p => p.funding), 1)

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Header */}
      <Section style={{ textAlign: 'center' as const, marginBottom: '30px' }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '28px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Your {month} Impact Report 📊
        </Heading>
        
        <Text style={{
          margin: '0',
          fontSize: '16px',
          color: '#6b7280'
        }}>
          Hi {userName}! Here's how you made a difference this month.
        </Text>
      </Section>

      {/* Stats Grid */}
      <Section style={{ marginBottom: '40px' }}>
        <Heading style={{
          margin: '0 0 20px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center' as const
        }}>
          Monthly Highlights ✨
        </Heading>

        <Row>
          <Column style={{ width: '50%', paddingRight: '8px' }}>
            <div style={{
              backgroundColor: '#f0fdfa',
              border: '1px solid #14b8a6',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center' as const,
              marginBottom: '16px'
            }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '32px',
                fontWeight: '700',
                color: '#14b8a6'
              }}>
                {stats.xpEarned}
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#064e3b',
                fontWeight: '500'
              }}>
                XP Earned
              </Text>
            </div>
          </Column>
          
          <Column style={{ width: '50%', paddingLeft: '8px' }}>
            <div style={{
              backgroundColor: '#faf5ff',
              border: '1px solid #8b5cf6',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center' as const,
              marginBottom: '16px'
            }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '32px',
                fontWeight: '700',
                color: '#8b5cf6'
              }}>
                {stats.communitiesJoined}
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#581c87',
                fontWeight: '500'
              }}>
                Communities
              </Text>
            </div>
          </Column>
        </Row>

        <Row>
          <Column style={{ width: '50%', paddingRight: '8px' }}>
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center' as const,
              marginBottom: '16px'
            }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '32px',
                fontWeight: '700',
                color: '#3b82f6'
              }}>
                {stats.contentCreated}
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#1e3a8a',
                fontWeight: '500'
              }}>
                Content Created
              </Text>
            </div>
          </Column>
          
          <Column style={{ width: '50%', paddingLeft: '8px' }}>
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center' as const,
              marginBottom: '16px'
            }}>
              <Text style={{
                margin: '0 0 5px',
                fontSize: '24px',
                fontWeight: '700',
                color: '#10b981'
              }}>
                ${stats.impactContributed}
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#064e3b',
                fontWeight: '500'
              }}>
                Impact Value
              </Text>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Level & Leaderboard */}
      <Section style={{
        backgroundColor: '#f8fafc',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <Row>
          <Column style={{ width: '50%' }}>
            <Text style={{
              margin: '0 0 10px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              🏆 Current Level
            </Text>
            <Text style={{
              margin: '0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#14b8a6'
            }}>
              Level {stats.currentLevel} Changemaker
            </Text>
          </Column>
          <Column style={{ width: '50%' }}>
            <Text style={{
              margin: '0 0 10px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📈 Leaderboard Rank
            </Text>
            <Text style={{
              margin: '0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#8b5cf6'
            }}>
              #{stats.leaderboardPosition}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Progress Chart */}
      {monthlyProgress.length > 0 && (
        <Section style={{ marginBottom: '40px' }}>
          <Heading style={{
            margin: '0 0 20px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center' as const
          }}>
            Monthly Funding Progress 📈
          </Heading>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px'
          }}>
            {monthlyProgress.map((week, index) => (
              <Row key={index} style={{ marginBottom: '12px' }}>
                <Column style={{ width: '20%' }}>
                  <Text style={{
                    margin: '0',
                    fontSize: '12px',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {week.week}
                  </Text>
                </Column>
                <Column style={{ width: '60%' }}>
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    height: '20px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    position: 'relative' as const
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #14b8a6, #8b5cf6)',
                      height: '100%',
                      width: `${(week.funding / maxFunding) * 100}%`,
                      borderRadius: '10px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </Column>
                <Column style={{ width: '20%', textAlign: 'right' as const }}>
                  <Text style={{
                    margin: '0',
                    fontSize: '12px',
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    ${week.funding}
                  </Text>
                </Column>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {/* Achievements */}
      {stats.achievementsEarned.length > 0 && (
        <Section style={{ marginBottom: '40px' }}>
          <Heading style={{
            margin: '0 0 20px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center' as const
          }}>
            Achievements Unlocked 🏅
          </Heading>

          <Row>
            <Column>
              {stats.achievementsEarned.map((achievement, index) => (
                <div key={index} style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '20px', marginRight: '12px' }}>🏆</span>
                  <Text style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#92400e',
                    fontWeight: '500'
                  }}>
                    {achievement}
                  </Text>
                </div>
              ))}
            </Column>
          </Row>
        </Section>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Section style={{ marginBottom: '40px' }}>
          <Heading style={{
            margin: '0 0 20px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center' as const
          }}>
            Upcoming in Your Communities 📅
          </Heading>

          {upcomingEvents.slice(0, 3).map((event, index) => (
            <div key={index} style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <Text style={{
                margin: '0 0 4px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {event.title}
              </Text>
              <Text style={{
                margin: '0 0 4px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                📍 {event.community}
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '14px',
                color: '#8b5cf6',
                fontWeight: '500'
              }}>
                🗓️ {event.date}
              </Text>
            </div>
          ))}
        </Section>
      )}

      {/* Call to Action */}
      <Section style={{
        textAlign: 'center' as const,
        backgroundColor: '#f8fafc',
        padding: '30px 20px',
        borderRadius: '12px'
      }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Keep the momentum going! 🚀
        </Heading>
        
        <Button
          href={`${APP_URL}/dashboard`}
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
            cursor: 'pointer',
            marginRight: '12px'
          }}
        >
          View Full Report
        </Button>

        <Button
          href={`${APP_URL}/communities`}
          style={{
            display: 'inline-block',
            padding: '12px 30px',
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
          Explore Communities
        </Button>
        
        <Text style={{
          margin: '20px 0 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Share your impact story with others! 💬
        </Text>
      </Section>
    </BaseEmailTemplate>
  )
}
