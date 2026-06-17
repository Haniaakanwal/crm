import { useState } from 'react';
import '../styles/Login-SignupCard.css';
import { Link, useNavigate } from 'react-router';
import { LuCrown } from "react-icons/lu";
import { CiLock } from "react-icons/ci";
import { IoPerson } from "react-icons/io5";
import { FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import Nav from './Nav';
import Hero from './Hero';

// ✅ IMPORT API
import { loginFileMaker } from '../../services/fileMakerService';

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;

    setFields(prev => ({ ...prev, [id]: value }));
    setErrors(prev => ({ ...prev, [id]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e = {};

    if (!fields.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(fields.email))
      e.email = 'Enter a valid email';

    if (!fields.password) e.password = 'Password is required';

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // 🔐 FILEMAKER LOGIN CALL
      const { token, result } = await loginFileMaker({
        action: 'login',
        email: fields.email.trim(),
        password: fields.password,
        role,
      });

      // ❌ handle backend errors
      if (result?.status === 'ko' || result?.Error) {
        setApiError(result?.message || 'Login failed');
        return;
      }

      // 💾 STORE TOKEN
      localStorage.setItem('fm_token', token);

      // 💾 STORE USER
      localStorage.setItem(
        'ams_current_user',
        JSON.stringify({
          id: result?.id,
          email: result?.email,
          username: result?.username,
          role: result?.role || role,
          initials:
            result?.username?.slice(0, 2).toUpperCase() || 'U',
        })
      );

      // 🚀 NAVIGATE
      if (role === 'employee') {
        navigate('/employeView/home');
      } else {
        navigate('/adminView/home');
      }

    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <Nav />

      <div className='login-SignUp'>
        <Hero />

        <div className="login-card">
          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle">Sign in to your agency account</p>

          {apiError && (
            <div className="error-banner" role="alert">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ROLE */}
            <div className="field-group">
              <span className="field-label">Sign in as</span>

              <div className="role-options">
                <button
                  type="button"
                  className={`role-card ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => setRole('admin')}
                >
                  <span className="role-icon"><LuCrown /></span>
                  <span className="role-name">Admin</span>
                </button>

                <button
                  type="button"
                  className={`role-card ${role === 'employee' ? 'active' : ''}`}
                  onClick={() => setRole('employee')}
                >
                  <span className="role-icon"><IoPerson /></span>
                  <span className="role-name">Employee</span>
                </button>
              </div>
            </div>

            {/* EMAIL */}
            <div className="field-group">
              <label className="field-label" htmlFor="email">
                Email
              </label>

              <div className={`input-wrapper ${errors.email ? 'input-error' : ''}`}>
                <span className="input-icon"><IoPerson /></span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={fields.email}
                  onChange={handleChange}
                />
              </div>

              {errors.email && (
                <p className="field-error">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="field-group">
              <label className="field-label" htmlFor="password">
                Password
              </label>

              <div className={`input-wrapper ${errors.password ? 'input-error' : ''}`}>
                <span className="input-icon"><CiLock /></span>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={fields.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="input-trailing"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>

              {errors.password && (
                <p className="field-error">{errors.password}</p>
              )}
            </div>

            {/* OPTIONS */}
            <div className="field-row">
              <label className="checkbox-label">
                <input type="checkbox" /> Remember me
              </label>

              <a href="#" className="link-accent">
                Forgot password?
              </a>
            </div>

            {/* SUBMIT */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In <FaArrowRight className="arrowbtn" />
                </>
              )}
            </button>
          </form>

          <p className="toggle-mode">
            Don't have an account?{' '}
            <Link to="/register" className="toggle-link">
              Create one
            </Link>
          </p>

          <div className="login-footer">
            <p>Secured via FileMaker authentication</p>
            <p className="login-footer-strong">
              Agency Management System · v1.0 · Confidential
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;