import { describe, it, expect } from 'vitest'
import { generateJRXMLContent } from '@/utils/jrxmlGenerator'
import { parseJRXMLContent } from '@/utils/jrxml/parse'
import type { Band, ReportProperties, TextFieldElement } from '@/types'
import { getPropertyCornerRadii, propertyCornerRadiusCss, setPropertyCornerRadii } from '@/utils/elementUtils'
import {
  applyPaginationSettings,
  buildPageNumberExpression,
  buildPageRangeExpression,
  buildPaginationElement,
  detectPagination,
  findPaginationTargetBand,
  formatPageNumber,
  getPaginationSettings,
  isPageInRange,
  isPagination,
  placePaginationInBand,
  PAGINATION_FORMATS,
  PAGINATION_PROPERTY,
  showsTotalPages,
} from './paginationPresets'

const report: ReportProperties = {
  name: 'Pagination',
  pageWidth: 595,
  pageHeight: 842,
  leftMargin: 20,
  rightMargin: 20,
  topMargin: 20,
  bottomMargin: 20,
  orientation: 'portrait',
} as ReportProperties

const roundTrip = (element: TextFieldElement): TextFieldElement => {
  const bands: Band[] = [{ type: 'pageFooter', height: 40, elements: [element] } as Band]
  const parsed = parseJRXMLContent(generateJRXMLContent(report, bands, [], []))
  const footer = parsed.bands.find((b) => b.type === 'pageFooter')
  return footer!.elements[0] as TextFieldElement
}

