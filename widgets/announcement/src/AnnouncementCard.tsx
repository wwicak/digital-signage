import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Calendar, Clock, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface AnnouncementCardProps {
  title?: string
  content?: string
  date?: string
  time?: string
  priority?: "high" | "medium" | "low"
  category?: string
  type?: "alert" | "info" | "success" | "general"
}

export default function AnnouncementCard({
  title = "Important System Maintenance",
  content = "The network will be temporarily unavailable for scheduled maintenance. Please save your work and log off by 5:00 PM today. Expected downtime is 2 hours.",
  date = "Today, March 15",
  time = "5:00 PM - 7:00 PM",
  priority = "high",
  category = "IT Notice",
  type = "alert",
}: AnnouncementCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        const area = offsetWidth * offsetHeight
        
        if (area < 15000) setSize('xs')      // 1x1 or smaller
        else if (area < 30000) setSize('sm') // 1x2 or 2x1
        else if (area < 60000) setSize('md') // 2x2
        else if (area < 120000) setSize('lg') // 3x2 or 2x3
        else setSize('xl')                    // 3x3 or larger
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const getTypeIcon = () => {
    const iconSize = {
      xs: 'h-4 w-4',
      sm: 'h-5 w-5', 
      md: 'h-6 w-6',
      lg: 'h-7 w-7',
      xl: 'h-8 w-8'
    }[size]

    switch (type) {
      case "alert":
        return <AlertCircle className={iconSize} />
      case "info":
        return <Info className={iconSize} />
      case "success":
        return <CheckCircle className={iconSize} />
      default:
        return <Info className={iconSize} />
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case "alert":
        return "text-red-600 bg-red-50 border-red-200"
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "success":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getPriorityColor = () => {
    switch (priority) {
      case "high":
        return "bg-red-500 hover:bg-red-600"
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "low":
        return "bg-green-500 hover:bg-green-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getSizeStyles = () => {
    const styles = {
      xs: {
        iconPadding: 'p-1.5',
        badges: 'text-[10px] px-1.5 py-0.5',
        title: 'text-sm font-semibold',
        content: 'text-xs leading-snug',
        footer: 'text-[11px]',
        spacing: 'space-y-1',
        padding: 'pb-1.5',
        gap: 'gap-1.5'
      },
      sm: {
        iconPadding: 'p-2',
        badges: 'text-xs px-2 py-0.5',
        title: 'text-base font-bold',
        content: 'text-sm leading-normal',
        footer: 'text-xs',
        spacing: 'space-y-2',
        padding: 'pb-2',
        gap: 'gap-2'
      },
      md: {
        iconPadding: 'p-2.5',
        badges: 'text-sm px-2.5 py-1',
        title: 'text-lg font-bold',
        content: 'text-sm leading-relaxed',
        footer: 'text-sm',
        spacing: 'space-y-3',
        padding: 'pb-3',
        gap: 'gap-3'
      },
      lg: {
        iconPadding: 'p-3',
        badges: 'text-sm px-3 py-1.5',
        title: 'text-xl font-bold',
        content: 'text-base leading-relaxed',
        footer: 'text-base',
        spacing: 'space-y-4',
        padding: 'pb-4',
        gap: 'gap-4'
      },
      xl: {
        iconPadding: 'p-4',
        badges: 'text-base px-3 py-1.5',
        title: 'text-2xl font-bold',
        content: 'text-lg leading-relaxed',
        footer: 'text-lg',
        spacing: 'space-y-6',
        padding: 'pb-6',
        gap: 'gap-6'
      }
    }
    return styles[size]
  }

  const styles = getSizeStyles()

  return (
    <div className="w-full h-full" ref={containerRef}>
      <Card className={`border-2 ${getTypeColor()} shadow-lg h-full flex flex-col`}>
        <CardHeader className={styles.padding}>
          <div className={`flex items-start justify-between ${styles.gap}`}>
            <div className={`flex items-center ${styles.gap}`}>
              <div className={`${styles.iconPadding} rounded-full ${getTypeColor()}`}>
                {getTypeIcon()}
              </div>
              <div className={styles.spacing}>
                <div className={`flex items-center ${styles.gap} flex-wrap`}>
                  <Badge 
                    variant="secondary" 
                    className={`${styles.badges} font-medium !text-[inherit] !px-[inherit] !py-[inherit]`}
                    style={{ 
                      fontSize: styles.badges.includes('text-[10px]') ? '10px' : 
                               styles.badges.includes('text-xs') ? '12px' : 
                               styles.badges.includes('text-sm') ? '14px' : '16px',
                      padding: styles.badges.includes('px-1.5') ? '2px 6px' :
                              styles.badges.includes('px-2') ? '2px 8px' :
                              styles.badges.includes('px-2.5') ? '4px 10px' :
                              styles.badges.includes('px-3') ? '4px 12px' : '6px 12px'
                    }}
                  >
                    {category}
                  </Badge>
                  <Badge 
                    className={`text-white ${styles.badges} ${getPriorityColor()}`}
                    style={{ 
                      fontSize: styles.badges.includes('text-[10px]') ? '10px' : 
                               styles.badges.includes('text-xs') ? '12px' : 
                               styles.badges.includes('text-sm') ? '14px' : '16px',
                      padding: styles.badges.includes('px-1.5') ? '2px 6px' :
                              styles.badges.includes('px-2') ? '2px 8px' :
                              styles.badges.includes('px-2.5') ? '4px 10px' :
                              styles.badges.includes('px-3') ? '4px 12px' : '6px 12px'
                    }}
                  >
                    {priority.toUpperCase()}
                  </Badge>
                </div>
                <h1 className={`${styles.title} text-gray-900 leading-tight`}>
                  {title}
                </h1>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`${styles.spacing} flex-1 flex flex-col`}>
          <p className={`${styles.content} text-gray-700 flex-1`}>
            {content}
          </p>

          <div className={`flex flex-col sm:flex-row items-start sm:items-center ${styles.gap} pt-2 border-t border-gray-200`}>
            <div className={`flex items-center gap-1 ${styles.footer} text-gray-600`}>
              <Calendar className={`h-3 w-3 ${size === 'xl' ? 'h-4 w-4' : ''}`} />
              <span className="font-medium">{date}</span>
            </div>
            <div className={`flex items-center gap-1 ${styles.footer} text-gray-600`}>
              <Clock className={`h-3 w-3 ${size === 'xl' ? 'h-4 w-4' : ''}`} />
              <span className="font-medium">{time}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}