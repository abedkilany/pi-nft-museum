"use client";

import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // @ts-ignore
      const scopes = ["username", "payments"];

      // @ts-ignore
      const auth = await window.Pi.authenticate(scopes);

      if (!auth?.accessToken) {
        alert("Login failed");
        return;
      }

      // أرسل التوكن للسيرفر
      await fetch("/api/auth/pi/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: auth.accessToken,
        }),
      });

      // خزّن accessToken فقط
      sessionStorage.setItem("pi_token", auth.accessToken);

      // اذهب للوحة التحكم
      window.location.href = "/admin";

    } catch (err) {
      console.error(err);
      alert("Error during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login with Pi</h1>

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Loading..." : "Login"}
      </button>
    </div>
  );
}