import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppHeader({ variant = "default" }: { variant?: "default" | "preview" }) {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__mark" aria-hidden="true" />
          Forge
        </Link>

        <div className="app-header__right">
          {variant === "default" && (
            <Link to="/" className="app-header__back">
              ← Back to home
            </Link>
          )}
          {variant === "preview" && (
            <span className="app-header__badge">Live preview</span>
          )}

          {!isLoading && (
            user ? (
              <button className="btn btn--ghost btn--sm" onClick={() => void logout()}>
                Log out
              </button>
            ) : (
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
