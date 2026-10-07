import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(username, email, password);
      navigate("/generate", { replace: true });
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
          <div className="eyebrow">Get started</div>
          <h1>Create your account</h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-form__field">
              Username
              <input
                className="auth-form__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                maxLength={30}
                required
              />
            </label>
            <label className="auth-form__field">
              Email
              <input
                className="auth-form__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            {error && <p className="auth-form__error">{error}</p>}

            <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="auth-page__switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
