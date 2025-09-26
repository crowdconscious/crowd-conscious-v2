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

interface AchievementUnlockedProps {
  userName: string
  achievementTitle: string
  achievementDescription: string
  achievementIcon: string
  xpGained: number
  currentLevel: number
  nextAchievement?: {
    title: string
    description: string
    requiredXP: number
    currentProgress: number
  }
  badgeImageUrl?: string
}

export const AchievementUnlocked = ({ 
  userName,
  achievementTitle,
  achievementDescription,
  achievementIcon,
  xpGained,
  currentLevel,
  nextAchievement,
  badgeImageUrl
}: AchievementUnlockedProps) => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const title = `🎉 Achievement Unlocked: ${achievementTitle}!`
  const previewText = `Congratulations ${userName}! You've earned the ${achievementTitle} achievement and gained ${xpGained} XP`

  const nextProgress = nextAchievement 
    ? Math.min((nextAchievement.currentProgress / nextAchievement.requiredXP) * 100, 100)
    : 0

  return (
    <BaseEmailTemplate title={title} previewText={previewText}>
      {/* Confetti Header */}
      <Section style={{
        textAlign: 'center' as const,
        marginBottom: '30px',
        background: 'linear-gradient(135deg, #fef3c7, #fed7e2, #ddd6fe)',
        padding: '30px 20px',
        borderRadius: '16px',
        position: 'relative' as const
      }}>
        {/* Animated Confetti Effect */}
        <div style={{
          position: 'absolute' as const,
          top: '10px',
          left: '20px',
          fontSize: '20px',
          animation: 'bounce 2s infinite'
        }}>🎊</div>
        <div style={{
          position: 'absolute' as const,
          top: '15px',
          right: '30px',
          fontSize: '16px',
          animation: 'bounce 2s infinite 0.3s'
        }}>✨</div>
        <div style={{
          position: 'absolute' as const,
          bottom: '15px',
          left: '40px',
          fontSize: '18px',
          animation: 'bounce 2s infinite 0.6s'
        }}>🌟</div>
        <div style={{
          position: 'absolute' as const,
          bottom: '20px',
          right: '20px',
          fontSize: '14px',
          animation: 'bounce 2s infinite 0.9s'
        }}>🎉</div>

        <Heading style={{
          margin: '0 0 15px',
          fontSize: '32px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ACHIEVEMENT UNLOCKED!
        </Heading>
        
        <Text style={{
          margin: '0',
          fontSize: '18px',
          color: '#92400e',
          fontWeight: '600'
        }}>
          Congratulations, {userName}! 🎯
        </Text>
      </Section>

      {/* Achievement Badge */}
      <Section style={{
        backgroundColor: '#ffffff',
        border: '3px solid',
        borderImage: 'linear-gradient(135deg, #14b8a6, #8b5cf6) 1',
        borderRadius: '20px',
        padding: '40px 30px',
        textAlign: 'center' as const,
        marginBottom: '30px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Badge Icon/Image */}
        <div style={{
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 25px',
          fontSize: '64px',
          boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
        }}>
          {badgeImageUrl ? (
            <img 
              src={badgeImageUrl} 
              alt={achievementTitle}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%'
              }}
            />
          ) : (
            achievementIcon
          )}
        </div>

        <Heading style={{
          margin: '0 0 15px',
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          {achievementTitle}
        </Heading>
        
        <Text style={{
          margin: '0 0 25px',
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: '1.6',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {achievementDescription}
        </Text>

        {/* XP Gained */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '20px',
          display: 'inline-block',
          minWidth: '200px'
        }}>
          <Text style={{
            margin: '0 0 5px',
            fontSize: '14px',
            color: '#065f46',
            fontWeight: '500'
          }}>
            XP GAINED
          </Text>
          <Text style={{
            margin: '0',
            fontSize: '36px',
            fontWeight: '800',
            color: '#10b981'
          }}>
            +{xpGained}
          </Text>
        </div>
      </Section>

      {/* Current Level Status */}
      <Section style={{
        backgroundColor: '#f8fafc',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <Row>
          <Column style={{ width: '50%', textAlign: 'center' as const }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <Text style={{
                margin: '0 0 8px',
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                CURRENT LEVEL
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#14b8a6'
              }}>
                Level {currentLevel}
              </Text>
              <Text style={{
                margin: '5px 0 0',
                fontSize: '12px',
                color: '#8b5cf6',
                fontWeight: '500'
              }}>
                Changemaker
              </Text>
            </div>
          </Column>
          
          <Column style={{ width: '50%', textAlign: 'center' as const }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <Text style={{
                margin: '0 0 8px',
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                ACHIEVEMENTS
              </Text>
              <Text style={{
                margin: '0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#8b5cf6'
              }}>
                🏆 +1
              </Text>
              <Text style={{
                margin: '5px 0 0',
                fontSize: '12px',
                color: '#14b8a6',
                fontWeight: '500'
              }}>
                Badge Earned
              </Text>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Next Achievement Preview */}
      {nextAchievement && (
        <Section style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <Heading style={{
            margin: '0 0 20px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center' as const
          }}>
            🎯 Next Achievement Target
          </Heading>

          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <Text style={{
              margin: '0 0 8px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {nextAchievement.title}
            </Text>
            <Text style={{
              margin: '0 0 15px',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              {nextAchievement.description}
            </Text>

            {/* Progress Bar */}
            <Row style={{ marginBottom: '10px' }}>
              <Column>
                <Text style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Progress
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#14b8a6'
                }}>
                  {nextAchievement.currentProgress} / {nextAchievement.requiredXP} XP
                </Text>
              </Column>
            </Row>

            <div style={{
              backgroundColor: '#e5e7eb',
              height: '10px',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #14b8a6, #8b5cf6)',
                height: '100%',
                width: `${nextProgress}%`,
                borderRadius: '5px',
                transition: 'width 0.5s ease'
              }}></div>
            </div>

            <Text style={{
              margin: '10px 0 0',
              fontSize: '12px',
              color: '#8b5cf6',
              fontWeight: '500',
              textAlign: 'center' as const
            }}>
              {(100 - nextProgress).toFixed(1)}% to go!
            </Text>
          </div>
        </Section>
      )}

      {/* Social Sharing */}
      <Section style={{
        backgroundColor: '#f8fafc',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px',
        textAlign: 'center' as const
      }}>
        <Heading style={{
          margin: '0 0 15px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Share Your Achievement! 📱
        </Heading>
        
        <Text style={{
          margin: '0 0 20px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Let others know about your impact journey
        </Text>

        <Row>
          <Column style={{ textAlign: 'center' as const }}>
            <Link
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎉 Just unlocked the "${achievementTitle}" achievement on @CrowdConscious! Creating measurable impact together. #ImpactJourney #CommunityChange`)}&url=${encodeURIComponent(APP_URL)}`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#1da1f2',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 8px 8px'
              }}
            >
              🐦 Share on Twitter
            </Link>
            
            <Link
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(APP_URL)}`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#0077b5',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 8px 8px'
              }}
            >
              💼 Share on LinkedIn
            </Link>
          </Column>
        </Row>
      </Section>

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
          Keep Building Your Impact! 🚀
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
          View All Achievements
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
          Continue Journey
        </Button>
        
        <Text style={{
          margin: '20px 0 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          More achievements await! 🌟
        </Text>
      </Section>

      {/* CSS for Animations */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </BaseEmailTemplate>
  )
}
