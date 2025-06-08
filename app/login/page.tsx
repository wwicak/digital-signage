'use client'

import { useState, Suspense, memo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import Frame from '../../components/Admin/Frame'
import { login } from '../../helpers/auth'
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

const LoginContent = memo(function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const displayId = searchParams?.get('display')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [alert, setAlert] = useState<'success' | 'error' | 'info' | null>(null)

  const performLogin = async () => {
    try {
      const resp = await login({ email, password }, undefined, displayId || undefined)
      if (!resp.success) {
        setAlert('error')
      } else {
        setAlert('success')
        // Redirect on success
        if (displayId) {
          router.push(`/display/${displayId}`)
        } else {
          router.push('/layout')
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

  return (
    <Frame loggedIn={false}>
      <h1>Login</h1>
      <div className='formContainer'>
        <div className='logo'>
          <div className='icon'>
            <LucideIcon icon={Tv size='lg' color='#7bc043' />
          </div>
        </div>
        <form className='form' onSubmit={handleSubmit}>
          {alert && (
            <div className={`alert-${alert}`}>
              <LucideIcon
                icon={alert === 'success' ? faCheck : faTimes}
                fixedWidth
                size='sm'
                color='white'
              />
              <span className={'alert-text'}>
                {alert === 'success'
                  ? 'Successfully logged in to your account.'
                  : alert === 'error'
                  ? 'Username or password not recognized.'
                  : 'Use the username "demo" and password "demo"'}
              </span>
            </div>
          )}
          {!alert && (
             <div className={'alert-info'}>
                <span className={'alert-text'}>
                Use the username &quot;demo&quot; and password &quot;demo&quot;
                </span>
            </div>
          )}
          <label htmlFor='email'>Email</label>
          <input
            type='email'
            className='email'
            id='email'
            placeholder='Enter your email...'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor='password'>Password</label>
          <input
            type='password'
            className='password'
            id='password'
            placeholder='Enter your password...'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type='submit'>Log In.</button>
        </form>
        <Link href='/'>
          <span className='back'>
            <LucideIcon icon={faAngleLeft /> Back to the home page
          </span>
        </Link>
      </div>
      <style jsx>
        {`
          h1 {
            font-family: 'Open Sans', sans-serif;
            font-size: 24px;
            color: #4f4f4f;
            margin: 0px;
          }
          .logo {
            display: flex;
            flex-direction: row;
            margin-top: 20px;
            margin-bottom: 20px;
            padding-right: 10px;
            padding-left: 10px;
            align-self: center;
          }
          .logo .icon {
            min-width: 3em;
            min-height: 3em;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            transform: scale(2);
          }
          .form {
            background: white;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            padding: 24px;
            font-family: 'Open Sans', sans-serif;
          }
          .formContainer {
            max-width: 640px;
            margin: auto;
            display: flex;
            flex-direction: column;
          }
          .form input[type='email'],
          .form input[type='password'] {
            outline: none;
            background: #ededed;
            border-radius: 8px;
            font-family: 'Open Sans', sans-serif;
            font-weight: 400;
            font-size: 16px;
            color: #928f8f;
            border: none;
            padding: 8px;
            height: 32px;
            min-width: 256px;
            vertical-align: middle;
            -webkit-appearance: none;
            margin-bottom: 16px;
          }
          .form button {
            outline: none;
            background: #7bc043;
            border-radius: 8px;
            font-family: 'Open Sans', sans-serif;
            font-weight: 600;
            font-size: 18px;
            color: #ffffff;
            text-align: center;
            border: none;
            padding: 4px;
            height: 48px;
            vertical-align: middle;
            padding-left: 16px;
            padding-right: 16px;
            -webkit-appearance: none;
          }
          .form label {
            padding-bottom: 16px;
          }
          .back {
            display: inline-block;
            margin: 16px;
            font-family: 'Open Sans', sans-serif;
            color: #6f6e6e;
            font-size: 14px;
            cursor: pointer;
          }
          .alert-error {
            background: #e74c3c;
            border-radius: 6px;
            margin-bottom: 16px;
            padding: 16px;
          }
          .alert-info {
            background: #3ca9e7;
            border-radius: 6px;
            margin-bottom: 16px;
            padding: 16px;
          }
          .alert-success {
            background: #7bc043;
            border-radius: 6px;
            margin-bottom: 16px;
            padding: 16px;
          }
          .alert-text {
            color: white;
            margin-left: 8px;
          }
        `}
      </style>
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