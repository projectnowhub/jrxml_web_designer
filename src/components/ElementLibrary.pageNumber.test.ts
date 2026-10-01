import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import ElementLibrary from './ElementLibrary.vue'

vi.mock('naive-ui', () => ({
  NButton: (_: unknown, { slots }: { slots: { default?: () => unknown } }) =>
    h('button', slots.default?.()),
}))

// The Page Number tile asks where to put the number instead of inserting it
describe('ElementLibrary Page Number tile', () => {
  let wrapper: VueWrapper | null = null

  const mountLibrary = () =>
    mount(ElementLibrary, {
      attachTo: document.body,
      props: {
        elements: [
          { type: 'textField', name: 'elementNames.textField' },
          { type: 'pageNumber', name: 'elementNames.pageNumber' },
        ],
        reportStyles: [],
        bands: [],
        selectedElement: null,
      },
    })

  const pageNumberTile = (w: VueWrapper) =>
    w.findAll('.element-item').find((tile) => tile.text().includes('elementNames.pageNumber'))!

  const menu = () => document.body.querySelector('.page-number-menu')

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('opens a popover with the three positions on click', async () => {
    wrapper = mountLibrary()
    expect(menu()).toBeNull()

    await pageNumberTile(wrapper).trigger('click')

    const options = Array.from(document.body.querySelectorAll('.page-number-option'))
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'pagination.positions.topRight',
      'pagination.positions.bottomRight',
      'pagination.positions.bottomCenter',
    ])
  })

  it('emits the chosen position and closes', async () => {
    wrapper = mountLibrary()
    await pageNumberTile(wrapper).trigger('click')

    ;(document.body.querySelectorAll('.page-number-option')[2] as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('insert-page-number')).toEqual([['bottomCenter']])
    expect(wrapper.emitted('element-double-click')).toBeUndefined()
    expect(menu()).toBeNull()
  })

  it('closes on Escape or a click elsewhere', async () => {
    wrapper = mountLibrary()
    await pageNumberTile(wrapper).trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(menu()).toBeNull()

    await pageNumberTile(wrapper).trigger('dblclick')
    expect(menu()).not.toBeNull()
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(menu()).toBeNull()
    expect(wrapper.emitted('insert-page-number')).toBeUndefined()
  })

  it('still inserts other tiles on double-click', async () => {
    wrapper = mountLibrary()
    await wrapper.findAll('.element-item')[0]!.trigger('dblclick')
    expect(wrapper.emitted('element-double-click')).toHaveLength(1)
    expect(menu()).toBeNull()
  })
})
