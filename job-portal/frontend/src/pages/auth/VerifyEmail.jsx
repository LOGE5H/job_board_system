import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      await authAPI.verifyEmail(token);
      setStatus('success');
      toast.success('Email verified successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      toast.error(error.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' && (
          <div className="card">
            <Loader className="h-16 w-16 text-primary-600 mx-auto animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mt-6">Verifying your email...</h2>
            <p className="text-gray-600 mt-2">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="card">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900 mt-6">Email Verified!</h2>
            <p className="text-gray-600 mt-2">
              Your email has been verified successfully. You will be redirected to login shortly.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-block">
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="card">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900 mt-6">Verification Failed</h2>
            <p className="text-gray-600 mt-2">
              The verification link is invalid or has expired. Please try registering again.
            </p>
            <div className="mt-6 space-x-4">
              <Link to="/register/candidate" className="btn-primary inline-block">
                Register as Candidate
              </Link>
              <Link to="/register/employer" className="btn-outline inline-block">
                Register as Employer
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
