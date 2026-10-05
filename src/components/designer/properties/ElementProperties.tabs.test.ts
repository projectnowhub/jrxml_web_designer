import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ElementProperties from './ElementProperties.vue'

// Naive UI reads ResizeObserver when it is imported; the global test mock can't be constructed
vi.hoisted(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const table = { type: 'table', uuid: 't', x: 0, y: 0, width: 300, height: 100, columns: [] }
const text = { type: 'textField', uuid: 'x', x: 0, y: 0, width: 100, height: 20, expression: '"Hello"' }
const bands = [{ type: 'detail', height: 200, elements: [table, text] }]

const mountOn = (elementIndex: number) =>
  mount(ElementProperties, {
    props: {
      selectedBandIndex: 0,
      selectedElement: { bandIndex: 0, elementIndex },
      bands,
      reportProperties: {},
    } as any,
  })

const activeTab = (wrapper: ReturnType<typeof mount>) => (wrapper.vm as any).activeTab as string

// The element tabs: Basic / (Table) / Style
describe('ElementProperties tabs', () => {
  it('opens Basic when the newly selected element has no such tab', async () => {
    const wrapper = mountOn(0)
    ;(wrapper.vm as any).activeTab = 'table'
    await flushPromises()
    expect(activeTab(wrapper)).toBe('table')

    await wrapper.setProps({ selectedElement: { bandIndex: 0, elementIndex: 1 } } as any)
    await flushPromises()
    expect(activeTab(wrapper)).toBe('basic')
  })

  it('keeps Style Settings open when moving to another element', async () => {
    const wrapper = mountOn(0)
    ;(wrapper.vm as any).activeTab = 'style'
    await wrapper.setProps({ selectedElement: { bandIndex: 0, elementIndex: 1 } } as any)
    await flushPromises()
    expect(activeTab(wrapper)).toBe('style')
  })
})
