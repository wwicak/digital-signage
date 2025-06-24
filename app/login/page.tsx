'use client'

import { useState, useEffect, Suspense, memo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import Frame from '../../components/Admin/Frame'
import { login, checkAuthStatus } from '../../helpers/auth'
import { Tv, Check, X, ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

const LoginContent = memo(function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const displayId = searchParams?.get('display')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState<'success' | 'error' | 'info' | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false)

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await checkAuthStatus()
        if (authStatus.isAuthenticated) {
          setIsAlreadyLoggedIn(true)

          // Determine redirect URL
          const redirectUrl = searchParams?.get('redirect')
          let targetUrl = '/dashboard' // Default redirect

          if (redirectUrl) {
            targetUrl = redirectUrl
          } else if (displayId) {
            targetUrl = `/display/${displayId}`
          }

          // Show a brief message before redirecting
          setAlert('info')
          setTimeout(() => {
            router.push(targetUrl)
          }, 1500)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // If auth check fails, just proceed to show login form
        // This handles network errors gracefully
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router, searchParams, displayId])

  const performLogin = async () => {
    try {
      const resp = await login({ email, password }, undefined, displayId || undefined)
      if (!resp.success) {
        setAlert('error')
      } else {
        setAlert('success')
        // Redirect on success
        const redirectUrl = searchParams?.get('redirect')
        if (redirectUrl) {
          router.push(redirectUrl)
        } else if (displayId) {
          router.push(`/display/${displayId}`)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setAlert('error')
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    performLogin()
  }

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <Frame loggedIn={false}>
        <div className='max-w-2xl m-auto flex flex-col items-center justify-center min-h-[400px]'>
          <div className='flex flex-col items-center'>
            <Loader2 className='w-8 h-8 text-primary animate-spin mb-4' />
            <h2 className='text-xl font-semibold text-gray-700 mb-2'>Checking authentication...</h2>
            <p className='text-gray-500 text-center'>Please wait while we verify your login status.</p>
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame loggedIn={false}>
      <h1 className='font-sans text-2xl text-gray-600 m-0'>Login</h1>
      <div className='max-w-2xl m-auto flex flex-col'>
        <div className='flex flex-row mt-5 mb-5 pr-2.5 pl-2.5 self-center'>
          <div className='min-w-12 min-h-12 p-5 flex justify-center items-center scale-200'>
            <Tv className='w-8 h-8 text-primary' />
          </div>
        </div>
        <form className='bg-white rounded-lg flex flex-col p-6 font-sans' onSubmit={handleSubmit}>
          {alert && (
            <div className={`${alert === 'error' ? 'bg-red-500' : alert === 'success' ? 'bg-primary' : 'bg-blue-500'} rounded-md mb-4 p-4 flex items-center`}>
              {alert === 'success' || (alert === 'info' && isAlreadyLoggedIn) ? (
                <Check className='w-4 h-4 text-white mr-2' />
              ) : (
                <X className='w-4 h-4 text-white mr-2' />
              )}
              <span className='text-white'>
                {alert === 'success'
                  ? 'Successfully logged in to your account.'
                  : alert === 'error'
                    ? 'Username or password not recognized.'
                    : alert === 'info' && isAlreadyLoggedIn
                      ? 'You are already logged in. Redirecting to admin panel...'
                      : 'Use the username "demo" and password "demo"'}
              </span>
            </div>
          )}
          {/* {!alert && (
             <div className="bg-blue-500 rounded-md mb-4 p-4">
                <span className="text-white">
                Use the username &quot;demo&quot; and password &quot;demo&quot;
                </span>
            </div>
          )} */}
          <label htmlFor='email' className='pb-4 font-sans'>Email</label>
          <input
            type='email'
            className='outline-none bg-gray-200 rounded-lg font-sans font-normal text-base text-gray-500 border-0 p-2 h-10 min-w-64 align-middle appearance-none mb-4'
            id='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor='password' className='pb-4 font-sans'>Password</label>
          <div className='relative mb-4'>
            <input
              type={showPassword ? 'text' : 'password'}
              className='outline-none bg-gray-200 rounded-lg font-sans font-normal text-base text-gray-500 border-0 p-2 pr-10 h-10 min-w-64 align-middle appearance-none w-full'
              id='password'
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type='button'
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className='w-4 h-4' />
              ) : (
                <Eye className='w-4 h-4' />
              )}
            </button>
          </div>
          <button type='submit' className='outline-none bg-primary rounded-lg font-sans font-semibold text-lg text-white text-center border-0 p-1 h-12 align-middle pl-4 pr-4 w-1/3 mx-auto appearance-none hover:bg-green-600 transition-colors'>Log In.</button>
        </form>
        <Link href='/'>
          <span className='inline-block m-4 font-sans text-gray-500 text-sm cursor-pointer'>
            <ChevronLeft className='w-4 h-4 inline mr-1' /> Back to the home page
          </span>
        </Link>
      </div>

    </Frame>
  )
})

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}