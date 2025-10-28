import * as React from 'react'

interface AssessmentQuoteEmailProps {
  companyName: string
  contactName: string
  roi: {
    totalSavings: number
    breakdown: {
      energy: number
      water: number
      waste: number
      productivity: number
    }
  }
  modules: string[]
  pricing: {
    tier: string
    basePrice: number
    employeeLimit: number
  }
  proposalUrl: string
}

export const AssessmentQuoteEmail = ({
  companyName,
  contactName,
  roi,
  modules,
  pricing,
  proposalUrl,
}: AssessmentQuoteEmailProps) => {
  const moduleNames: Record<string, string> = {
    clean_air: '🌬️ Aire Limpio',
    clean_water: '💧 Agua Limpia',
    safe_cities: '🏙️ Ciudades Seguras',
    zero_waste: '♻️ Cero Residuos',
    fair_trade: '🤝 Comercio Justo',
    integration: '🎉 Integración & Impacto',
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 20px;
          }
          .roi-box {
            background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          .roi-title {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-bottom: 10px;
          }
          .roi-amount {
            color: #ffffff;
            font-size: 48px;
            font-weight: bold;
            margin: 0;
          }
          .roi-subtitle {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-top: 10px;
          }
          .breakdown {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 30px 0;
          }
          .breakdown-item {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
          }
          .breakdown-label {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .breakdown-value {
            color: #0f766e;
            font-size: 24px;
            font-weight: bold;
          }
          .modules {
            margin: 30px 0;
          }
          .module-item {
            background-color: #f0fdfa;
            border: 2px solid #99f6e4;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 10px;
          }
          .pricing-box {
            background-color: #faf5ff;
            border: 2px solid #e9d5ff;
            border-radius: 16px;
            padding: 25px;
            margin: 30px 0;
          }
          .pricing-tier {
            color: #7c3aed;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .pricing-amount {
            color: #581c87;
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 18px;
            margin: 20px 0;
          }
          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <div className="logo">Crowd Conscious</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '18px' }}>
              Concientizaciones
            </div>
          </div>

          <div className="content">
            <div className="greeting">
              ¡Hola {contactName}! 👋
            </div>

            <p style={{ fontSize: '16px', lineHeight: '1.8' }}>
              Gracias por completar la evaluación para <strong>{companyName}</strong>.
            </p>

            <p style={{ fontSize: '16px', lineHeight: '1.8' }}>
              Basado en tus respuestas, hemos creado un programa personalizado que puede generar un impacto significativo en tu empresa:
            </p>

            <div className="roi-box">
              <div className="roi-title">Ahorro Anual Proyectado</div>
              <div className="roi-amount">{formatMoney(roi.totalSavings)}</div>
              <div className="roi-subtitle">+ Beneficios intangibles en reputación y ESG</div>
            </div>

            <div className="breakdown">
              {roi.breakdown.energy > 0 && (
                <div className="breakdown-item">
                  <div className="breakdown-label">⚡ Energía</div>
                  <div className="breakdown-value">{formatMoney(roi.breakdown.energy)}</div>
                </div>
              )}
              {roi.breakdown.water > 0 && (
                <div className="breakdown-item">
                  <div className="breakdown-label">💧 Agua</div>
                  <div className="breakdown-value">{formatMoney(roi.breakdown.water)}</div>
                </div>
              )}
              {roi.breakdown.waste > 0 && (
                <div className="breakdown-item">
                  <div className="breakdown-label">🗑️ Residuos</div>
                  <div className="breakdown-value">{formatMoney(roi.breakdown.waste)}</div>
                </div>
              )}
              {roi.breakdown.productivity > 0 && (
                <div className="breakdown-item">
                  <div className="breakdown-label">😊 Productividad</div>
                  <div className="breakdown-value">{formatMoney(roi.breakdown.productivity)}</div>
                </div>
              )}
            </div>

            <h2 style={{ color: '#0f172a', fontSize: '22px', marginTop: '40px' }}>
              📚 Módulos Recomendados
            </h2>

            <div className="modules">
              {modules.map((moduleId) => (
                <div key={moduleId} className="module-item">
                  <strong>{moduleNames[moduleId]}</strong>
                </div>
              ))}
            </div>

            <div className="pricing-box">
              <div className="pricing-tier">Programa {pricing.tier}</div>
              <div className="pricing-amount">{formatMoney(pricing.basePrice)}</div>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                ✓ Hasta {pricing.employeeLimit} empleados<br />
                ✓ {modules.length} módulos incluidos<br />
                ✓ Dashboard de impacto en tiempo real<br />
                ✓ Certificación para empleados<br />
                ✓ Acceso a comunidad principal
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <a href={proposalUrl} className="cta-button">
                Ver Mi Propuesta Completa
              </a>
            </div>

            <div style={{ 
              backgroundColor: '#ecfdf5', 
              border: '2px solid #6ee7b7',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '30px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857', marginBottom: '10px' }}>
                🎁 ¡Prueba Gratis!
              </div>
              <p style={{ color: '#065f46', fontSize: '14px', margin: 0 }}>
                Accede al <strong>Módulo 1 completo sin costo</strong>. Sin tarjeta de crédito, sin compromiso.
              </p>
            </div>
          </div>

          <div className="footer">
            <p><strong>¿Tienes preguntas?</strong></p>
            <p>
              Responde a este email o contáctanos:<br />
              <a href="mailto:comunidad@crowdconscious.app" style={{ color: '#0f766e' }}>
                comunidad@crowdconscious.app
              </a>
            </p>
            <p style={{ marginTop: '20px', fontSize: '12px', color: #94a3b8' }}>
              © 2025 Crowd Conscious. Transformando empresas en fuerzas comunitarias.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

