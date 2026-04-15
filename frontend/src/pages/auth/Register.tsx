import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phoneNumber: '',
    gstNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        phoneNumber: formData.phoneNumber,
        gstNumber: formData.gstNumber || undefined
      });
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to register account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md bg-background border rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl">✓</div>
          <h1 className="text-2xl font-bold text-primary">Registration Pending</h1>
          <p className="text-muted-foreground mt-4">
            Thank you for registering your business <strong>{formData.businessName}</strong>. 
            Your account is current pending Admin approval. 
          </p>
          <p className="text-muted-foreground mt-2">
            You will receive an email once you are approved to generate API keys.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-6 w-full py-2 bg-muted text-foreground font-medium rounded-md hover:bg-muted/80 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
      <div className="w-full max-w-md bg-background border rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Villages API for B2B</h1>
          <p className="text-muted-foreground mt-2">Create a business account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-md p-3 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Business Name *</label>
            <input 
              type="text" 
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="E.g. Acme Corp"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Corporate Email *</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="alex@acmecorp.com"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number *</label>
              <input 
                type="tel" 
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="+91 99999..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GST Number</label>
              <input 
                type="text" 
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="(Optional)"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Minimum 8 chars"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Submitting...' : 'Register Business'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
