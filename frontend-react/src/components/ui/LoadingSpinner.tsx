interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'sm'
}

export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    sm: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  }
  
  return (
    <div className={`inline-flex items-center justify-center ${sizeClasses[size]}`}>
      <div className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
    </div>
  )
}