describe('paginationPresets', () => {
  it('builds a page number text field, "Page 1" on every page by default', () => {
    const el = buildPaginationElement('bottomRight', { fontFamily: 'Arial', fontSize: 12 })
    expect(el.type).toBe('textField')
    expect(isPagination(el)).toBe(true)
    expect(el.textAlignment).toBe('Right')
    expect(el.expression).toBe('"Page " + $V{PAGE_NUMBER}')
    expect(el.printWhenExpression).toBe('')
    expect(getPaginationSettings(el)).toMatchObject({ format: 'prefixed', range: 'all' })
    // Dragged in (no position): centred text
    expect(buildPaginationElement().textAlignment).toBe('Center')
  })

  it('labels the formats with N for the total', () => {
    expect(PAGINATION_FORMATS.map((f) => f.sample(1, 'N'))).toEqual(['1', 'Page 1', 'Page 1 of N', '1 / N'])
    expect(showsTotalPages({ format: 'prefixed', range: 'all' })).toBe(false)
    expect(showsTotalPages({ format: 'slash', range: 'all' })).toBe(true)
  })

  it('writes the expression and evaluation time for each format', () => {
    const el = buildPaginationElement('topRight')
    applyPaginationSettings(el, { format: 'prefixed', range: 'all' })
    expect(el.expression).toBe('"Page " + $V{PAGE_NUMBER}')
    expect(el.evaluationTime).toBe('Now')

    applyPaginationSettings(el, { format: 'pageXofY', range: 'all' })
    expect(el.expression).toContain('$V{MASTER_TOTAL_PAGES}')
    expect(el.evaluationTime).toBe('Master')

    applyPaginationSettings(el, { format: 'slash', range: 'all' })
    expect(el.expression).toBe('$V{MASTER_CURRENT_PAGE} + " / " + $V{MASTER_TOTAL_PAGES}')
  })

  it('turns page ranges into printWhenExpressions', () => {
    expect(buildPageRangeExpression({ format: 'simple', range: 'all' })).toBe('')
    expect(buildPageRangeExpression({ format: 'simple', range: 'skipFirst' })).toBe('$V{PAGE_NUMBER} > 1')
    expect(buildPageRangeExpression({ format: 'simple', range: 'skipFirstTwo' })).toBe('$V{PAGE_NUMBER} > 2')
    expect(buildPageRangeExpression({ format: 'simple', range: 'custom', from: 2, to: 5 })).toBe(
      '($V{PAGE_NUMBER} >= 2) && ($V{PAGE_NUMBER} <= 5)',
    )
    expect(buildPageRangeExpression({ format: 'simple', range: 'custom', from: 3 })).toBe('$V{PAGE_NUMBER} >= 3')
    expect(buildPageRangeExpression({ format: 'simple', range: 'custom', to: 4 })).toBe('$V{PAGE_NUMBER} <= 4')
  })

  it('counts from 1 on the first numbered page', () => {
    // Skip first page: page 2 prints "1", totals leave page 1 out
    expect(buildPageNumberExpression({ format: 'prefixed', range: 'skipFirst' })).toBe('"Page " + ($V{PAGE_NUMBER} - 1)')
    expect(buildPageNumberExpression({ format: 'pageXofY', range: 'skipFirstTwo' })).toBe(
      '"Page " + ($V{MASTER_CURRENT_PAGE} - 2) + " of " + ($V{MASTER_TOTAL_PAGES} - 2)',
    )
    // Custom range: numbered from its "From" page, total ends at its "To" page
    expect(buildPageNumberExpression({ format: 'slash', range: 'custom', from: 2, to: 5 })).toBe(
      '($V{MASTER_CURRENT_PAGE} - 1) + " / " + (Math.min(5, $V{MASTER_TOTAL_PAGES}) - 1)',
    )
    expect(buildPageNumberExpression({ format: 'simple', range: 'custom', to: 3 })).toBe('"" + $V{PAGE_NUMBER}')
  })

  it('previews the number and range per canvas page', () => {
    const skipFirst = { format: 'pageXofY' as const, range: 'skipFirst' as const }
    expect(formatPageNumber(skipFirst, 1, 4)).toBeNull()
    expect(formatPageNumber(skipFirst, 2, 4)).toBe('Page 1 of 3')
    expect(formatPageNumber(skipFirst, 4, 4)).toBe('Page 3 of 3')

    const custom = { format: 'slash' as const, range: 'custom' as const, from: 2, to: 3 }
    expect(formatPageNumber(custom, 1, 5)).toBeNull()
    expect(formatPageNumber(custom, 2, 5)).toBe('1 / 2')
    expect(formatPageNumber(custom, 3, 5)).toBe('2 / 2')
    expect(formatPageNumber(custom, 4, 5)).toBeNull()

    expect(formatPageNumber({ format: 'slash', range: 'all' }, 1, 3)).toBe('1 / 3')
    expect(isPageInRange({ format: 'simple', range: 'skipFirstTwo' }, 2)).toBe(false)
    expect(isPageInRange({ format: 'simple', range: 'skipFirstTwo' }, 3)).toBe(true)
  })
  it('finds the preset band, falling back when header or footer is missing', () => {
    const bands = [{ type: 'background' }, { type: 'title' }, { type: 'detail' }, { type: 'summary' }]
    expect(findPaginationTargetBand(bands, 'topRight')).toBe(1)
    expect(findPaginationTargetBand(bands, 'bottomRight')).toBe(3)
    const full = [{ type: 'pageHeader' }, { type: 'detail' }, { type: 'pageFooter' }]
    expect(findPaginationTargetBand(full, 'topRight')).toBe(0)
    expect(findPaginationTargetBand(full, 'bottomCenter')).toBe(2)
    expect(findPaginationTargetBand([], 'bottomCenter')).toBe(-1)
  })

  it('places presets right-aligned or centred in the band', () => {
    const size = { width: 120, height: 20 }
    expect(placePaginationInBand(size, 'bottomRight', 555, 40)).toEqual({ x: 435, y: 10 })
    expect(placePaginationInBand(size, 'bottomCenter', 555, 40)).toEqual({ x: 218, y: 10 })
  })

  it('round-trips format and page range through JRXML', () => {
    const el = buildPaginationElement('bottomRight')
    applyPaginationSettings(el, { format: 'pageXofY', range: 'custom', from: 2, to: 5 })
    el.forecolor = '#FF0000'

    const jrxml = generateJRXMLContent(report, [{ type: 'pageFooter', height: 40, elements: [el] } as Band], [], [])
    expect(jrxml).toContain(`<property name="${PAGINATION_PROPERTY}" value="true"/>`)
    expect(jrxml).toContain('evaluationTime="Master"')
    expect(jrxml).toContain('<printWhenExpression><![CDATA[($V{PAGE_NUMBER} >= 2) && ($V{PAGE_NUMBER} <= 5)]]></printWhenExpression>')
    expect(jrxml).toContain('($V{MASTER_CURRENT_PAGE} - 1)')

    const back = roundTrip(el)
    expect(isPagination(back)).toBe(true)
    expect(getPaginationSettings(back)).toEqual({ format: 'pageXofY', range: 'custom', from: 2, to: 5 })
    expect(back.expression).toBe(el.expression)
    expect(back.evaluationTime).toBe('Master')
    expect(back.printWhenExpression).toBe(el.printWhenExpression)
    expect(back.textAlignment).toBe('Right')
    expect(back.forecolor).toBe('#FF0000')
  })

  it('keeps a per-corner radius through JRXML', () => {
    const el = buildPaginationElement('bottomRight')
    setPropertyCornerRadii(el, { topLeft: 8, topRight: 0, bottomRight: 8, bottomLeft: 0 })
    expect(propertyCornerRadiusCss(el)).toBe('8px 0px 8px 0px')

    const back = roundTrip(el)
    expect(getPropertyCornerRadii(back)).toEqual({ topLeft: 8, topRight: 0, bottomRight: 8, bottomLeft: 0 })
    expect(isPagination(back)).toBe(true)
  })

  it('recognises a page number written without the designer properties', () => {
    const plain = {
      type: 'textField',
      x: 0, y: 0, width: 100, height: 20,
      expression: '"Page " + ($V{PAGE_NUMBER} - 1)',
      printWhenExpression: '$V{PAGE_NUMBER} > 1',
    } as TextFieldElement
    expect(detectPagination(plain)).toBe(true)
    expect(getPaginationSettings(plain)).toMatchObject({ format: 'prefixed', range: 'skipFirst' })

    // Hidden on page 1 but still counting from it: not one of ours, left alone
    const hiddenOnFirst = {
      type: 'textField', x: 0, y: 0, width: 100, height: 20,
      expression: '"Page " + $V{PAGE_NUMBER}', printWhenExpression: '$V{PAGE_NUMBER} > 1',
    } as TextFieldElement
    expect(detectPagination(hiddenOnFirst)).toBe(false)

    // Total pages (evaluated at report end) is not a page number of this page
    const total = {
      type: 'textField', x: 0, y: 0, width: 100, height: 20,
      expression: '$V{PAGE_NUMBER}', evaluationTime: 'Report',
    } as TextFieldElement
    expect(detectPagination(total)).toBe(false)

    // An unrelated condition is kept as is
    const conditional = {
      type: 'textField', x: 0, y: 0, width: 100, height: 20,
      expression: '$V{PAGE_NUMBER}', printWhenExpression: '$F{show}',
    } as TextFieldElement
    expect(detectPagination(conditional)).toBe(false)
    expect(conditional.properties).toBeUndefined()
  })
})
