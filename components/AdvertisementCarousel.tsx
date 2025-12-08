"use client"

import { useState, useEffect, useRef } from "react"
import type { Advertisement } from "@/lib/types"

interface AdvertisementCarouselProps {
  advertisements: Advertisement[]
  isLoading?: boolean
}

export function AdvertisementCarousel({ advertisements, isLoading }: AdvertisementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<number | null>(null)

  // Auto-slide functionality
  useEffect(() => {
    if (advertisements.length <= 1) return

    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setCurrentIndex((prevIndex) =>
            prevIndex === advertisements.length - 1 ? 0 : prevIndex + 1
          )
        }
      }, 4000) // Change slide every 4 seconds
    }

    if (!isPaused) {
      startInterval()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [advertisements.length, isPaused])

  // Touch handlers
  const handleTouchStart = () => {
    setIsPaused(true)
    touchStartRef.current = Date.now()
  }

  const handleTouchEnd = () => {
    // Small delay to prevent immediate resume
    setTimeout(() => {
      setIsPaused(false)
    }, 500)
  }


  if (isLoading) {
    return (
      <div className="relative w-full h-48 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-accent to-primary">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-white border-r-transparent"></div>
      </div>
    )
  }

  if (!advertisements || advertisements.length === 0) {
    return (
      <div className="relative w-full h-48 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-accent to-primary">
        <p className="text-white font-bold text-lg">Advertisement</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-primary via-accent to-primary">
      {/* Slides */}
      <div
        className="relative w-full h-full flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {advertisements.map((ad, index) => (
          <div
            key={ad.id}
            className="relative w-full h-full flex-shrink-0"
          >
            <img
              src={ad.image}
              alt={`Advertisement ${index + 1}`}
              className="w-full h-full object-cover object-center"
              loading={index === 0 ? "eager" : "lazy"}
            />
            {/* Overlay gradient for better text contrast if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        ))}
      </div>


      {/* Pause indicator */}
      {isPaused && advertisements.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs text-white font-medium">En pause</span>
          </div>
        </div>
      )}
    </div>
  )
}
