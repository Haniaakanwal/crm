import { useState } from 'react';
import '../styles/Login-SignupCard.css';
import Nav from './Nav';
import Hero from './Hero';
import { Link, useNavigate } from 'react-router';
import { LuCrown } from "react-icons/lu";
import { CiLock } from "react-icons/ci";
import { IoPerson } from "react-icons/io5";
import { FaEye, FaEyeSlash, FaArrowRight, FaRegCalendarAlt } from "react-icons/fa";
import { registerWithEnquiry } from '../../services/fileMakerService';


function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

const [fields, setFields] = useState({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNo: '',
  description: '',
  date: new Date().toLocaleDateString('en-CA'),
});

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFields(prev => ({ ...prev, [id]: value }));
    setErrors(prev => ({ ...prev, [id]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e = {};
    if (!fields.username.trim())          e.username = 'Username is required';
    else if (fields.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    else if (/\s/.test(fields.username))  e.username = 'Username cannot contain spaces';
    if (!fields.email.trim())             e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = 'Enter a valid email';
    if (!fields.password)                 e.password = 'Password is required';
    else if (fields.password.length < 6)  e.password = 'At least 6 characters';
    if (!fields.confirmPassword)          e.confirmPassword = 'Please confirm your password';
    else if (fields.password !== fields.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!fields.phoneNo.trim()) e.phoneNo = 'Phone number is required';
    if (!fields.date) e.date = 'Date is required';
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
    const { recordId } = await registerWithEnquiry({
      username: fields.username.trim(),
      password: fields.password,
      phoneNo: fields.phoneNo.trim(),
      email: fields.email.trim().toLowerCase(),
      description: fields.description.trim(),
      date: fields.date,
    });

    if (!recordId) {
      setApiError('Could not create account record');
      return;
    }

    setSuccessMsg(`Account created for ${fields.username.trim()}`);
    setFields({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNo: '',
      description: '',
      date: new Date().toLocaleDateString('en-CA'),
    });
    setTimeout(() => navigate('/login'), 1500);
  } catch (err) {
    setApiError(err.message || 'Could not create account. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="register">
      <Nav />
      <div className='login-SignUp'>
        <Hero />
        <div className="login-card">
          <h2 className="login-title">Create your account</h2>
          <p className="login-subtitle">Set up access to your agency account</p>

          {apiError && <div className="error-banner" role="alert">{apiError}</div>}
          {successMsg && <div className="success-banner">{successMsg}</div>}

          <form onSubmit={handleSubmit} noValidate>

            {/* Role */}
            <div className="field-group">
              <span className="field-label">Create account as</span>
              <div className="role-options">
                <button type="button" className={`role-card ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => setRole('admin')}>
                  <span className="role-icon"><LuCrown /></span>
                  <span className="role-name">Admin</span>
                </button>
                <button type="button" className={`role-card ${role === 'employee' ? 'active' : ''}`}
                  onClick={() => setRole('employee')}>
                  <span className="role-icon"><IoPerson /></span>
                  <span className="role-name">Employee</span>
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="field-group">
              <label className="field-label" htmlFor="username">Username</label>
              <div className={`input-wrapper ${errors.username ? 'input-error' : ''}`}>
                <span className="input-icon"><IoPerson /></span>
                <input id="username" type="text" placeholder="Enter your Username"
                  value={fields.username} onChange={handleChange} />
              </div>
              {errors.username && <p className="field-error">{errors.username}</p>}
            </div>

            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="email">Email</label>
              <div className={`input-wrapper ${errors.email ? 'input-error' : ''}`}>
                <span className="input-icon"><IoPerson /></span>
                <input id="email" type="email" placeholder="Enter your Email Address"
                  value={fields.email} onChange={handleChange} />
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
{/* Phone Number */}
<div className="field-group">
  <label className="field-label" htmlFor="phoneNo">Phone Number</label>
  <div className={`input-wrapper ${errors.phoneNo ? 'input-error' : ''}`}>
    <span className="input-icon"><IoPerson /></span>
    <input id="phoneNo" type="tel" placeholder="Enter your phone number"
      value={fields.phoneNo} onChange={handleChange} />
  </div>
  {errors.phoneNo && <p className="field-error">{errors.phoneNo}</p>}
</div>

{/* Description (optional) */}
<div className="field-group">
  <label className="field-label" htmlFor="description">Description</label>
  <div className="input-wrapper">
    <span className="input-icon"><IoPerson /></span>
    <input id="description" type="text" placeholder="Brief description (optional)"
      value={fields.description} onChange={handleChange} />
  </div>
</div>

{/* Date */}
<div className="field-group">
  <label className="field-label" htmlFor="date">Date</label>
  <div className={`input-wrapper ${errors.date ? 'input-error' : ''}`}>
    <span className="input-icon"><FaRegCalendarAlt /></span>
    <input id="date" type="date"
      value={fields.date} onChange={handleChange} />
  </div>
  {errors.date && <p className="field-error">{errors.date}</p>}
</div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className={`input-wrapper ${errors.password ? 'input-error' : ''}`}>
                <span className="input-icon"><CiLock /></span>
                <input id="password" type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password" value={fields.password} onChange={handleChange} />
                <button type="button" className="input-trailing"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
              <div className={`input-wrapper ${errors.confirmPassword ? 'input-error' : ''}`}>
                <span className="input-icon"><CiLock /></span>
                <input id="confirmPassword" type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password" value={fields.confirmPassword} onChange={handleChange} />
              </div>
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating account…' : <>Create Account <FaArrowRight className="arrowbtn" /></>}
            </button>
          </form>

          <p className="toggle-mode">
            Already have an account?{' '}
            <Link to="/login" className="toggle-link">Sign in</Link>
          </p>

          <div className="login-footer">
            <p>Secured via FileMaker authentication</p>
            <p className="login-footer-strong">Agency Management System · v1.0 · Confidential</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;