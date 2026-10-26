
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../store.jsx";

export default function Auth() {
  const { login, register, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  function getDestination(account) {
    if (account.role === "ADMIN") return "/admin";
    if (account.role === "KITCHEN") return "/kitchen";
    return "/";
  }

  if (user) {
    return <Navigate to={getDestination(user)} replace />;
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError("");
  }

  function switchMode() {
    setMode((previous) => (previous === "login" ? "register" : "login"));
    setError("");
    setShowPassword(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;

    setError("");

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (mode === "register" && !name) {
      setError("Please enter your name.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "register" && form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const account =
        mode === "login"
          ? await login(email, form.password)
          : await register(name, email, form.password);

      // Return to the protected page the user originally requested,
      // provided that it is an internal application path.
      const requestedPath = location.state?.from;
      const destination =
        account.role === "USER" &&
        requestedPath?.pathname?.startsWith("/") &&
        !requestedPath.pathname.startsWith("//") &&
        requestedPath.pathname !== "/login"
          ? requestedPath.pathname
          : getDestination(account);

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <form onSubmit={submit} noValidate>
        <h2>{mode === "login" ? "Welcome back 👋" : "Create your account"}</h2>

        <p className="tiny">
          {mode === "login"
            ? "Sign in to order your favourite campus meals."
            : "Join CampusBite and enjoy convenient campus dining."}
        </p>

        {mode === "register" && (
          <>
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              type="text"
              placeholder="Enter your name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
              maxLength={100}
              disabled={loading}
            />
          </>
        )}

        <label htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
          maxLength={254}
          disabled={loading}
        />

        <label htmlFor="auth-password">Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            placeholder={
              mode === "register"
                ? "At least 8 characters"
                : "Enter your password"
            }
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
            minLength={mode === "register" ? 8 : undefined}
            style={{ width: "100%", paddingRight: 85 }}
            disabled={loading}
          />

          <button
            type="button"
            className="ghost"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={loading}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              padding: "4px 8px",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "#dc2626",
              fontSize: 14,
              marginTop: 12,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 16,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <button
          type="button"
          className="ghost"
          disabled={loading}
          style={{ width: "100%", marginTop: 10 }}
          onClick={switchMode}
        >
          {mode === "login"
            ? "New to CampusBite? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
