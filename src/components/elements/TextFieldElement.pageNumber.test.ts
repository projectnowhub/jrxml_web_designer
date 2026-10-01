import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import TextFieldElement from './TextFieldElement.vue'
import { applyPaginationSettings, buildPaginationElement } from '@/utils/paginationPresets'

// The text field measures itself; the global test mock can't be constructed
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

vi.mock('naive-ui', () => ({
  NButton: (_: unknown, { slots }: { slots: { default?: () => unknown } }) =>
    h('button', slots.default?.()),
}))

// "Page 1 of N", first page skipped
const skipFirst = () => {
  const element = buildPaginationElement('bottomRight')
  applyPaginationSettings(element, { format: 'pageXofY', range: 'skipFirst' })
  return element
}

const render = (pageNumber: number, totalPages: number) =>
  mount(TextFieldElement, {
    props: {
      element: skipFirst(),
      bandIndex: 0,
      elementIndex: 0,
      selectedElement: null,
      editingElement: null,
      pageNumber,
      totalPages,
    },
  })

describe('TextFieldElement page number on the canvas', () => {
  it('is left out of skipped pages', () => {
    const wrapper = render(1, 3)
    expect((wrapper.element as HTMLElement).style.display).toBe('none')
  })

  it('counts from the first numbered page', () => {
    const wrapper = render(2, 3)
    expect((wrapper.element as HTMLElement).style.display).not.toBe('none')
    expect(wrapper.find('.page-number-text').text()).toBe('Page 1 of 2')
  })

  it('stays on page 1, faded, when no page of the design is numbered', () => {
    const wrapper = render(1, 1)
    expect((wrapper.element as HTMLElement).style.display).not.toBe('none')
    expect(wrapper.find('.text-content-display').classes()).toContain('is-off-range')
    expect(wrapper.find('.page-number-text').text()).toBe('Page 1 of 1')
  })
})
