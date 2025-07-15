import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Axios 인터셉터 설정
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })
      
      const { access_token, user: userData } = response.data
      
      localStorage.setItem('token', access_token)
      setToken(access_token)
      setUser(userData)
      
      toast.success('로그인 성공!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || '로그인에 실패했습니다.')
      return false
    }
  }

  const register = async (username, password) => {
    try {
      console.log('Sending registration data:', { username, password })
      const response = await axios.post('/api/auth/register', {
        username,
        password
      })
      
      console.log('Registration response:', response.data)
      toast.success('회원가입 성공! 로그인해주세요.')
      return true
    } catch (error) {
      console.error('Registration error:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error.response?.data?.detail || '회원가입에 실패했습니다.')
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    toast.success('로그아웃되었습니다.')
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  useEffect(() => {
    // 토큰이 있으면 사용자 정보 확인
    if (token) {
      // 토큰이 있으면 사용자 정보 복원 시도
      (async () => {
        try {
          const response = await axios.get('/api/auth/me')
          setUser(response.data)
        } catch (e) {
          console.error('Token validation failed:', e)
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
        } finally {
          setLoading(false)
        }
      })()
    } else {
      setLoading(false)
    }
  }, [token])

  // 토큰 만료 시 자동 갱신 시도
  useEffect(() => {
    if (!token || !user) return

    const checkTokenExpiry = async () => {
      try {
        await axios.get('/api/auth/me')
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('Token expired, attempting to refresh...')
          // 토큰이 만료되면 사용자 정보를 다시 가져오기 시도
          try {
            const response = await axios.get('/api/auth/me')
            setUser(response.data)
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            logout()
          }
        }
      }
    }

    // 5분마다 토큰 유효성 확인
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token, user])

  // 사용자 정보 업데이트 이벤트 리스너
  useEffect(() => {
    const handleUserUpdate = (event) => {
      console.log('사용자 정보 업데이트 이벤트 수신:', event.detail)
      setUser(event.detail)
    }

    window.addEventListener('userUpdated', handleUserUpdate)
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate)
    }
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 