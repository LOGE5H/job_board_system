import { Link } from 'react-router-dom';
import { Briefcase, Search, Building2, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

export default function Login() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-3xl w-full">
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center justify-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-primary-500 to-purple-600 p-4 rounded-2xl">
                <Briefcase className="h-10 w-10 text-white" />
              </div>
            </div>
          </Link>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            Welcome Back! <span className="wave">👋</span>
          </h2>
          <p className="mt-3 text-gray-600 text-lg">Choose how you want to sign in</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Candidate Login Card */}
          <Link
            to="/login/candidate"
            className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-transparent hover:border-emerald-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Search className="h-10 w-10 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">I'm a Candidate</h3>
              <p className="text-gray-500 mb-6">Looking for amazing opportunities</p>
              
              <ul className="text-left space-y-3 mb-8">
                {['Search and apply for jobs', 'Track your applications', 'Get personalized recommendations'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-600">
                    <div className="p-1 bg-emerald-100 rounded-full mr-3">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              
              <div className="inline-flex items-center justify-center w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl group-hover:from-emerald-600 group-hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25">
                Continue as Candidate
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Employer Login Card */}
          <Link
            to="/login/employer"
            className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-transparent hover:border-primary-300 shadow-xl hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-primary-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">I'm an Employer</h3>
              <p className="text-gray-500 mb-6">Looking to hire top talent</p>
              
              <ul className="text-left space-y-3 mb-8">
                {['Post job openings', 'Review applications', 'Hire the best candidates'].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-600">
                    <div className="p-1 bg-primary-100 rounded-full mr-3">
                      <CheckCircle className="w-4 h-4 text-primary-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              
              <div className="inline-flex items-center justify-center w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold rounded-xl group-hover:from-primary-600 group-hover:to-purple-700 transition-all shadow-lg shadow-primary-500/25">
                Continue as Employer
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register/candidate" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
              Sign up as Candidate
            </Link>
            {' '}or{' '}
            <Link to="/register/employer" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline">
              Sign up as Employer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
