import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { ShieldAlert, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await login(email, password);
      if (user.role === 'STUDENT') {
        navigate('/student');
      } else if (user.role === 'CAMPUS_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/responder');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Invalid credentials or account suspended. Please verify your details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--surface)',
          padding: '32px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--brand)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700, color: 'var(--text)' }}>
            Campus SOS Login
          </h1>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Authorized portal for students, safety personnel, and responders.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--emergency-soft)',
              color: 'var(--emergency)',
              padding: '12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--emergency-border)',
              fontSize: 'var(--text-body-sm)',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="email-input"
              style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}
            >
              Institutional Email
            </label>
            <input
              id="email-input"
              type="email"
              autoComplete="username"
              placeholder="e.g. user@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password-input"
              style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}
            >
              Password
            </label>
            <input
              id="password-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            style={{ marginTop: '8px' }}
          >
            Sign In
          </Button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
          Session integrity secured with cryptographic authentication and role validation.
        </div>
      </div>
    </div>
  );
};
