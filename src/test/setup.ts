import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createApp } from 'vue'

// Mock i18n translation function
const mockT = (key: string) => {
  // Simple key-value mapping
  const translations: Record<string, string> = {
    'app.title': 'PDF Template Designer',
    'actions.undo': 'Undo',
    'actions.redo': 'Redo',
    'actions.hideLeftPanel': 'Hide Left Panel',
    'actions.showLeftPanel': 'Show Left Panel',
    'actions.hideRightPanel': 'Hide Right Panel',
    'actions.showRightPanel': 'Show Right Panel',
    'actions.hideBottomPanel': 'Hide Bottom Panel',
    'actions.showBottomPanel': 'Show Bottom Panel',
    'actions.snapToGrid': 'Snap to Grid',
    'actions.snapToAlignment': 'Snap to Alignment',
    'actions.previewPDF': 'Preview PDF',
    'actions.generateJRXML': 'Generate JRXML',
    'actions.donate': 'Donate',
    'actions.help': 'Help',
    'properties.defaultStaticText': 'Static Text',
    'properties.defaultTextFieldExpression': 'Text Field',
    'elementNames.staticText': 'Static Text',
    'elementNames.textField': 'Text Field',
    'elementNames.image': 'Image',
    'elementNames.line': 'Line',
    'elementNames.rectangle': 'Rectangle',
    'elementNames.ellipse': 'Ellipse',
    'elementNames.break': 'Page Break',
    'elementNames.frame': 'Frame'
  }
  return translations[key] || key
}

// Mock the vue-i18n module
vi.mock('vue-i18n', () => {
  // Create a simple mock i18n instance
  const mockI18nInstance = {
    global: {
      locale: {
        value: 'zh-CN'
      },
      messages: {
        'zh-CN': {
          app: {
            title: 'PDF Template Designer'
          }
        }
      }
    }
  }

  return {
    createI18n: () => mockI18nInstance,
    useI18n: () => ({
      t: mockT,
      locale: 'zh-CN',
      availableLocales: ['zh-CN', 'en']
    })
  }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)