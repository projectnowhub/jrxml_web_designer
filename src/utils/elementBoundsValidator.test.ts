import { describe, it, expect } from 'vitest'
import { getOutOfBoundsElements, validateElementBounds, isReportDesignValid, getReportDesignValidationErrors } from '@/utils/elementBoundsValidator'
import type { Band, ReportProperties, StaticTextElement } from '@/types'

describe('elementBoundsValidator', () => {
  const mockReportProperties: ReportProperties = {
    name: 'test',
    pageWidth: 595,
    pageHeight: 842,
    leftMargin: 20,
    rightMargin: 20,
    topMargin: 20,
    bottomMargin: 20,
    defaultFont: {
      name: 'Arial',
      size: 12,
      isBold: false,
      isItalic: false,
      isUnderline: false
    },
    orientation: 'portrait'
  }

  const mockStaticTextElement: StaticTextElement = {
    type: 'staticText',
    x: 20,
    y: 10,
    width: 100,
    height: 20,
    text: 'Test Text',
    fontFamily: 'Arial',
    fontSize: 12,
    isBold: false,
    isItalic: false,
    isUnderline: false
  }

  const mockBands: Band[] = [
    {
      type: 'title',
      height: 80,
      elements: [mockStaticTextElement]
    },
    {
      type: 'detail',
      height: 100,
      elements: [
        {
          ...mockStaticTextElement,
          x: 500,
          text: 'Out of bounds text'
        }
      ]
    }
  ]

  describe('validateElementBounds', () => {
    it('should return true for element within bounds', () => {
      const band = mockBands[0]
      const element = band?.elements[0]
      
      if (band && element) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).isOutOfBounds).toBe(false)
      }
    })

    it('should return false for element outside left margin', () => {
      // Element coordinates are relative to the band, so x=0 corresponds to the band's left boundary (i.e. the page's leftMargin position)
      // Therefore x=-10 is the case that exceeds the band's left boundary
      const element = { ...mockStaticTextElement, x: -10 }
      const band = mockBands[0]
      
      if (band) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).exceedsLeft).toBe(true)
      }
    })

    it('should return false for element outside right margin', () => {
      // Element coordinates are relative to the band; the available width is pageWidth - leftMargin - rightMargin = 595 - 20 - 20 = 555
      // So with x=500, width=100, the element's right edge is 600, which exceeds the available width of 555
      const element = { ...mockStaticTextElement, x: 500, width: 100 }
      const band = mockBands[0]
      
      if (band) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).exceedsRight).toBe(true)
      }
    })

    it('should return false for element outside top of band', () => {
      const element = { ...mockStaticTextElement, y: -10 }
      const band = mockBands[0]
      
      if (band) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).exceedsBandTop).toBe(true)
      }
    })

    it('should return false for element outside bottom of band', () => {
      const element = { ...mockStaticTextElement, y: 70, height: 20 }
      const band = mockBands[0]
      
      if (band) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).exceedsBandBottom).toBe(true)
      }
    })

    it('should return true for element in first band exceeding page top', () => {
      // An element in the first band exceeds the top of the page
      const element = { ...mockStaticTextElement, y: -30 } // A negative y coordinate within the band will exceed the top of the page
      const band = mockBands[0]
      
      if (band) {
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).exceedsTop).toBe(true)
        expect(validateElementBounds(element, band, 0, mockBands, mockReportProperties).isOutOfBounds).toBe(true)
      }
    })

    it('should return true for element in last band exceeding page bottom', () => {
      // An element in the last band exceeds the bottom of the page
      // First band height 80, second band height 100, total height 180
      // Page height 842, top/bottom margins 20 each, available height 802
      // The second band's element has y=750, height=50; its actual position is 80+750=830, bottom is 830+50=880, exceeding the page bottom boundary of 842-20=822
      const element = { ...mockStaticTextElement, y: 750, height: 50 }
      const band = mockBands[1] // Use the second band (the last one)
      
      if (band) {
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).exceedsBottom).toBe(true)
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).isOutOfBounds).toBe(true)
      }
    })
    
    it('should allow element in last band to touch page bottom', () => {
      // An element in the last band touches the bottom of the page but does not exceed it
      // First band height 80, second band height 100, total height 180
      // Page height 842, top/bottom margins 20 each, available height 802
      // The second band's element has y=672, height=50; its actual position is 80+672=752, bottom is 752+50=802, exactly touching the page bottom boundary of 842-20=822
      const element = { ...mockStaticTextElement, y: 672, height: 50 }
      const band = mockBands[1] // Use the second band (the last one)
      
      if (band) {
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).exceedsBottom).toBe(false)
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).exceedsBandBottom).toBe(false)
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).isOutOfBounds).toBe(false)
      }
    })
    
    it('should allow element in last band to exceed band height but not page bottom', () => {
      // An element in the last band exceeds the band's height but not the bottom of the page
      // First band height 80, second band height 100, total height 180
      // Page height 842, top/bottom margins 20 each, available height 802
      // The second band's element has y=100, height=602; its actual position is 80+100=180, bottom is 180+602=782, not exceeding the page bottom boundary of 842-20=822
      // However, the element's height 602 > band height 100, so it exceeds the band's bottom
      const element = { ...mockStaticTextElement, y: 100, height: 602 }
      const band = mockBands[1] // Use the second band (the last one)

      if (band) {
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).exceedsBottom).toBe(false)
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).exceedsBandBottom).toBe(false) // Should be false after the fix
        expect(validateElementBounds(element, band, 1, mockBands, mockReportProperties).isOutOfBounds).toBe(false)
      }
    })
  })

  describe('getOutOfBoundsElements', () => {
    it('should return empty array for all elements within bounds', () => {
      const validBands: Band[] = [
        {
          type: 'title',
          height: 80,
          elements: [mockStaticTextElement]
        }
      ]
      
      const result = getOutOfBoundsElements(validBands, mockReportProperties)
      expect(result).toHaveLength(0)
    })

    it('should return out of bounds elements', () => {
      const result = getOutOfBoundsElements(mockBands, mockReportProperties)
      expect(result).toHaveLength(1)
      if (result[0]) {
        expect(result[0].bandIndex).toBe(1)
        expect(result[0].elementIndex).toBe(0)
        expect(result[0].exceedsRight).toBe(true)
      }
    })

    it('should handle empty bands array', () => {
      const result = getOutOfBoundsElements([], mockReportProperties)
      expect(result).toHaveLength(0)
    })

    it('should handle bands with no elements', () => {
      const emptyBands: Band[] = [
        {
          type: 'title',
          height: 80,
          elements: []
        }
      ]
      
      const result = getOutOfBoundsElements(emptyBands, mockReportProperties)
      expect(result).toHaveLength(0)
    })
  })

  describe('isReportDesignValid', () => {
    it('should return true for valid report design', () => {
      const validBands: Band[] = [
        {
          type: 'title',
          height: 80,
          elements: [mockStaticTextElement]
        }
      ]
      
      const result = isReportDesignValid(validBands, mockReportProperties)
      expect(result).toBe(true)
    })

    it('should return false for invalid report design', () => {
      const result = isReportDesignValid(mockBands, mockReportProperties)
      expect(result).toBe(false)
    })

    it('should return true for empty bands array', () => {
      const result = isReportDesignValid([], mockReportProperties)
      expect(result).toBe(true)
    })
  })

  describe('getReportDesignValidationErrors', () => {
    it('should return empty array for valid report design', () => {
      const validBands: Band[] = [
        {
          type: 'title',
          height: 80,
          elements: [mockStaticTextElement]
        }
      ]
      
      const result = getReportDesignValidationErrors(validBands, mockReportProperties)
      expect(result).toHaveLength(0)
    })

    it('should return errors for invalid report design', () => {
      const result = getReportDesignValidationErrors(mockBands, mockReportProperties)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('exceeds the right boundary of the detail band')
    })

    it('should return error when total bands height exceeds page height', () => {
      // Create a bands array whose total height exceeds the page, with all elements within their valid range
      const tallBands: Band[] = [
        {
          type: 'title',
          height: 800,
          elements: [mockStaticTextElement]
        },
        {
          type: 'detail',
          height: 200,
          elements: [mockStaticTextElement]
        }
      ]
      
      const result = getReportDesignValidationErrors(tallBands, mockReportProperties)
      // There may be multiple errors; we only need to check whether one reports the total height overflow
      const hasTotalHeightError = result.some(error => error.includes('Invalid report design'))
      expect(hasTotalHeightError).toBe(true)
    })

    it('should return multiple errors for multiple invalid elements', () => {
      const invalidBands: Band[] = [
        {
          type: 'title',
          height: 80,
          elements: [
            {
              ...mockStaticTextElement,
              x: -10 // exceeds the left boundary
            },
            {
              ...mockStaticTextElement,
              x: 500, // exceeds the right boundary
              width: 100
            }
          ]
        }
      ]
      
      const result = getReportDesignValidationErrors(invalidBands, mockReportProperties)
      expect(result).toHaveLength(2)
    })
  })
})