export class MobileBackButtonHandler {
  private static instance: MobileBackButtonHandler
  private isInitialized = false
  private backButtonCallback?: () => void
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = []

  private constructor() {}

  static getInstance(): MobileBackButtonHandler {
    if (!MobileBackButtonHandler.instance) {
      MobileBackButtonHandler.instance = new MobileBackButtonHandler()
    }
    return MobileBackButtonHandler.instance
  }

  initialize(callback: () => void) {
    if (this.isInitialized) return
    this.backButtonCallback = callback

    const handleBackButton = () => {
      if (this.backButtonCallback) {
        this.backButtonCallback()
      }
    }

    const events = [
      { element: document, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); handleBackButton() } },
      { element: window, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); handleBackButton() } },
      { element: window, event: 'popstate', handler: (e: Event) => { e.preventDefault(); handleBackButton() } },
      { element: window, event: 'mobileBackButton', handler: handleBackButton }
    ]

    events.forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler, false)
      this.eventListeners.push({ element, event, handler })
    })

    this.isInitialized = true
  }

  setCallback(callback: () => void) {
    this.backButtonCallback = callback
  }

  cleanup() {
    if (this.isInitialized) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler)
      })
      this.eventListeners = []
      this.isInitialized = false
    }
  }
}

export const mobileBackButtonHandler = MobileBackButtonHandler.getInstance()

