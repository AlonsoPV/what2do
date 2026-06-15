import { describe, expect, it } from 'vitest'
import type { LearningModule } from '../types/academy.types'
import { allQuizAnswersCorrect, isMultipleChoiceQuestion } from './academyProgress'

const baseModule: LearningModule = {
  id: 1,
  title: 'Modulo',
  subtitle: 'Prueba',
  duration: '1 hora',
  pdfName: 'modulo.pdf',
  objectives: [],
  concepts: [],
  steps: [],
  exercise: '',
  deliverable: '',
  quiz: [],
}

describe('academy quiz progress', () => {
  it('keeps legacy single-answer questions compatible', () => {
    const module: LearningModule = {
      ...baseModule,
      quiz: [{ question: 'Legacy?', options: ['A', 'B', 'C'], correctIndex: 1 }],
    }

    expect(allQuizAnswersCorrect(module, [1])).toBe(true)
    expect(allQuizAnswersCorrect(module, [2])).toBe(false)
  })

  it('requires exact selected indexes for multiple-answer questions', () => {
    const module: LearningModule = {
      ...baseModule,
      quiz: [
        {
          question: 'Multiples?',
          type: 'multiple',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          correctIndexes: [0, 2],
        },
      ],
    }

    expect(isMultipleChoiceQuestion(module.quiz[0])).toBe(true)
    expect(allQuizAnswersCorrect(module, [[0, 2]])).toBe(true)
    expect(allQuizAnswersCorrect(module, [[2, 0]])).toBe(true)
    expect(allQuizAnswersCorrect(module, [[0]])).toBe(false)
    expect(allQuizAnswersCorrect(module, [[0, 1, 2]])).toBe(false)
  })
})
