import { useCallback, useEffect, useState } from "react";
import PrimaryLogo from "../components/logo/PrimaryLogo";
import { UserAuth } from "../components/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Loading from "../components/generic/icons/Loading";
import NotificationAlert from "../components/NotificationAlert";
import { Eye, EyeOff } from "lucide-react";

type LoginForm = {
  email: string;
  password: string;
  rememberMe: boolean;
  error: string;
};

const Login: React.FC = () => {
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
    error: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { session, signIn } = UserAuth();

  const handleSignIn = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { email, password } = loginForm;
      setLoading(true);

      const result = await signIn(email, password);

      if (result.success) {
        navigate("/summary", { replace: true });
      } else {
        setLoginForm({
          ...loginForm,
          error: result.error as string,
        });
      }

      setLoading(false);
    },
    [loginForm, navigate, signIn],
  );

  useEffect(() => {
    if (session) {
      navigate("/summary", { replace: true });
    }
  }, [navigate, session]);

  const handleDismissNotification = useCallback(() => {
    setLoginForm({
      ...loginForm,
      error: "",
    });
  }, [loginForm]);

  return (
    <section className="bg-gray-100 dark:bg-[#222222]">
      <div className="mx-auto flex min-h-screen min-h-[100dvh] flex-col items-center justify-center px-6 py-8 lg:py-0">
        <a
          href="#"
          className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white"
        >
          <PrimaryLogo />
        </a>
        <span className="text-yellow-600 text-3xl mb-4 font-bold">
          Admin Portal
        </span>
        <div className="w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0 bg-white dark:bg-black border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Sign in to your account
            </h1>
            {loginForm.error !== "" && (
              <NotificationAlert
                type="error"
                message={loginForm.error}
                toggleDismiss={handleDismissNotification}
              />
            )}
            <form className="space-y-4 md:space-y-6" onSubmit={handleSignIn}>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Your email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="bg-gray-50 dark:bg-[#222222] border border-gray-300 text-gray-900 dark:text-white rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  placeholder="name@company.com"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  value={loginForm.email}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    placeholder="••••••••"
                    className="bg-gray-50 dark:bg-[#222222] border border-gray-300 text-gray-900 dark:text-white rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 pr-10"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    value={loginForm.password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {/* <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      aria-describedby="remember"
                      type="checkbox"
                      className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="text-gray-500 dark:text-gray-300">
                      Remember me
                    </label>
                  </div>
                </div> */}
                {/* <a
                  href="#"
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Forgot password?
                </a> */}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-black bg-yellow-600 hover:bg-yellow-700 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:focus:ring-yellow-800"
              >
                {loading ? (
                  <div className="flex justify-center">
                    <Loading />
                  </div>
                ) : (
                  `Sign in`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
