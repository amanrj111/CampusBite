import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../store.jsx";
import LoginPage from "../components/auth/LoginPage.jsx";

export default function Auth() {
  const { login, register, loginWithGoogle, user } = useApp();
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

  const googleButtonRef = useRef(null);
  const googleLoginInProgress = useRef(false);
  const googleInitialized = useRef(false);
  const googleCallbackRef = useRef(null);

  function getDestination(account) {
    if (account.role === "ADMIN") return "/admin";
    if (account.role === "KITCHEN") return "/kitchen";
    return "/";
  }

  function getRequestedDestination(account) {
    const requestedPath = location.state?.from;

    if (
      account.role === "USER" &&
      requestedPath?.pathname?.startsWith("/") &&
      !requestedPath.pathname.startsWith("//") &&
      requestedPath.pathname !== "/login"
    ) {
      return requestedPath.pathname;
    }

    return getDestination(account);
  }

  googleCallbackRef.current = async (response) => {
    if (googleLoginInProgress.current || !response?.credential) {
      return;
    }

    googleLoginInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      const account = await loginWithGoogle(response.credential);

      navigate(getRequestedDestination(account), {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Google Sign-In failed. Please try again.");
    } finally {
      googleLoginInProgress.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "login") return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log("Google Client ID loaded:", clientId);
    console.log("Current website origin:", window.location.origin);

    if (!clientId) {
      setError("Google Sign-In is not configured.");
      return;
    }

    let cancelled = false;
    let script = null;

    function initializeGoogle() {
      if (cancelled || !googleButtonRef.current) return;

      const google = window.google?.accounts?.id;
      if (!google) return;

      if (!googleInitialized.current) {
        google.initialize({
          client_id: clientId,
          callback: (response) => {
            googleCallbackRef.current?.(response);
          },
        });

        googleInitialized.current = true;
      }

      googleButtonRef.current.innerHTML = "";

      google.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 280,
      });
    }

    function handleScriptLoad() {
      initializeGoogle();
    }

    function handleScriptError() {
      if (!cancelled) {
        setError(
          "Unable to load Google Sign-In. Please check your connection and try again.",
        );
      }
    }

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.addEventListener("load", handleScriptLoad);
        script.addEventListener("error", handleScriptError);
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", handleScriptLoad);
        script.addEventListener("error", handleScriptError);

        // Handle the case where the script loaded before this effect.
        if (window.google?.accounts?.id) {
          initializeGoogle();
        }
      }
    }

    return () => {
      cancelled = true;

      if (script) {
        script.removeEventListener("load", handleScriptLoad);
        script.removeEventListener("error", handleScriptError);
      }
    };
  }, [mode]);

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

      navigate(getRequestedDestination(account), {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginPage
      mode={mode}
      form={form}
      updateField={updateField}
      submit={submit}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      loading={loading}
      error={error}
      switchMode={switchMode}
      googleButtonRef={googleButtonRef}
    />
  );
}
