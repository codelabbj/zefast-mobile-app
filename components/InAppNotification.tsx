"use client"

import { useState, useEffect } from "react"
import { X, Bell } from "lucide-react"

export interface NotificationData {
  id: string
  title: string
  body: string
  data?: any
  timestamp: number
}

interface InAppNotificationProps {
  notification: NotificationData | null
  onClose: () => void
  autoHideDelay?: number // in milliseconds
}

export function InAppNotification({ notification, onClose, autoHideDelay = 5000 }: InAppNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)

      // Auto-hide notification after delay
      const timer = setTimeout(() => {
        handleClose()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [notification, autoHideDelay])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Allow animation to complete
  }

  if (!notification) return null

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-sm w-full transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {notification.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {notification.body}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Progress bar for auto-hide */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-blue-500 transition-all duration-75 ease-linear"
            style={{
              width: isVisible ? '100%' : '0%',
              transitionDuration: `${autoHideDelay}ms`
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Notification Manager Hook
export function useInAppNotifications() {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null)
  const [notificationQueue, setNotificationQueue] = useState<NotificationData[]>([])

  const showNotification = (title: string, body: string, data?: any) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      title,
      body,
      data,
      timestamp: Date.now()
    }

    if (currentNotification) {
      // Queue the notification
      setNotificationQueue(prev => [...prev, notification])
    } else {
      setCurrentNotification(notification)
    }
  }

  const closeNotification = () => {
    setCurrentNotification(null)

    // Show next notification from queue
    setTimeout(() => {
      if (notificationQueue.length > 0) {
        const nextNotification = notificationQueue[0]
        setNotificationQueue(prev => prev.slice(1))
        setCurrentNotification(nextNotification)
      }
    }, 300)
  }

  return {
    currentNotification,
    showNotification,
    closeNotification,
    queueLength: notificationQueue.length
  }
}
