'use client'

import { useState } from 'react'
import { Users, MessageSquare, Download, Save, Plus, Trash2, CheckCircle } from 'lucide-react'

interface Question {
  id: string
  category: 'safety' | 'infrastructure' | 'community' | 'needs' | 'other'
  question: string
  response: string
  priority: 'high' | 'medium' | 'low'
}

export default function CommunityInterviewGuide() {
  const [projectName, setProjectName] = useState('')
  const [intervieweeName, setIntervieweeName] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const predefinedQuestions: Omit<Question, 'id' | 'response' | 'priority'>[] = [
    { category: 'safety', question: '¿Cómo te sientes caminando por esta área durante el día?' },
    { category: 'safety', question: '¿Cómo te sientes caminando por esta área durante la noche?' },
    { category: 'safety', question: '¿Hay lugares específicos que evitas por razones de seguridad?' },
    { category: 'infrastructure', question: '¿Cómo calificarías la iluminación en esta área?' },
    { category: 'infrastructure', question: '¿Qué mejoras de infraestructura consideras más urgentes?' },
    { category: 'community', question: '¿Qué actividades comunitarias te gustaría ver aquí?' },
    { category: 'community', question: '¿Cómo mejorarías el sentido de comunidad en esta área?' },
    { category: 'needs', question: '¿Cuáles son las necesidades más importantes de esta comunidad?' },
    { category: 'needs', question: '¿Qué recursos faltan en esta área?' }
  ]

  const addQuestion = (question: Omit<Question, 'id'>) => {
    const newQuestion: Question = {
      ...question,
      id: Date.now().toString()
    }

    if (editingId) {
      setQuestions(questions.map(q => q.id === editingId ? newQuestion : q))
      setEditingId(null)
    } else {
      setQuestions([...questions, newQuestion])
    }
    setShowForm(false)
  }

  const addPredefinedQuestion = (predefined: Omit<Question, 'id' | 'response' | 'priority'>) => {
    const newQuestion: Question = {
      ...predefined,
      id: Date.now().toString(),
      response: '',
      priority: 'medium'
    }
    setQuestions([...questions, newQuestion])
  }

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const exportGuide = () => {
    const csv = [
      ['Guía: Entrevistas Comunitarias', projectName || 'Sin nombre'],
      ['Entrevistado', intervieweeName || 'Sin nombre'],
      ['Fecha', interviewDate || 'Sin fecha'],
      [],
      ['Categoría', 'Pregunta', 'Respuesta', 'Prioridad'],
      ...questions.map(q => [
        q.category === 'safety' ? 'Seguridad' :
        q.category === 'infrastructure' ? 'Infraestructura' :
        q.category === 'community' ? 'Comunidad' :
        q.category === 'needs' ? 'Necesidades' : 'Otros',
        q.question,
        q.response || 'Sin respuesta',
        q.priority === 'high' ? 'Alta' : q.priority === 'medium' ? 'Media' : 'Baja'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `guia-entrevistas-comunitarias-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Guía: Entrevistas Comunitarias</h2>
        <p className="text-slate-600">Guía para realizar entrevistas comunitarias efectivas</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Plan Seguridad Comunitaria"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Entrevistado</label>
          <input
            type="text"
            value={intervieweeName}
            onChange={(e) => setIntervieweeName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Nombre del entrevistado"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
          <input
            type="date"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {questions.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Preguntas Predefinidas</h3>
          <p className="text-sm text-blue-800 mb-4">Haz clic en cualquier pregunta para agregarla:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {predefinedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => addPredefinedQuestion(q)}
                className="text-left bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-sm text-slate-900">{q.question}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {q.category === 'safety' ? 'Seguridad' :
                   q.category === 'infrastructure' ? 'Infraestructura' :
                   q.category === 'community' ? 'Comunidad' :
                   q.category === 'needs' ? 'Necesidades' : 'Otros'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Preguntas ({questions.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Pregunta Personalizada
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay preguntas agregadas aún</p>
            <p className="text-sm">Agrega preguntas predefinidas o crea las tuyas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        question.category === 'safety' ? 'bg-red-100 text-red-700' :
                        question.category === 'infrastructure' ? 'bg-blue-100 text-blue-700' :
                        question.category === 'community' ? 'bg-green-100 text-green-700' :
                        question.category === 'needs' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {question.category === 'safety' ? 'Seguridad' :
                         question.category === 'infrastructure' ? 'Infraestructura' :
                         question.category === 'community' ? 'Comunidad' :
                         question.category === 'needs' ? 'Necesidades' : 'Otros'}
                      </span>
                      <span className="font-semibold text-slate-900">{question.question}</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Respuesta</label>
                      <textarea
                        value={question.response}
                        onChange={(e) => {
                          setQuestions(questions.map(q => 
                            q.id === question.id ? { ...q, response: e.target.value } : q
                          ))
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        rows={3}
                        placeholder="Escribe la respuesta aquí..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <select
                      value={question.priority}
                      onChange={(e) => {
                        setQuestions(questions.map(q => 
                          q.id === question.id ? { ...q, priority: e.target.value as Question['priority'] } : q
                        ))
                      }}
                      className="text-xs px-2 py-1 border border-slate-300 rounded"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                    <button
                      onClick={() => {
                        setEditingId(question.id)
                        setShowForm(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total Preguntas</div>
              <div className="text-2xl font-bold text-slate-900">{questions.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Con Respuesta</div>
              <div className="text-2xl font-bold text-green-600">
                {questions.filter(q => q.response.trim()).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Alta Prioridad</div>
              <div className="text-2xl font-bold text-red-600">
                {questions.filter(q => q.priority === 'high').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Por Categoría</div>
              <div className="text-sm text-slate-700">
                Seguridad: {questions.filter(q => q.category === 'safety').length} | 
                Infra: {questions.filter(q => q.category === 'infrastructure').length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportGuide}
          disabled={questions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Guía
        </button>
        <button
          onClick={() => {
            console.log('Saving community interview guide...', { projectName, intervieweeName, interviewDate, questions })
          }}
          disabled={questions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <QuestionFormModal
          question={editingId ? questions.find(q => q.id === editingId) : undefined}
          onSave={addQuestion}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function QuestionFormModal({ question, onSave, onCancel }: {
  question?: Question
  onSave: (question: Omit<Question, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (question?.category || 'safety') as Question['category'],
    question: question?.question || '',
    response: question?.response || '',
    priority: (question?.priority || 'medium') as Question['priority']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{question ? 'Editar' : 'Agregar'} Pregunta</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Question['category'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="safety">Seguridad</option>
              <option value="infrastructure">Infraestructura</option>
              <option value="community">Comunidad</option>
              <option value="needs">Necesidades</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pregunta</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              placeholder="Escribe la pregunta..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Question['priority'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {question ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

