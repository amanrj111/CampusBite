import React from "react";

export default function LoginPage({
  mode,
  form,
  updateField,
  submit,
  showPassword,
  setShowPassword,
  loading,
  error,
  switchMode,
  googleButtonRef,
}) {
  const isLogin = mode === "login";

  return (
    <main className="auth-page">
      <div className="auth-layout">
        {/* Left branding panel */}
        <section className="auth-visual">
          <div className="auth-brand">
            <span className="auth-brand-icon">🍽️</span>
            <span>CampusBite</span>
          </div>

          <div className="auth-visual-content">
            <span className="auth-eyebrow">YOUR CAMPUS. YOUR CRAVINGS.</span>

            <h1>
              Good food.
              <br />
              Great campus
              <br />
              <span>moments.</span>
            </h1>

            <p>
              Your favourite campus meals are just a few clicks away. Order
              fresh food, skip the queue, and enjoy your day.
            </p>

            <div className="auth-food-card">
              <div className="auth-food-emoji">🍛</div>
              <div>
                <strong>Cravings, sorted.</strong>
                <span>Good food, right on campus.</span>
              </div>
              <span className="auth-food-check">✓</span>
            </div>

            <div className="auth-benefits">
              <span>✓ Easy ordering</span>
              <span>✓ Live order updates</span>
              <span>✓ Campus convenience</span>
            </div>
          </div>

          <div className="auth-visual-footer">Made for campus life ❤️</div>
        </section>

        {/* Right authentication panel */}
        <section className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-mobile-brand">
              <span>🍽️</span> CampusBite
            </div>

            <div className="auth-form-heading">
              <span className="auth-welcome">
                {isLogin ? "WELCOME BACK" : "JOIN CAMPUSBITE"}
              </span>

              <h2>{isLogin ? "Welcome back!" : "Create your account"}</h2>

              <p>
                {isLogin
                  ? "Sign in to continue your food journey."
                  : "Create an account and make campus dining easier."}
              </p>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {!isLogin && (
                <div className="auth-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-field">
                <div className="auth-password-label">
                  <label htmlFor="auth-password">Password</label>
                </div>

                <div className="auth-password-wrap">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                  />

                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign in to your account"
                    : "Create my account"}

                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <div className="auth-google-wrap">
              <div ref={googleButtonRef} className="auth-google-button" />
            </div>

            <div className="auth-mode-switch">
              {isLogin ? "Don't have an account?" : "Already have an account?"}

              <button type="button" onClick={switchMode}>
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </div>

            <div className="auth-security-note">
              🔒 Your account details are kept secure.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
