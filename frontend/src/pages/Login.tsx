import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/generate";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="auth-page">
        <div className="container auth-page__inner">
          <div className="eyebrow">Welcome back</div>
          <h1>Log in</h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__field">
              Username or email
              <input
                className="auth-form__input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="auth-form__field">
              Password
              <input
                className="auth-form__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="auth-form__error">{error}</p>}

            <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="auth-page__switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </main>
    </>
  );
}
